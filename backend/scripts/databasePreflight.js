import 'dotenv/config';
import { Client } from 'pg';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Read-only application backup. Use a matching pg_dump for a PostgreSQL archive
// as well; this snapshot includes all public table rows and schema metadata.
const named = prefix => process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length);
const variable = named('--env=') || (process.env.DIRECT_URL ? 'DIRECT_URL' : 'DATABASE_URL');
if (!/^[A-Z][A-Z0-9_]*$/.test(variable) || !process.env[variable]) throw new Error('Choose a configured database environment variable.');
const client = new Client({ connectionString: process.env[variable], connectionTimeoutMillis: 10000 });
const quote = value => '"' + value.replaceAll('"', '""') + '"';
try {
  await client.connect();
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const tables = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")).rows;
  const snapshot = { format: 'crm-public-snapshot-v1', createdAt: new Date().toISOString(),
    version: (await client.query('SHOW server_version')).rows[0].server_version, tables: {}, schema: {} };
  for (const { tablename } of tables) {
    snapshot.tables[tablename] = (await client.query(`SELECT to_jsonb(row) AS row FROM public.${quote(tablename)} row`)).rows.map(item => item.row);
  }
  const metadata = {
    columns: "SELECT * FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position",
    constraints: "SELECT c.conrelid::regclass::text AS table_name, c.conname, pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE n.nspname = 'public'",
    indexes: "SELECT * FROM pg_indexes WHERE schemaname = 'public'",
    triggers: "SELECT c.relname AS table_name, t.tgname, pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND NOT t.tgisinternal",
    policies: "SELECT * FROM pg_policies WHERE schemaname = 'public'",
    rowSecurity: "SELECT relname AS table_name, relrowsecurity, relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r'",
    grants: "SELECT * FROM information_schema.role_table_grants WHERE table_schema = 'public'",
    functions: "SELECT p.proname AS name, pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.prokind = 'f' AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')",
  };
  for (const [key, query] of Object.entries(metadata)) snapshot.schema[key] = (await client.query(query)).rows;
  await client.query('COMMIT');
  const directory = named('--out=') ? resolve(named('--out=')) : await mkdtemp(join(tmpdir(), 'crm-database-backup-'));
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const data = JSON.stringify(snapshot, null, 2);
  const path = join(directory, `public-${Date.now()}.json`);
  await writeFile(path, data, { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ path, format: snapshot.format, bytes: Buffer.byteLength(data),
    sha256: createHash('sha256').update(data).digest('hex'), databaseVersion: snapshot.version,
    counts: Object.fromEntries(Object.entries(snapshot.tables).map(([table, rows]) => [table, rows.length])),
  }, null, 2));
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('Database preflight failed:', error.message);
  process.exitCode = 1;
} finally { await client.end(); }

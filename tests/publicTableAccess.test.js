import { describe, expect, it } from 'vitest';
import { prisma } from '../backend/prisma.js';

describe('CRM table exposure', () => {
  it('keeps public-schema tables inaccessible to Data API roles', async () => {
    const tables = await prisma.$queryRaw`
      SELECT c.relname AS name,
        c.relrowsecurity AS "rlsEnabled",
        has_table_privilege('anon', c.oid, 'SELECT') AS "anonRead",
        has_table_privilege('anon', c.oid, 'INSERT') AS "anonInsert",
        has_table_privilege('anon', c.oid, 'UPDATE') AS "anonUpdate",
        has_table_privilege('anon', c.oid, 'DELETE') AS "anonDelete",
        has_table_privilege('authenticated', c.oid, 'SELECT') AS "authenticatedRead",
        has_table_privilege('authenticated', c.oid, 'INSERT') AS "authenticatedInsert",
        has_table_privilege('authenticated', c.oid, 'UPDATE') AS "authenticatedUpdate",
        has_table_privilege('authenticated', c.oid, 'DELETE') AS "authenticatedDelete",
        has_table_privilege('service_role', c.oid, 'SELECT') AS "serviceRead",
        has_table_privilege('service_role', c.oid, 'INSERT') AS "serviceInsert",
        has_table_privilege('service_role', c.oid, 'UPDATE') AS "serviceUpdate",
        has_table_privilege('service_role', c.oid, 'DELETE') AS "serviceDelete"
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname`;

    expect(tables.length).toBeGreaterThanOrEqual(21);
    for (const table of tables) {
      expect(table.rlsEnabled, `${table.name} has RLS enabled`).toBe(true);
      for (const [key, granted] of Object.entries(table)) {
        if (key !== 'name' && key !== 'rlsEnabled') {
          expect(granted, `${table.name} grants ${key}`).toBe(false);
        }
      }
    }

    const defaults = await prisma.$queryRaw`
      SELECT d.defaclacl::text AS grants
      FROM pg_default_acl d
      JOIN pg_namespace n ON n.oid = d.defaclnamespace
      JOIN pg_roles owner ON owner.oid = d.defaclrole
      WHERE n.nspname = 'public' AND owner.rolname = 'postgres'
        AND d.defaclobjtype = 'r'`;
    expect(defaults).toHaveLength(1);
    for (const role of ['anon=', 'authenticated=', 'service_role=']) {
      expect(defaults[0].grants).not.toContain(role);
    }

    // The Express API uses Prisma through the postgres role. It must still
    // serve CRM data after client-facing grants are removed.
    expect(await prisma.company.count()).toBeGreaterThanOrEqual(0);
  });

  it('pins CRM trigger functions to an empty search path', async () => {
    const functions = await prisma.$queryRaw`
      SELECT p.proname AS name, p.proconfig AS config, p.prosecdef AS "securityDefiner"
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
      ORDER BY p.proname`;
    expect(functions.length).toBeGreaterThanOrEqual(4);
    for (const item of functions) {
      expect(item.config, `${item.name} pins search_path`).toContain('search_path=""');
      expect(item.securityDefiner, `${item.name} runs as invoker`).toBe(false);
    }
  });
});

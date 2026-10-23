import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { prisma } from '../prisma.js';
import { hashPassword } from '../auth/passwords.js';

async function hiddenPassword() {
  if (!process.stdin.isTTY) throw new Error('Use a terminal or provide ADMIN_PASSWORD securely in the environment');
  process.stdout.write('Initial password (12–128 characters): ');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off('data', onData);
      process.stdout.write('\n');
    };
    function onData(chunk) {
      for (const char of chunk.toString()) {
        if (char === '\u0003') { finish(); reject(new Error('Cancelled')); return; }
        if (char === '\r' || char === '\n') { finish(); resolve(value); return; }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ') value += char;
      }
    }
    process.stdin.on('data', onData);
  });
}

try {
  if (await prisma.user.findFirst({ where: { role: 'Admin', active: true, passwordHash: { not: null } } })) {
    throw new Error('An administrator already has login access. Manage users from the signed-in administrator account.');
  }
  let email = process.env.ADMIN_EMAIL;
  let name = process.env.ADMIN_NAME || 'Administrator';
  if (!email) {
    if (!process.stdin.isTTY) throw new Error('Provide ADMIN_EMAIL or run this command in a terminal');
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    email = await prompt.question('Administrator email: ');
    name = await prompt.question('Administrator name: ') || name;
    prompt.close();
  }
  email = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Provide a valid email');
  const passwordHash = await hashPassword(process.env.ADMIN_PASSWORD || await hiddenPassword());
  const matches = await prisma.user.findMany({ where: { email: { equals: email, mode: 'insensitive' } } });
  if (matches.length > 1) throw new Error('Resolve duplicate emails before creating login access');
  if (matches.length === 1) {
    await prisma.user.update({ where: { id: matches[0].id }, data: { email, name, role: 'Admin', active: true, passwordHash } });
  } else {
    await prisma.user.create({ data: { id: randomUUID(), email, name, role: 'Admin', active: true, passwordHash } });
  }
  console.log('Administrator login created. Sign in with the email and password you supplied.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

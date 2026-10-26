import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!connectionString) {
  console.warn('[Prisma] Neither DATABASE_URL nor DIRECT_URL is set in environment.');
}
const adapter = new PrismaPg({ connectionString: connectionString || '' });

export const prisma = new PrismaClient({ adapter });

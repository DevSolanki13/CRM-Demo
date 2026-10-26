import 'dotenv/config';
import { initializeAttachmentStorage } from '../services/attachmentService.js';
import { prisma } from '../prisma.js';

try { console.log(JSON.stringify(await initializeAttachmentStorage())); }
catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await prisma.$disconnect(); }

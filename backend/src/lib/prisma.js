import { PrismaClient } from '@prisma/client';

// Single shared PrismaClient for the whole backend.
const prisma = new PrismaClient();

export default prisma;

import { PrismaClient } from '@prisma/client';

/**
 * Shared Prisma Client Singleton
 * 
 * CRITICAL: Prevents connection pool exhaustion in serverless (Vercel)
 * by ensuring only ONE PrismaClient instance is created and reused
 * across all API routes and functions.
 */

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// CRITICAL: Always set global to ensure reuse across serverless invocations
if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = prisma;
}

export default prisma;


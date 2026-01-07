import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

/**
 * Shared Prisma Client Singleton with Prisma Accelerate
 * 
 * Prisma Accelerate provides:
 * 1. Connection pooling for serverless environments (Vercel)
 * 2. Global edge caching
 * 3. Prevents "too many connections" errors
 * 
 * Set DATABASE_URL to your Prisma Accelerate URL in Vercel:
 * prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_KEY
 */

const globalForPrisma = globalThis as unknown as {
    prisma: ReturnType<typeof createPrismaClient> | undefined
};

function createPrismaClient() {
    return new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    }).$extends(withAccelerate());
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// CRITICAL: Always set global to ensure reuse across serverless invocations
if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = prisma;
}

export default prisma;



import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

/**
 * Shared Prisma Client Singleton with optional Prisma Accelerate
 * 
 * Prisma Accelerate provides:
 * 1. Connection pooling for serverless environments (Vercel)
 * 2. Global edge caching
 * 3. Prevents "too many connections" errors
 * 
 * For production: Set DATABASE_URL to your Prisma Accelerate URL:
 * prisma://accelerate.prisma-data.net/?api_key=YOUR_KEY
 * 
 * For local dev: Use standard PostgreSQL URL:
 * postgresql://postgres:postgres@localhost:5432/reply_comments
 */

const globalForPrisma = globalThis as unknown as {
    prisma: ReturnType<typeof createPrismaClient> | undefined
};

// Check if using Prisma Accelerate (production) or direct connection (local dev)
const isPrismaAccelerate = process.env.DATABASE_URL?.startsWith('prisma://');

function createPrismaClient() {
    const baseClient = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });

    // Only use Accelerate extension if DATABASE_URL is a prisma:// URL
    if (isPrismaAccelerate) {
        return baseClient.$extends(withAccelerate());
    }

    return baseClient;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// CRITICAL: Always set global to ensure reuse across serverless invocations
if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = prisma;
}

export default prisma;

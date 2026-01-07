import { PrismaClient } from '@prisma/client';

/**
 * Shared Prisma Client Singleton
 * 
 * Uses connection limit to prevent "too many connections" errors
 * 
 * To use Prisma Accelerate:
 * 1. Go to console.prisma.io
 * 2. Configure your project to use your Heroku Postgres URL as the "Direct URL"
 * 3. Get the Accelerate connection string  
 * 4. Set it as DATABASE_URL in Vercel
 * 5. Uncomment the withAccelerate() extension below
 */

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
};

// Add connection limit to prevent pool exhaustion in serverless
const databaseUrl = process.env.DATABASE_URL;
const connectionUrl = databaseUrl?.includes('?')
    ? `${databaseUrl}&connection_limit=5`
    : `${databaseUrl}?connection_limit=5`;

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
        db: {
            url: connectionUrl
        }
    }
});

// CRITICAL: Always set global to ensure reuse across serverless invocations
if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = prisma;
}

export default prisma;




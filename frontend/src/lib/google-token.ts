import { PrismaClient } from '@prisma/client';

// Prisma singleton pattern to avoid connection pool issues
// Only initialize if DATABASE_URL is present
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

let prisma: PrismaClient;
if (process.env.DATABASE_URL) {
    prisma = globalForPrisma.prisma ?? new PrismaClient();
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
} else {
    // Create a dummy prisma that will fail gracefully
    prisma = null as any;
    console.warn('⚠️ DATABASE_URL not set - Prisma operations will fail');
}

/**
 * Get a valid Google access token for a user.
 * Automatically refreshes if the token is expired or about to expire (5-minute buffer).
 * 
 * @param userId - The user ID to get tokens for
 * @returns The access token, or null if no Google account is connected
 */
export async function getGoogleAccessToken(userId: string): Promise<string | null> {
    // Check if prisma is available
    if (!prisma) {
        console.error('❌ Prisma not initialized - DATABASE_URL may be missing');
        return null;
    }

    const account = await prisma.account.findFirst({
        where: { userId, providerId: 'google' },
        select: {
            id: true,
            accessToken: true,
            refreshToken: true,
            accessTokenExpiresAt: true
        }
    });

    if (!account?.accessToken) {
        return null;
    }

    // Check if token is expired or about to expire (5-minute buffer)
    const now = new Date();
    const expiresAt = account.accessTokenExpiresAt
        ? new Date(account.accessTokenExpiresAt)
        : null;
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    const isExpired = expiresAt
        ? now >= new Date(expiresAt.getTime() - bufferMs)
        : false;

    if (isExpired && account.refreshToken) {
        try {
            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: process.env.GOOGLE_CLIENT_ID!,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                    refresh_token: account.refreshToken,
                    grant_type: 'refresh_token',
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Google token refresh failed:', errorText);
                // Return existing token as fallback - might still work briefly
                return account.accessToken;
            }

            const tokenData = await response.json();
            const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

            // Update the token in the database
            await prisma.account.update({
                where: { id: account.id },
                data: {
                    accessToken: tokenData.access_token,
                    accessTokenExpiresAt: newExpiresAt,
                    // Google sometimes issues a new refresh token
                    ...(tokenData.refresh_token && { refreshToken: tokenData.refresh_token }),
                },
            });

            return tokenData.access_token;
        } catch (error) {
            console.error('❌ Error refreshing Google token:', error);
            // Return existing token as fallback
            return account.accessToken;
        }
    }

    return account.accessToken;
}

/**
 * Log an action to the audit log for security tracking.
 * 
 * @param userId - The user ID performing the action
 * @param action - The action type (e.g., LOGIN_DELEGATION, VIDEO_DELETE)
 * @param details - Optional JSON details about the action
 * @param ipAddress - Optional IP address
 * @param userAgent - Optional user agent string
 */
export async function logAuditEvent(
    userId: string,
    action: string,
    details?: Record<string, any>,
    ipAddress?: string | null,
    userAgent?: string | null
): Promise<void> {
    try {
        if (!prisma) {
            console.warn('⚠️ Prisma not initialized - skipping audit log');
            return;
        }
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                details: details ? JSON.stringify(details) : null,
                ipAddress: ipAddress || null,
                userAgent: userAgent || null,
            },
        });
    } catch (error) {
        // Don't fail the main operation if audit logging fails
        console.error('Failed to write audit log:', error);
    }
}

// Export prisma instance for reuse
export { prisma };

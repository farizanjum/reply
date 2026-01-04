import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        // Get current session
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = session.user.id;

        // Check if user has password (can they login without Google?)
        const account = await prisma.account.findFirst({
            where: { userId, providerId: 'credential' }
        });

        const hasPassword = !!account;

        // Get the Google account
        const googleAccount = await prisma.account.findFirst({
            where: { userId, providerId: 'google' }
        });

        if (!googleAccount) {
            return NextResponse.json(
                { error: 'No YouTube/Google account connected' },
                { status: 400 }
            );
        }

        // Revoke token with Google
        const accessToken = googleAccount.accessToken;
        if (accessToken) {
            try {
                await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                console.log(`[Disconnect] Revoked Google token for user ${userId}`);
            } catch (revokeError) {
                console.error('[Disconnect] Token revoke failed (may already be invalid):', revokeError);
                // Continue anyway - token may already be invalid
            }
        }

        // Clear YouTube connection data
        if (hasPassword) {
            // User has password, safe to delete Google account
            await prisma.account.delete({
                where: { id: googleAccount.id }
            });
            console.log(`[Disconnect] Deleted Google account for user ${userId}`);
        } else {
            // User logged in via Google only - DON'T delete account row!
            // Just clear the tokens so YouTube access is revoked
            await prisma.account.update({
                where: { id: googleAccount.id },
                data: {
                    accessToken: null,
                    refreshToken: null,
                    accessTokenExpiresAt: null,
                }
            });
            console.log(`[Disconnect] Cleared tokens for Google-only user ${userId}`);
        }

        // Set youtubeConnected = false
        await prisma.user.update({
            where: { id: userId },
            data: { youtubeConnected: false }
        });

        return NextResponse.json({
            success: true,
            message: hasPassword
                ? 'YouTube disconnected successfully. You can reconnect anytime.'
                : 'YouTube access revoked. You can reconnect anytime. Note: You still need Google to log in.',
            canReconnect: true
        });

    } catch (error: any) {
        console.error('YouTube disconnect error:', error);
        return NextResponse.json(
            { error: 'Failed to disconnect YouTube' },
            { status: 500 }
        );
    }
}

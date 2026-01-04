import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getGoogleAccessToken, prisma } from '@/lib/google-token';
import jwt from 'jsonwebtoken';

const BACKEND_SECRET = process.env.BACKEND_SECRET_KEY || process.env.SECRET_KEY || 'dev-secret-key-change-in-production';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// Set max duration for slow backend responses (cold starts, YouTube API latency)
export const maxDuration = 30;

export async function POST(request: NextRequest) {
    try {
        // Get current Better Auth session
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized - no session', youtubeConnected: false },
                { status: 401 }
            );
        }

        const userId = session.user.id;
        const userEmail = session.user.email;

        // Get FRESH Google access token (automatically refreshes if expired)
        const freshAccessToken = await getGoogleAccessToken(userId);

        if (!freshAccessToken) {
            return NextResponse.json(
                { error: 'No Google OAuth account found', youtubeConnected: false },
                { status: 404 }
            );
        }

        // Get account to retrieve refresh token for backend
        const account = await prisma.account.findFirst({
            where: { userId, providerId: 'google' },
            select: { refreshToken: true }
        });

        // Generate backend JWT token
        const backendToken = jwt.sign(
            {
                user_id: userId,
                email: userEmail,
                name: session.user.name,
                source: 'better_auth',
                exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
            },
            BACKEND_SECRET,
            { algorithm: 'HS256' }
        );

        // Step 1: Sync tokens to Python backend (idempotent - uses ON CONFLICT DO UPDATE)
        const syncResponse = await fetch(`${BACKEND_URL}/api/auth/sync-tokens`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${backendToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: userEmail,
                name: session.user.name,
                image: session.user.image,
                access_token: freshAccessToken,
                refresh_token: account?.refreshToken,
                channel_id: (session.user as any).channelId,
                channel_name: (session.user as any).channelName,
            })
        });

        if (!syncResponse.ok) {
            const error = await syncResponse.text();
            console.error('Backend sync failed:', error);
            return NextResponse.json(
                { error: 'Backend sync failed', details: error, youtubeConnected: false },
                { status: 500 }
            );
        }

        const syncResult = await syncResponse.json();

        // Step 2: Update Frontend Prisma User record (critical for UI state)
        let channelName = syncResult.channel_name || (session.user as any).channelName || null;
        let channelId = syncResult.channel_id || (session.user as any).channelId || null;

        try {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    youtubeConnected: true,
                    channelName: channelName,
                    channelId: channelId,
                }
            });
            console.log(`✅ Updated Prisma User ${userId} with youtubeConnected=true`);
        } catch (prismaError: any) {
            // Log but don't fail - backend is already synced
            console.error('⚠️ Prisma update failed (non-fatal):', prismaError.message);
        }

        // Return optimistic response - frontend uses this immediately
        return NextResponse.json({
            success: true,
            youtubeConnected: true,
            channelName: channelName,
            channelId: channelId,
            backendToken,
            syncResult
        });

    } catch (error: any) {
        console.error('Token sync error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to sync tokens', youtubeConnected: false },
            { status: 500 }
        );
    }
}

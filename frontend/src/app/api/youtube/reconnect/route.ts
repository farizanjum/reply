import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getGoogleAccessToken, prisma } from '@/lib/google-token';
import jwt from 'jsonwebtoken';

const BACKEND_SECRET = process.env.BACKEND_SECRET_KEY || process.env.SECRET_KEY || 'dev-secret-key-change-in-production';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

/**
 * POST /api/youtube/reconnect
 * 
 * This endpoint handles YouTube reconnection after a user has disconnected.
 * It's needed because the account.create hook doesn't fire when reconnecting
 * (since the account row already exists with null tokens).
 * 
 * Flow:
 * 1. User disconnects YouTube (tokens cleared, youtubeConnected=false)
 * 2. User clicks "Connect YouTube" (OAuth runs, tokens refreshed in account table)
 * 3. Frontend calls this endpoint
 * 4. We set youtubeConnected=true and sync tokens to backend
 */
export async function POST(request: NextRequest) {
    try {
        // Get current Better Auth session
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized - no session', success: false },
                { status: 401 }
            );
        }

        const userId = session.user.id;
        const userEmail = session.user.email;

        console.log(`[Reconnect] Processing reconnection for user ${userEmail}`);

        // Step 1: Check if Google account exists with valid tokens
        const account = await prisma.account.findFirst({
            where: { userId, providerId: 'google' },
            select: {
                id: true,
                accessToken: true,
                refreshToken: true,
                accessTokenExpiresAt: true
            }
        });

        if (!account) {
            return NextResponse.json(
                { error: 'No Google account found. Please sign in with Google first.', success: false },
                { status: 404 }
            );
        }

        if (!account.accessToken) {
            return NextResponse.json(
                { error: 'Google account exists but has no tokens. Please complete the OAuth flow.', success: false },
                { status: 400 }
            );
        }

        // Step 2: Get fresh access token (refreshes if needed)
        const freshAccessToken = await getGoogleAccessToken(userId);

        if (!freshAccessToken) {
            return NextResponse.json(
                { error: 'Failed to get valid Google access token', success: false },
                { status: 500 }
            );
        }

        // Step 3: Fetch channel info from YouTube API
        let channelName: string | null = null;
        let channelId: string | null = null;

        try {
            const channelResponse = await fetch(
                'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
                {
                    headers: {
                        'Authorization': `Bearer ${freshAccessToken}`,
                        'Accept': 'application/json'
                    }
                }
            );

            if (channelResponse.ok) {
                const channelData = await channelResponse.json();
                if (channelData.items && channelData.items.length > 0) {
                    const channel = channelData.items[0];
                    channelId = channel.id;
                    channelName = channel.snippet?.title || null;
                    console.log(`[Reconnect] Found channel: ${channelName} (${channelId})`);
                }
            } else {
                console.warn('[Reconnect] Failed to fetch channel info:', await channelResponse.text());
            }
        } catch (channelError) {
            console.error('[Reconnect] Error fetching channel info:', channelError);
            // Continue without channel info - it's not critical
        }

        // Step 4: Update user record to mark YouTube as connected
        await prisma.user.update({
            where: { id: userId },
            data: {
                youtubeConnected: true,
                channelName: channelName,
                channelId: channelId,
            }
        });

        console.log(`[Reconnect] Set youtubeConnected=true for user ${userId}`);

        // Step 5: Sync tokens to Python backend
        try {
            const backendToken = jwt.sign(
                {
                    user_id: userId,
                    email: userEmail,
                    source: 'better_auth_reconnect',
                    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
                },
                BACKEND_SECRET,
                { algorithm: 'HS256' }
            );

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
                    refresh_token: account.refreshToken,
                    channel_id: channelId,
                    channel_name: channelName,
                })
            });

            if (syncResponse.ok) {
                console.log(`[Reconnect] Successfully synced tokens to backend for ${userEmail}`);
            } else {
                const errorText = await syncResponse.text();
                console.error('[Reconnect] Backend sync failed:', errorText);
                // Don't fail the request - frontend state is already updated
            }
        } catch (backendError) {
            console.error('[Reconnect] Backend sync error:', backendError);
            // Don't fail the request - frontend state is already updated
        }

        return NextResponse.json({
            success: true,
            youtubeConnected: true,
            channelName: channelName,
            channelId: channelId,
            message: 'YouTube reconnected successfully!'
        });

    } catch (error: any) {
        console.error('[Reconnect] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to reconnect YouTube', success: false },
            { status: 500 }
        );
    }
}

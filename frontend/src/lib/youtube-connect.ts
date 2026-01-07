'use client';

import { signIn } from '@/lib/auth-client';

/**
 * Unified YouTube connection helper.
 * 
 * This function handles both initial connection and reconnection scenarios.
 * After OAuth completes, it calls /api/youtube/reconnect to ensure
 * youtubeConnected is set to true and tokens are synced to backend.
 * 
 * @param callbackPath - Where to redirect after successful connection (default: /dashboard)
 * @returns Promise that resolves when OAuth is initiated (OAuth will redirect)
 */
export async function connectYouTube(callbackPath: string = '/dashboard'): Promise<void> {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    // Trigger Google OAuth with YouTube scopes
    // The callback URL includes a param to trigger reconnect logic
    await signIn.social({
        provider: 'google',
        callbackURL: `${baseUrl}${callbackPath}?youtube_reconnect=1`,
        errorCallbackURL: `${baseUrl}/auth/connect-youtube?error=oauth_failed`,
    });
}

/**
 * Call reconnect endpoint after OAuth callback.
 * This should be called when the URL contains ?youtube_reconnect=1
 * 
 * @returns Promise with reconnect result
 */
export async function finalizeYouTubeConnection(): Promise<{
    success: boolean;
    youtubeConnected: boolean;
    channelName: string | null;
    error?: string;
}> {
    try {
        const response = await fetch('/api/youtube/reconnect', {
            method: 'POST',
            credentials: 'include',
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                youtubeConnected: false,
                channelName: null,
                error: data.error || 'Failed to finalize connection'
            };
        }

        return {
            success: true,
            youtubeConnected: true,
            channelName: data.channelName || null
        };
    } catch (error: any) {
        console.error('[youtube-connect] Finalize error:', error);
        return {
            success: false,
            youtubeConnected: false,
            channelName: null,
            error: error.message || 'Network error'
        };
    }
}

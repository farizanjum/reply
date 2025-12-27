"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

// Export hooks for easy use
export const {
    signIn,
    signUp,
    signOut,
    useSession,
    getSession,
} = authClient;

// Custom hook for YouTube connection status
export function useYouTubeConnection() {
    const { data: session, isPending } = useSession();

    // Type assertion for custom user fields
    const user = session?.user as any;

    return {
        isConnected: user?.youtubeConnected ?? false,
        channelName: user?.channelName,
        channelThumbnail: user?.channelThumbnail,
        isPending,
    };
}

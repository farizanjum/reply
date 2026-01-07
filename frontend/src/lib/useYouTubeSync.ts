'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { authClient } from './auth-client';

/**
 * Multi-Tab YouTube State Sync using BroadcastChannel + localStorage
 * 
 * Features:
 * 1. SSR-safe + Safari-safe (feature detection)
 * 2. On receive: updates local state AND refreshes auth session
 * 3. Broadcast only updates other tabs (no self-echo by spec)
 * 4. Wake Up listener: refreshes session when tab becomes visible after sleeping
 * 5. NEW: localStorage persistence - state survives page refreshes
 */

interface YouTubeSyncMessage {
    type: 'YOUTUBE_STATE_CHANGE';
    connected: boolean;
    channelName: string | null;
    timestamp: number;
}

export interface YouTubeState {
    connected: boolean;
    channelName: string | null;
}

const CHANNEL_NAME = 'reply-youtube-sync';
const STORAGE_KEY = 'reply-youtube-state';

// Helper to safely access localStorage
function getStoredState(): YouTubeState | null {
    if (typeof window === 'undefined') return null;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Verify shape
            if (typeof parsed.connected === 'boolean') {
                return parsed as YouTubeState;
            }
        }
    } catch (e) {
        console.warn('[YouTubeSync] Failed to read localStorage:', e);
    }
    return null;
}

function setStoredState(state: YouTubeState) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            connected: state.connected,
            channelName: state.channelName,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.warn('[YouTubeSync] Failed to write localStorage:', e);
    }
}

export function useYouTubeSync() {
    // Initialize from localStorage for immediate persistence
    const [syncState, setSyncState] = useState<YouTubeState | null>(() => getStoredState());
    const channelRef = useRef<BroadcastChannel | null>(null);
    const lastVisibleRef = useRef<number>(Date.now());

    // BroadcastChannel setup
    useEffect(() => {
        // 1. Safety Check: SSR and Browser Support (Safari < 15.4 doesn't support BroadcastChannel)
        if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
            console.log('[YouTubeSync] BroadcastChannel not supported, skipping multi-tab sync');
            return;
        }

        try {
            const channel = new BroadcastChannel(CHANNEL_NAME);
            channelRef.current = channel;

            channel.onmessage = async (event: MessageEvent<YouTubeSyncMessage>) => {
                if (event.data.type === 'YOUTUBE_STATE_CHANGE') {
                    console.log('[YouTubeSync] Received broadcast:', event.data);

                    const newState = {
                        connected: event.data.connected,
                        channelName: event.data.channelName
                    };

                    // Update local UI state immediately (Optimistic)
                    setSyncState(newState);

                    // Persist to localStorage for refresh persistence
                    setStoredState(newState);

                    // 2. CRITICAL: Force refresh the auth session in this tab
                    // This ensures API calls have the correct state, not just the UI
                    try {
                        await authClient.getSession();
                        console.log('[YouTubeSync] Session refreshed after broadcast');
                    } catch (err) {
                        console.warn('[YouTubeSync] Session refresh failed:', err);
                    }
                }
            };

            return () => {
                channel.close();
                channelRef.current = null;
            };
        } catch (err) {
            console.error('[YouTubeSync] Failed to create BroadcastChannel:', err);
        }
    }, []);

    // Wake Up listener: refresh session when tab becomes visible after being hidden
    useEffect(() => {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                const timeSinceLastVisible = Date.now() - lastVisibleRef.current;

                // Only refresh if tab was hidden for more than 30 seconds
                // This prevents unnecessary refreshes on quick tab switches
                if (timeSinceLastVisible > 30000) {
                    console.log('[YouTubeSync] Tab woke up after', Math.round(timeSinceLastVisible / 1000), 'seconds, refreshing session...');
                    try {
                        const session = await authClient.getSession();
                        // Update local state from fresh session
                        const user = session?.data?.user as any;
                        if (user) {
                            const newState = {
                                connected: user.youtubeConnected ?? false,
                                channelName: user.channelName ?? null
                            };
                            setSyncState(newState);
                            setStoredState(newState);
                        }
                        console.log('[YouTubeSync] Session refreshed on wake up');
                    } catch (err) {
                        console.warn('[YouTubeSync] Wake up session refresh failed:', err);
                    }
                }
            } else {
                // Tab is being hidden, record the time
                lastVisibleRef.current = Date.now();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    /**
     * Broadcast a state change to all other tabs
     * Also updates local state immediately AND persists to localStorage
     */
    const broadcast = useCallback((newState: YouTubeState) => {
        // Update local state immediately (Optimistic)
        setSyncState(newState);

        // Persist to localStorage for refresh persistence
        setStoredState(newState);

        // Broadcast to other tabs
        if (channelRef.current) {
            const message: YouTubeSyncMessage = {
                type: 'YOUTUBE_STATE_CHANGE',
                connected: newState.connected,
                channelName: newState.channelName,
                timestamp: Date.now()
            };
            channelRef.current.postMessage(message);
            console.log('[YouTubeSync] Broadcast sent:', message);
        }
    }, []);

    return { syncState, broadcast };
}



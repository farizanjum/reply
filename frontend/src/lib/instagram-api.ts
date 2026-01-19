import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// Create axios instance for Instagram API
export const instagramApi = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
instagramApi.interceptors.request.use(async (config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('backend_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// =====================================================
// INSTAGRAM API TYPES
// =====================================================

export interface InstagramAccount {
    id: number;
    instagram_user_id: string;
    instagram_username: string;
    profile_picture_url: string;
    facebook_page_name: string;
    is_active: boolean;
    token_expiry: string | null;
    created_at: string | null;
}

export interface InstagramMedia {
    id: number;
    media_id: string;
    media_type: string | null;
    caption: string | null;
    permalink: string | null;
    thumbnail_url: string | null;
    auto_reply_enabled: boolean;
    keywords: string[];
    reply_templates: string[];
    dm_enabled: boolean;
    dm_template: string | null;
    resource_link: string | null;
    schedule_interval_minutes: number;
    last_processed_at: string | null;
    media_timestamp: string | null;
}

export interface InstagramMediaSettings {
    auto_reply_enabled?: boolean;
    keywords?: string[];
    reply_templates?: string[];
    dm_enabled?: boolean;
    dm_template?: string;
    resource_link?: string;
    schedule_interval_minutes?: number;
}

export interface InstagramStats {
    total_media: number;
    active_media: number;
    total_processed: number;
    replies_sent: number;
    dms_sent: number;
    keyword_matches: number;
    period_days: number;
}

export interface InstagramActivity {
    id: number;
    comment_id: string;
    commenter_username: string;
    comment_text: string;
    matched_keyword: string | null;
    dm_sent: boolean;
    reply_sent: boolean;
    error_message: string | null;
    processed_at: string | null;
}

// =====================================================
// INSTAGRAM API FUNCTIONS
// =====================================================

/**
 * Get connected Instagram account info
 */
export async function getInstagramAccount(): Promise<{
    connected: boolean;
    account: InstagramAccount | null;
}> {
    const response = await instagramApi.get('/api/instagram/account');
    return response.data;
}

/**
 * Disconnect Instagram account
 */
export async function disconnectInstagram(): Promise<{ success: boolean; message: string }> {
    const response = await instagramApi.post('/api/instagram/auth/disconnect');
    return response.data;
}

/**
 * Refresh Instagram token
 */
export async function refreshInstagramToken(): Promise<{
    success: boolean;
    message: string;
    expires_at: string;
}> {
    const response = await instagramApi.post('/api/instagram/auth/refresh');
    return response.data;
}

/**
 * Get Instagram OAuth login URL
 */
export function getInstagramLoginUrl(userId: string, redirectUrl?: string): string {
    const baseUrl = API_URL;
    const params = new URLSearchParams({
        user_id: userId,
    });
    if (redirectUrl) {
        params.set('frontend_redirect', redirectUrl);
    }
    return `${baseUrl}/api/instagram/auth/login?${params.toString()}`;
}

/**
 * Get all Instagram media with settings
 */
export async function getInstagramMedia(): Promise<{
    media: InstagramMedia[];
    account_connected: boolean;
    account?: {
        username: string;
        profile_picture_url: string;
    };
}> {
    const response = await instagramApi.get('/api/instagram/media');
    return response.data;
}

/**
 * Sync media from Instagram
 */
export async function syncInstagramMedia(): Promise<{
    success: boolean;
    message: string;
    task_id?: string;
}> {
    const response = await instagramApi.post('/api/instagram/media/sync');
    return response.data;
}

/**
 * Get Instagram media details with activity
 */
export async function getInstagramMediaDetails(mediaId: number): Promise<{
    media: InstagramMedia;
    activity: InstagramActivity[];
}> {
    const response = await instagramApi.get(`/api/instagram/media/${mediaId}`);
    return response.data;
}

/**
 * Update Instagram media settings
 */
export async function updateInstagramMediaSettings(
    mediaId: number,
    settings: InstagramMediaSettings
): Promise<{ success: boolean; message: string }> {
    const response = await instagramApi.put(`/api/instagram/media/${mediaId}/settings`, settings);
    return response.data;
}

/**
 * Trigger manual processing for Instagram media
 */
export async function triggerInstagramProcessing(mediaId: number): Promise<{
    success: boolean;
    message: string;
    task_id?: string;
}> {
    const response = await instagramApi.post(`/api/instagram/media/${mediaId}/trigger`);
    return response.data;
}

/**
 * Get Instagram automation stats
 */
export async function getInstagramStats(days: number = 7): Promise<{
    connected: boolean;
    account?: {
        username: string;
        profile_picture_url: string;
    };
    stats: InstagramStats | null;
}> {
    const response = await instagramApi.get(`/api/instagram/stats?days=${days}`);
    return response.data;
}

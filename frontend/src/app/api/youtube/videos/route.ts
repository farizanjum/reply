import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getGoogleAccessToken } from '@/lib/google-token';

// YouTube Data API v3 endpoint
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Fetch videos from YouTube
async function fetchYouTubeVideos(accessToken: string) {
    // First, get the user's channel
    const channelResponse = await fetch(
        `${YOUTUBE_API_BASE}/channels?part=contentDetails&mine=true`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        }
    );

    if (!channelResponse.ok) {
        const error = await channelResponse.text();
        console.error('YouTube API channel error:', error);
        throw new Error(`Failed to fetch channel: ${channelResponse.status}`);
    }

    const channelData = await channelResponse.json();

    if (!channelData.items || channelData.items.length === 0) {
        return { videos: [], channel: null };
    }

    const channel = channelData.items[0];
    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
        return { videos: [], channel };
    }

    // Get videos from uploads playlist
    const videosResponse = await fetch(
        `${YOUTUBE_API_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        }
    );

    if (!videosResponse.ok) {
        const error = await videosResponse.text();
        console.error('YouTube API videos error:', error);
        throw new Error(`Failed to fetch videos: ${videosResponse.status}`);
    }

    const videosData = await videosResponse.json();

    // Get video statistics for each video
    const videoIds = videosData.items?.map((item: any) => item.contentDetails.videoId).join(',');

    if (!videoIds) {
        return { videos: [], channel };
    }

    const statsResponse = await fetch(
        `${YOUTUBE_API_BASE}/videos?part=statistics,snippet&id=${videoIds}`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        }
    );

    if (!statsResponse.ok) {
        // Return videos without stats if stats fail
        return {
            videos: videosData.items?.map((item: any) => ({
                id: item.contentDetails.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
                publishedAt: item.snippet.publishedAt,
                stats: null
            })) || [],
            channel
        };
    }

    const statsData = await statsResponse.json();

    // Map stats to videos
    const statsMap: Record<string, any> = {};
    statsData.items?.forEach((item: any) => {
        statsMap[item.id] = {
            viewCount: parseInt(item.statistics.viewCount || '0'),
            likeCount: parseInt(item.statistics.likeCount || '0'),
            commentCount: parseInt(item.statistics.commentCount || '0')
        };
    });

    const videos = videosData.items?.map((item: any) => ({
        id: item.contentDetails.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        publishedAt: item.snippet.publishedAt,
        stats: statsMap[item.contentDetails.videoId] || null
    })) || [];

    return { videos, channel };
}

export async function GET(request: NextRequest) {
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

        // Get Google access token
        const accessToken = await getGoogleAccessToken(session.user.id);

        if (!accessToken) {
            return NextResponse.json(
                { error: 'No Google account connected', videos: [] },
                { status: 200 }
            );
        }


        // Fetch videos from YouTube
        const { videos, channel } = await fetchYouTubeVideos(accessToken);

        // AUTO-SYNC: Send videos to backend database
        // This ensures videos exist in backend so settings can be saved
        try {
            const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
            const jwt = require('jsonwebtoken');
            const BACKEND_SECRET = process.env.BACKEND_SECRET_KEY || process.env.SECRET_KEY || 'dev-secret-key-change-in-production';

            // Generate JWT token for backend auth
            const backendToken = jwt.sign(
                {
                    user_id: session.user.id,
                    email: session.user.email,
                    name: session.user.name,
                    source: 'better_auth',
                    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
                },
                BACKEND_SECRET,
                { algorithm: 'HS256' }
            );

            // Sync videos to backend
            const syncResponse = await fetch(`${BACKEND_URL}/api/videos/upsert-batch`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${backendToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(
                    videos.map((v: any) => ({
                        video_id: v.id,
                        title: v.title,
                        description: v.description || '',
                        thumbnail_url: v.thumbnail,
                        published_at: v.publishedAt,
                        view_count: v.stats?.viewCount || 0,
                        comment_count: v.stats?.commentCount || 0
                    }))
                )
            });

            if (syncResponse.ok) {
                const syncResult = await syncResponse.json();
                console.log(`✅ Auto-synced ${syncResult.synced} videos to backend`);
            } else {
                console.warn('⚠️ Backend sync failed (non-fatal):', syncResponse.status);
            }

            // Fetch settings for all videos from backend and merge
            const settingsPromises = videos.map(async (video: any) => {
                try {
                    const settingsRes = await fetch(`${BACKEND_URL}/api/videos/${video.id}/settings`, {
                        headers: {
                            'Authorization': `Bearer ${backendToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (settingsRes.ok) {
                        const settings = await settingsRes.json();
                        return { videoId: video.id, settings };
                    }
                } catch (e) {
                    // Ignore individual failures
                }
                return { videoId: video.id, settings: null };
            });

            const settingsResults = await Promise.all(settingsPromises);
            const settingsMap: Record<string, any> = {};
            settingsResults.forEach(r => {
                if (r.settings) {
                    settingsMap[r.videoId] = r.settings;
                }
            });

            // Merge settings into videos
            const videosWithSettings = videos.map((v: any) => ({
                ...v,
                auto_reply_enabled: settingsMap[v.id]?.auto_reply_enabled || false,
                keywords: settingsMap[v.id]?.keywords || [],
                reply_templates: settingsMap[v.id]?.reply_templates || [],
            }));

            return NextResponse.json({
                videos: videosWithSettings,
                channel,
                total: videos.length
            });
        } catch (syncError) {
            // Don't fail the entire request if backend sync fails
            console.warn('⚠️ Could not sync to backend (non-fatal):', syncError);
        }

        return NextResponse.json({
            videos,
            channel,
            total: videos.length
        });

    } catch (error: any) {
        console.error('YouTube videos API error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch videos', videos: [] },
            { status: 500 }
        );
    }
}

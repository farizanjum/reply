'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Badge, Modal } from '@/components/ui';
import { videosApi, templatesApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    RefreshCw,
    Settings,
    Play,
    Eye,
    MessageSquare,
    X,
    Plus,
    Check,
    AlertTriangle,
    Loader2,
    ChevronDown,
    Bookmark,
    Trash2,
    ArrowRight
} from 'lucide-react';
import { VideosSkeleton } from '@/components/ui/LoadingSkeletons';

// Default reply templates - Click to customize before adding
// {link} will be replaced with your custom link
const DEFAULT_TEMPLATES = [
    "Thanks for your comment! Here is the link: {link}",
    "Great question! Here's the resource you requested: {link}",
    "I appreciate your feedback! Check this out: {link}",
    "Thanks for watching! More info here: {link}",
    "You might find this helpful: {link}",
    "Here's what you're looking for: {link}",
    "The link for the resource: {link}",
    "Thanks for the support! Resource link: {link}",
    "Glad you asked! Here you go: {link}",
    "Check out this link for more details: {link}"
];

interface Video {
    id: number;
    video_id: string;
    title: string;
    thumbnail_url: string;
    view_count: number;
    comment_count: number;
    auto_reply_enabled: boolean;
    keywords: string[];
    reply_templates: string[];
}

interface VideoSettings {
    auto_reply_enabled: boolean;
    keywords: string[];
    reply_templates: string[];
    schedule_interval_minutes?: number;
}

interface ProcessingStatus {
    videoId: string;
    status: 'processing' | 'completed' | 'error';
    progress: number;
    total_comments?: number;
    qualified?: number;
    replied?: number;
    failed?: number;
    error?: string;
}

export default function VideosPage() {
    const queryClient = useQueryClient();
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [settings, setSettings] = useState<VideoSettings>({
        auto_reply_enabled: false,
        keywords: [],
        reply_templates: [],
        schedule_interval_minutes: 60,
    });
    const [keywordInput, setKeywordInput] = useState('');
    const [templateInput, setTemplateInput] = useState('');
    const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
    const [processingVideos, setProcessingVideos] = useState<Map<string, ProcessingStatus>>(new Map());
    const [showSpamWarning, setShowSpamWarning] = useState(false);
    const [dontShowWarningAgain, setDontShowWarningAgain] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('hideTemplateWarning') === 'true';
        }
        return false;
    });

    // Success toast state
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Store video settings for each video
    const [videoSettingsMap, setVideoSettingsMap] = useState<Map<string, VideoSettings>>(new Map());

    const { data: videosData, isLoading } = useQuery({
        queryKey: ['youtube-videos'],
        queryFn: async () => {
            const response = await fetch('/api/youtube/videos');
            if (!response.ok) throw new Error('Failed to fetch videos');
            return response.json();
        },
        staleTime: 60 * 1000, // Cache for 1 minute
    });

    // Map YouTube API response to expected Video format
    const videos: Video[] = (videosData?.videos || []).map((v: any, index: number) => {
        const savedSettings = videoSettingsMap.get(v.id);
        return {
            id: index + 1,
            video_id: v.id,
            title: v.title,
            thumbnail_url: v.thumbnail,
            view_count: v.stats?.viewCount || 0,
            comment_count: v.stats?.commentCount || 0,
            auto_reply_enabled: savedSettings?.auto_reply_enabled || false,
            keywords: savedSettings?.keywords || [],
            reply_templates: savedSettings?.reply_templates || []
        };
    });

    // Fetch settings for all videos when videos load
    useEffect(() => {
        if (videosData?.videos && videosData.videos.length > 0) {
            videosData.videos.forEach(async (v: any) => {
                try {
                    const response = await fetch(`/api/youtube/settings/${v.id}`);
                    if (response.ok) {
                        const settings = await response.json();
                        // CRITICAL FIX: Always store settings, even if keywords/templates are empty
                        // This ensures auto_reply_enabled persists across page refreshes
                        setVideoSettingsMap(prev => new Map(prev).set(v.id, settings));
                    }
                } catch (e) {
                    // Ignore errors for individual videos
                }
            });
        }
    }, [videosData?.videos]);

    // Helper function to refetch settings for all videos
    const refetchAllVideoSettings = async (videos: any[]) => {
        const newSettingsMap = new Map<string, VideoSettings>();

        await Promise.all(videos.map(async (v: any) => {
            try {
                const response = await fetch(`/api/youtube/settings/${v.id}`);
                if (response.ok) {
                    const settings = await response.json();
                    newSettingsMap.set(v.id, settings);
                }
            } catch (e) {
                // Ignore errors for individual videos
            }
        }));

        setVideoSettingsMap(newSettingsMap);
    };

    const syncMutation = useMutation({
        mutationFn: () => videosApi.syncVideos(),
        onSuccess: async () => {
            // Invalidate and refetch the videos query
            await queryClient.invalidateQueries({ queryKey: ['youtube-videos'] });

            // Get the fresh videos data and refetch all settings
            const freshVideosData = queryClient.getQueryData(['youtube-videos']) as any;
            if (freshVideosData?.videos) {
                await refetchAllVideoSettings(freshVideosData.videos);
            }

            // Show success toast
            setSuccessMessage('Videos synced from YouTube!');
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);
        },
        onError: (error: any) => {
            alert(`Sync failed: ${error.message || 'Unknown error'}`);
        },
    });

    const updateSettingsMutation = useMutation({
        mutationFn: async ({ videoId, settings }: { videoId: string; settings: VideoSettings }) => {
            // Use new Next.js API route that handles auth
            const response = await fetch(`/api/youtube/settings/${videoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save settings');
            }
            return { videoId, settings };
        },
        onSuccess: ({ videoId, settings }) => {
            queryClient.invalidateQueries({ queryKey: ['youtube-videos'] });

            // Update local settings map
            setVideoSettingsMap(prev => new Map(prev).set(videoId, settings));

            // Show success toast
            setSuccessMessage(`Settings saved! ${settings.keywords.length} keywords, ${settings.reply_templates.length} templates`);
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);

            setSelectedVideo(null);
        },
        onError: (error: any) => {
            console.error('Failed to save settings:', error);
            alert(`Failed to save settings: ${error.message}`);
        },
    });

    const triggerMutation = useMutation({
        mutationFn: async (videoId: string) => {
            // Set initial processing status
            setProcessingVideos(prev => new Map(prev).set(videoId, {
                videoId,
                status: 'processing',
                progress: 0
            }));

            try {
                const response = await videosApi.triggerReply(videoId);

                // If response contains task_id, poll for results
                if (response.data.task_id) {
                    const taskId = response.data.task_id;

                    // Poll for task status every 2 seconds
                    const pollInterval = setInterval(async () => {
                        try {
                            const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
                            const statusResponse = await fetch(`${BACKEND_URL}/api/videos/task-status/${taskId}`, {
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('backend_token')}`
                                }
                            });

                            if (statusResponse.ok) {
                                const statusData = await statusResponse.json();

                                if (statusData.status === 'completed') {
                                    clearInterval(pollInterval);
                                    setProcessingVideos(prev => new Map(prev).set(videoId, {
                                        videoId,
                                        status: 'completed',
                                        progress: 100,
                                        ...statusData  // Contains total_comments, replied, failed, etc.
                                    }));

                                    // Clear after 10 seconds
                                    setTimeout(() => {
                                        setProcessingVideos(prev => {
                                            const newMap = new Map(prev);
                                            newMap.delete(videoId);
                                            return newMap;
                                        });
                                    }, 10000);
                                } else if (statusData.status === 'error') {
                                    clearInterval(pollInterval);
                                    setProcessingVideos(prev => new Map(prev).set(videoId, {
                                        videoId,
                                        status: 'error',
                                        progress: 0,
                                        error: statusData.error || 'Task failed'
                                    }));

                                    setTimeout(() => {
                                        setProcessingVideos(prev => {
                                            const newMap = new Map(prev);
                                            newMap.delete(videoId);
                                            return newMap;
                                        });
                                    }, 10000);
                                }
                                // Otherwise keep polling (pending or processing)
                            }
                        } catch (pollError) {
                            console.error('Error polling task status:', pollError);
                        }
                    }, 2000);  // Poll every 2 seconds

                    // Stop polling after 60 seconds maximum
                    setTimeout(() => clearInterval(pollInterval), 60000);
                } else {
                    // Direct response (local dev mode)
                    setProcessingVideos(prev => new Map(prev).set(videoId, {
                        videoId,
                        status: 'completed',
                        progress: 100,
                        ...response.data
                    }));

                    setTimeout(() => {
                        setProcessingVideos(prev => {
                            const newMap = new Map(prev);
                            newMap.delete(videoId);
                            return newMap;
                        });
                    }, 10000);
                }

                return response;
            } catch (error: any) {
                setProcessingVideos(prev => new Map(prev).set(videoId, {
                    videoId,
                    status: 'error',
                    progress: 0,
                    error: error.response?.data?.detail || error.message || 'Failed to process'
                }));

                // Clear error after 10 seconds
                setTimeout(() => {
                    setProcessingVideos(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(videoId);
                        return newMap;
                    });
                }, 10000);

                throw error;
            }
        },
    });

    const { data: userTemplates, refetch: refetchTemplates } = useQuery({
        queryKey: ['templates'],
        queryFn: async () => {
            const response = await templatesApi.getTemplates();
            return response.data as { id: number; template_text: string }[];
        },
    });

    const createTemplateMutation = useMutation({
        mutationFn: (text: string) => templatesApi.createTemplate(text),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['templates'] });
        },
    });

    const deleteTemplateMutation = useMutation({
        mutationFn: (id: number) => templatesApi.deleteTemplate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['templates'] });
        },
    });

    const openSettings = async (video: Video) => {
        setSelectedVideo(video);

        // Reset the "don't show again" checkbox based on this video's preference
        const warningKey = `hideTemplateWarning_${video.video_id}`;
        const hasSeenWarning = typeof window !== 'undefined'
            ? localStorage.getItem(warningKey) === 'true'
            : false;
        setDontShowWarningAgain(hasSeenWarning);

        // Fetch saved settings from backend
        try {
            const response = await fetch(`/api/youtube/settings/${video.video_id}`);
            if (response.ok) {
                const savedSettings = await response.json();
                setSettings({
                    auto_reply_enabled: savedSettings.auto_reply_enabled || false,
                    keywords: savedSettings.keywords || [],
                    reply_templates: savedSettings.reply_templates || [],
                    schedule_interval_minutes: savedSettings.schedule_interval_minutes || 60,
                });
                return;
            }
        } catch (e) {
            console.warn('Could not fetch saved settings:', e);
        }

        // Fallback to video data if no saved settings
        setSettings({
            auto_reply_enabled: video.auto_reply_enabled,
            keywords: video.keywords || [],
            reply_templates: video.reply_templates || [],
            schedule_interval_minutes: 60,
        });
    };

    const addKeyword = () => {
        if (keywordInput.trim() && !settings.keywords.includes(keywordInput.trim())) {
            setSettings({
                ...settings,
                keywords: [...settings.keywords, keywordInput.trim()],
            });
            setKeywordInput('');
        }
    };

    const removeKeyword = (keyword: string) => {
        setSettings({
            ...settings,
            keywords: settings.keywords.filter((k) => k !== keyword),
        });
    };

    const addTemplate = () => {
        if (templateInput.trim() && !settings.reply_templates.includes(templateInput.trim())) {
            setSettings({
                ...settings,
                reply_templates: [...settings.reply_templates, templateInput.trim()],
            });
            setTemplateInput('');
        }
    };

    const removeTemplate = (template: string) => {
        setSettings({
            ...settings,
            reply_templates: settings.reply_templates.filter((t) => t !== template),
        });
    };

    const saveSettings = () => {
        if (selectedVideo) {
            // Check if templates are less than 4 and warning hasn't been dismissed for THIS video
            const warningKey = `hideTemplateWarning_${selectedVideo.video_id}`;
            const hasSeenWarning = typeof window !== 'undefined'
                ? localStorage.getItem(warningKey) === 'true'
                : false;

            if (settings.reply_templates.length < 4 && !hasSeenWarning) {
                setShowSpamWarning(true);
                return;
            }

            // Proceed with saving
            updateSettingsMutation.mutate({
                videoId: selectedVideo.video_id,
                settings,
            });
        }
    };

    const proceedWithSave = () => {
        if (selectedVideo) {
            // Save the "don't show again" preference for this specific video
            if (dontShowWarningAgain) {
                const warningKey = `hideTemplateWarning_${selectedVideo.video_id}`;
                if (typeof window !== 'undefined') {
                    localStorage.setItem(warningKey, 'true');
                }
            }

            setShowSpamWarning(false);
            updateSettingsMutation.mutate({
                videoId: selectedVideo.video_id,
                settings,
            });
        }
    };

    const hasTemplateWarning = settings.reply_templates.length < 4;

    return (
        <div className="space-y-6">
            {/* Success Toast */}
            {showSuccessToast && (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className="bg-green-500/20 backdrop-blur-md border border-green-500/30 rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg">
                        <div className="w-8 h-8 bg-green-500/30 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-green-400" />
                        </div>
                        <span className="text-green-200 text-sm font-medium">{successMessage}</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Videos</h1>
                    <p className="text-gray-400">
                        Manage auto-reply settings for your videos
                    </p>
                </div>
                <Button
                    onClick={() => syncMutation.mutate()}
                    isLoading={syncMutation.isPending}
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync from YouTube
                </Button>
            </div>

            {/* Videos Grid */}
            {isLoading ? (
                <VideosSkeleton />
            ) : videos && videos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {videos.map((video) => {
                        const processingStatus = processingVideos.get(video.video_id);

                        return (
                            <Card key={video.id} variant="glass" className="overflow-hidden group bg-white/[0.02] backdrop-blur-sm border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all">
                                {/* Thumbnail */}
                                <div className="relative aspect-video">
                                    <img
                                        src={video.thumbnail_url || `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`}
                                        alt={video.title}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => openSettings(video)}
                                            className="backdrop-blur-md bg-white/10 hover:bg-white/20 border-white/20"
                                        >
                                            <Settings className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => triggerMutation.mutate(video.video_id)}
                                            disabled={!!processingStatus}
                                            className="backdrop-blur-md bg-white/10 hover:bg-white/20 border-white/20"
                                        >
                                            {processingStatus ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Play className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                    {video.auto_reply_enabled && (
                                        <Badge variant="success" className="absolute top-2 right-2 bg-green-500/20 backdrop-blur-sm border-green-500/30">
                                            Active
                                        </Badge>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-4 bg-gradient-to-b from-transparent to-black/20">
                                    <h3 className="font-semibold text-sm line-clamp-2 mb-2">
                                        {video.title}
                                    </h3>
                                    <div className="flex items-center gap-4 text-xs text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <Eye className="w-3 h-3" />
                                            {video.view_count?.toLocaleString() || 0}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MessageSquare className="w-3 h-3" />
                                            {video.comment_count?.toLocaleString() || 0}
                                        </span>
                                        <span className="ml-auto opacity-50 text-[10px]">Data from YouTube</span>
                                    </div>
                                    {video.keywords && video.keywords.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-3">
                                            {video.keywords.slice(0, 3).map((keyword) => (
                                                <span
                                                    key={keyword}
                                                    className="px-2 py-0.5 text-xs bg-white/10 backdrop-blur-sm rounded-full border border-white/10"
                                                >
                                                    {keyword}
                                                </span>
                                            ))}
                                            {video.keywords.length > 3 && (
                                                <span className="text-xs text-gray-400">
                                                    +{video.keywords.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Processing Status */}
                                    {processingStatus && (
                                        <div className="mt-3 p-3 bg-white/5 rounded-lg space-y-2">
                                            {processingStatus.status === 'processing' && (
                                                <>
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-orange-400 flex items-center gap-2">
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                            Processing...
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-white/10 rounded-full h-1.5">
                                                        <div className="bg-orange-500 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
                                                    </div>
                                                </>
                                            )}
                                            {processingStatus.status === 'completed' && (
                                                <div className="text-xs space-y-1">
                                                    <div className="flex items-center gap-2 text-green-400">
                                                        <Check className="w-3 h-3" />
                                                        <span>Completed!</span>
                                                    </div>
                                                    <div className="text-[#A1A1AA] space-y-0.5">
                                                        <div>Comments: {processingStatus.total_comments || 0}</div>
                                                        <div>Qualified: {processingStatus.qualified || 0}</div>
                                                        <div>Replied: {processingStatus.replied || 0}</div>
                                                        {(processingStatus.failed || 0) > 0 && (
                                                            <div className="text-red-400">Failed: {processingStatus.failed}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {processingStatus.status === 'error' && (
                                                <div className="text-xs text-red-400">
                                                    Error: {processingStatus.error}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card variant="glass" className="text-center py-12 border-white/5 bg-white/[0.02]">
                    <RefreshCw className="w-12 h-12 mx-auto mb-4 text-[#52525B]" />
                    <h3 className="text-lg font-semibold mb-2 text-white">No videos found</h3>
                    <p className="text-[#A1A1AA] mb-4">
                        Sync your videos from YouTube to get started
                    </p>
                    <Button onClick={() => syncMutation.mutate()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Videos
                    </Button>
                </Card>
            )}

            {/* Settings Modal */}
            <Modal
                isOpen={!!selectedVideo}
                onClose={() => setSelectedVideo(null)}
                title={selectedVideo?.title || 'Video Settings'}
                size="lg"
            >
                <div className="space-y-6">
                    {/* Auto-reply Toggle */}
                    <div className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-xl border border-white/5 transition-colors hover:border-white/10">
                        <div>
                            <h4 className="font-medium text-white">Auto-Reply</h4>
                            <p className="text-sm text-[#A1A1AA]">
                                Enable automatic replies for this video
                            </p>
                        </div>
                        <button
                            onClick={() =>
                                setSettings({
                                    ...settings,
                                    auto_reply_enabled: !settings.auto_reply_enabled,
                                })
                            }
                            className={`relative w-11 h-6 rounded-full transition-all duration-300 flex items-center px-1 ${settings.auto_reply_enabled ? 'bg-orange-500 shadow-lg shadow-orange-500/20' : 'bg-white/10'
                                }`}
                        >
                            <span
                                className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow-sm ${settings.auto_reply_enabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Schedule Interval */}
                    {settings.auto_reply_enabled && (
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4">
                            <label className="block text-sm font-medium mb-2 text-[#EDEDED]">Auto-Reply Interval</label>
                            <p className="text-xs text-[#A1A1AA] mb-3">
                                How often should we check for new comments and send replies?
                            </p>
                            <select
                                value={settings.schedule_interval_minutes || 60}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        schedule_interval_minutes: parseInt(e.target.value),
                                    })
                                }
                                className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 text-white transition-all cursor-pointer"
                            >
                                <option value={1}>Every 1 minute</option>
                                <option value={2}>Every 2 minutes</option>
                                <option value={5}>Every 5 minutes</option>
                                <option value={10}>Every 10 minutes</option>
                                <option value={15}>Every 15 minutes</option>
                                <option value={30}>Every 30 minutes</option>
                                <option value={60}>Every 1 hour</option>
                                <option value={120}>Every 2 hours</option>
                                <option value={180}>Every 3 hours</option>
                                <option value={360}>Every 6 hours</option>
                                <option value={720}>Every 12 hours</option>
                                <option value={1440}>Every 24 hours</option>
                            </select>
                        </div>
                    )}

                    {/* Keywords */}
                    <div>
                        <label className="block text-sm font-medium mb-2 text-[#EDEDED]">Keywords</label>
                        <p className="text-xs text-[#A1A1AA] mb-3">
                            Comments containing these keywords will receive replies (case-insensitive)
                        </p>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={keywordInput}
                                onChange={(e) => setKeywordInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                                placeholder="Add keyword..."
                                className="flex-1 px-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 placeholder:text-[#52525B] text-white transition-all"
                            />
                            <Button size="sm" onClick={addKeyword}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {settings.keywords.map((keyword) => (
                                <span
                                    key={keyword}
                                    className="flex items-center gap-1 px-3 py-1 bg-[#0A0A0A] border border-white/10 text-[#EDEDED] rounded-full text-sm group transition-colors hover:border-orange-500/50"
                                >
                                    {keyword}
                                    <button
                                        onClick={() => removeKeyword(keyword)}
                                        className="hover:text-red-400 transition-colors ml-1 text-[#52525B] group-hover:text-red-400"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Reply Templates */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-[#EDEDED]">
                                Reply Templates ({settings.reply_templates.length})
                            </label>
                            {hasTemplateWarning && (
                                <span className="text-xs text-orange-500 font-medium flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Add matching variance
                                </span>
                            )}
                        </div>

                        <p className="text-xs text-[#A1A1AA]">
                            Use <code className="px-1 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded text-orange-400 font-mono text-[10px]">{'{link}'}</code> as placeholder.
                        </p>

                        {/* Add Custom Template & Library Save */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={templateInput}
                                onChange={(e) => setTemplateInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addTemplate()}
                                placeholder="Add custom template..."
                                className="flex-1 px-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 placeholder:text-[#52525B] text-white transition-all"
                            />
                            <Button size="sm" onClick={addTemplate} title="Add to current video">
                                <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                    if (templateInput.trim()) {
                                        createTemplateMutation.mutate(templateInput.trim());
                                        setTemplateInput('');
                                    }
                                }}
                                title="Save to my Library"
                                disabled={!templateInput.trim() || createTemplateMutation.isPending}
                            >
                                <Bookmark className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* User Library Templates */}
                        {userTemplates && userTemplates.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">My Saved Templates</p>
                                <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto custom-scrollbar">
                                    {userTemplates.map((t) => {
                                        const isAdded = settings.reply_templates.includes(t.template_text);
                                        return (
                                            <div key={t.id} className="flex gap-1 group">
                                                <button
                                                    onClick={() => {
                                                        if (!isAdded) {
                                                            setSettings({
                                                                ...settings,
                                                                reply_templates: [...settings.reply_templates, t.template_text]
                                                            });
                                                        }
                                                    }}
                                                    disabled={isAdded}
                                                    className={`flex-1 text-left p-2.5 rounded-lg text-xs transition-all border border-transparent flex items-center justify-between ${isAdded
                                                        ? 'bg-green-500/5 text-green-500 border-green-500/10 opacity-50 cursor-default'
                                                        : 'bg-white/[0.02] text-[#A1A1AA] hover:bg-white/5 hover:text-white hover:border-white/5'
                                                        }`}
                                                >
                                                    <span className="truncate mr-2">{t.template_text}</span>
                                                    {isAdded && <Check className="w-3 h-3 flex-shrink-0" />}
                                                </button>
                                                <button
                                                    onClick={() => deleteTemplateMutation.mutate(t.id)}
                                                    className="p-2 rounded-lg text-[#52525B] hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Remove from library"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Suggested Templates - Collapsible */}
                        <div className="space-y-2">
                            <details className="group">
                                <summary className="cursor-pointer list-none">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-[#A1A1AA] hover:text-white transition-colors uppercase tracking-wider select-none">
                                        <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
                                        <span>Suggested Defaults ({DEFAULT_TEMPLATES.length})</span>
                                    </div>
                                </summary>
                                <div className="mt-2 grid grid-cols-1 gap-1 max-h-32 overflow-y-auto custom-scrollbar pl-2 border-l border-white/5">
                                    {DEFAULT_TEMPLATES.map((template, index) => {
                                        const isAdded = settings.reply_templates.some(t => t.includes(template.replace('{link}', '')));
                                        return (
                                            <button
                                                key={index}
                                                onClick={() => setEditingTemplate(template)}
                                                disabled={isAdded}
                                                className={`text-left p-2 rounded-lg text-xs transition-all border border-transparent ${isAdded
                                                    ? 'text-green-500 cursor-default opacity-50'
                                                    : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                                                    }`}
                                            >
                                                {template}
                                            </button>
                                        );
                                    })}
                                </div>
                            </details>
                        </div>

                        {/* Edit Section (if active) */}
                        {editingTemplate !== null && (
                            <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-1">
                                <div className="text-xs text-orange-400 font-medium">Customize before adding:</div>
                                <textarea
                                    value={editingTemplate}
                                    onChange={(e) => setEditingTemplate(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none text-white"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            if (editingTemplate.trim() && !settings.reply_templates.includes(editingTemplate.trim())) {
                                                setSettings({
                                                    ...settings,
                                                    reply_templates: [...settings.reply_templates, editingTemplate.trim()],
                                                });
                                            }
                                            setEditingTemplate(null);
                                        }}
                                        className="h-7 text-xs"
                                    >
                                        Add
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={() => setEditingTemplate(null)} className="h-7 text-xs">
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Active Templates List */}
                        {settings.reply_templates.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-white/5">
                                <p className="text-xs font-semibold text-white">Active for this video:</p>
                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                    {settings.reply_templates.map((template, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2 p-3 bg-[#0A0A0A] border border-white/5 rounded-lg group hover:border-white/10 transition-colors"
                                        >
                                            <span className="flex-1 text-sm text-[#EDEDED]">{template}</span>
                                            <button
                                                onClick={() => removeTemplate(template)}
                                                className="text-[#52525B] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-red-500/10 rounded"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Empty State / Warning if no templates */}
                        {settings.reply_templates.length === 0 && (
                            <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 flex flex-col items-center justify-center text-center gap-2">
                                <AlertTriangle className="w-8 h-8 text-orange-500/50" />
                                <p className="text-sm font-medium text-orange-500">No templates selected</p>
                                <p className="text-xs text-[#A1A1AA]">
                                    Please add at least 4-5 templates to enable auto-reply safely.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-white/10">
                        <Button
                            variant="secondary"
                            className="flex-1 bg-white/5 hover:bg-white/10"
                            onClick={() => setSelectedVideo(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={saveSettings}
                            isLoading={updateSettingsMutation.isPending}
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Save Settings
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Spam Warning Modal - Refined Premium Design */}
            <Modal
                isOpen={showSpamWarning}
                onClose={() => setShowSpamWarning(false)}
                title=""
                size="lg"
                noPadding
            >
                <div className="relative overflow-hidden bg-[#0A0A0A] rounded-2xl border border-white/5">
                    {/* Visual Accents */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
                    <div className="absolute -top-24 -left-24 w-48 h-48 bg-orange-500/[0.03] blur-[100px] rounded-full" />

                    <div className="flex items-start gap-8 p-10 relative">
                        {/* Left: Icon */}
                        <div className="flex-shrink-0">
                            <div className="w-14 h-14 rounded-xl bg-orange-500/[0.03] border border-orange-500/10 flex items-center justify-center relative overflow-hidden group/icon">
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover/icon:opacity-100 transition-opacity" />
                                <AlertTriangle className="w-7 h-7 text-orange-500 relative z-10" />
                            </div>
                        </div>

                        {/* Right: Content Area */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-4">
                                <h2 className="text-xl font-bold text-white tracking-tight">
                                    Few Templates Selected
                                </h2>
                                <button
                                    onClick={() => setShowSpamWarning(false)}
                                    className="p-1 -mr-2 rounded-md text-white/10 hover:text-white/40 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <p className="text-[#A1A1AA] text-sm leading-7 mb-4 max-w-[95%] font-medium">
                                This video currently has only <span className="text-orange-400 font-bold">{settings.reply_templates.length} templates</span>.
                                YouTube's automated systems detect repetitive patterns quickly. We recommend using <span className="text-white font-semibold">at least 4 to 5 unique variations</span> to maintain your account's health and avoid spam flagging.
                            </p>

                            {/* Don't Show Again - Smaller & Moved Up */}
                            <label className="flex items-center gap-2.5 cursor-pointer group/check mb-8 w-fit">
                                <div className="relative flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={dontShowWarningAgain}
                                        onChange={(e) => setDontShowWarningAgain(e.target.checked)}
                                        className="peer h-4 w-4 appearance-none rounded border border-white/10 bg-white/5 checked:bg-orange-500/10 checked:border-orange-500/50 transition-all cursor-pointer"
                                    />
                                    <Check className="absolute w-2.5 h-2.5 text-orange-500 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                                </div>
                                <span className="text-[9px] font-bold text-neutral-600 group-hover/check:text-neutral-400 transition-colors uppercase tracking-[0.1em] whitespace-nowrap">
                                    Don't show this again
                                </span>
                            </label>

                            {/* Footer Row - Buttons Swapped & Highlighted */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    onClick={proceedWithSave}
                                    disabled={updateSettingsMutation.isPending}
                                    className="h-11 px-6 rounded-lg text-sm font-semibold text-neutral-500 hover:text-neutral-300 bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
                                >
                                    I Understand
                                </button>
                                <button
                                    onClick={() => setShowSpamWarning(false)}
                                    className="h-11 px-8 rounded-lg text-sm font-bold bg-orange-500 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center gap-2 group/btn"
                                >
                                    <span>Add More Templates</span>
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

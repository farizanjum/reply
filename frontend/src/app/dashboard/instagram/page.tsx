'use client';

import { useState, useEffect, Suspense } from 'react';
import { Button, Card, Badge, Modal } from '@/components/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    RefreshCw,
    Settings,
    Play,
    MessageSquare,
    X,
    Plus,
    Check,
    AlertTriangle,
    Loader2,
    Instagram,
    Send,
    Link2,
    ExternalLink,
} from 'lucide-react';
import { VideosSkeleton } from '@/components/ui/LoadingSkeletons';
import { useSession } from '@/lib/auth-client';
import {
    getInstagramMedia,
    syncInstagramMedia,
    updateInstagramMediaSettings,
    triggerInstagramProcessing,
    getInstagramLoginUrl,
    InstagramMedia,
    InstagramMediaSettings,
} from '@/lib/instagram-api';

// Default reply templates for Instagram
const DEFAULT_REPLY_TEMPLATES = [
    "DM'ed you! 📩",
    "Check your DMs! 💬",
    "Just sent you a DM! ✨",
    "Sent to your inbox! 📬",
    "DM on the way! 🚀",
];

// Default DM template
const DEFAULT_DM_TEMPLATE = "Hey! Thanks for your interest! Here's the link you asked for: {link}";

interface ProcessingStatus {
    mediaId: number;
    status: 'processing' | 'completed' | 'error';
    progress: number;
    total_comments?: number;
    keyword_matches?: number;
    replies_sent?: number;
    dms_sent?: number;
    error?: string;
}

function InstagramMediaContent() {
    const queryClient = useQueryClient();
    const { data: session } = useSession();
    const user = session?.user as any;
    const [selectedMedia, setSelectedMedia] = useState<InstagramMedia | null>(null);
    const [settings, setSettings] = useState<InstagramMediaSettings>({
        auto_reply_enabled: false,
        keywords: [],
        reply_templates: [],
        dm_enabled: false,
        dm_template: DEFAULT_DM_TEMPLATE,
        resource_link: '',
        schedule_interval_minutes: 60,
    });
    const [keywordInput, setKeywordInput] = useState('');
    const [templateInput, setTemplateInput] = useState('');
    const [processingMedia, setProcessingMedia] = useState<Map<number, ProcessingStatus>>(new Map());

    // Success toast state
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Cooldown state
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const [showCooldownToast, setShowCooldownToast] = useState(false);

    // Cooldown timer effect
    useEffect(() => {
        if (cooldownRemaining > 0) {
            const timer = setTimeout(() => {
                setCooldownRemaining(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            setShowCooldownToast(false);
        }
    }, [cooldownRemaining]);

    // Fetch Instagram media
    const { data: mediaData, isLoading, error } = useQuery({
        queryKey: ['instagram-media'],
        queryFn: getInstagramMedia,
        staleTime: 60 * 1000,
    });

    const media = mediaData?.media || [];
    const accountConnected = mediaData?.account_connected || false;
    const account = mediaData?.account;

    // Sync mutation
    const syncMutation = useMutation({
        mutationFn: syncInstagramMedia,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['instagram-media'] });
            setSuccessMessage('Media synced from Instagram!');
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);
        },
        onError: (error: any) => {
            alert(`Sync failed: ${error.message || 'Unknown error'}`);
        },
    });

    // Update settings mutation
    const updateSettingsMutation = useMutation({
        mutationFn: async ({ mediaId, settings }: { mediaId: number; settings: InstagramMediaSettings }) => {
            await updateInstagramMediaSettings(mediaId, settings);
            return { mediaId, settings };
        },
        onSuccess: ({ settings }) => {
            queryClient.invalidateQueries({ queryKey: ['instagram-media'] });
            setSuccessMessage(`Settings saved! ${settings.keywords?.length || 0} keywords, ${settings.reply_templates?.length || 0} templates`);
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);
            setSelectedMedia(null);
        },
        onError: (error: any) => {
            console.error('Failed to save settings:', error);
            alert(`Failed to save settings: ${error.message}`);
        },
    });

    // Trigger processing mutation
    const triggerMutation = useMutation({
        mutationFn: async (mediaId: number) => {
            setProcessingMedia(prev => new Map(prev).set(mediaId, {
                mediaId,
                status: 'processing',
                progress: 0
            }));

            try {
                const response = await triggerInstagramProcessing(mediaId);

                // Mark as completed (actual results come from polling)
                setTimeout(() => {
                    setProcessingMedia(prev => new Map(prev).set(mediaId, {
                        mediaId,
                        status: 'completed',
                        progress: 100,
                    }));

                    // Clear after 10 seconds
                    setTimeout(() => {
                        setProcessingMedia(prev => {
                            const newMap = new Map(prev);
                            newMap.delete(mediaId);
                            return newMap;
                        });
                    }, 10000);
                }, 3000);

                return response;
            } catch (error: any) {
                if (error.response?.status === 429) {
                    const remaining = error.response?.data?.cooldown_remaining || 30;
                    setCooldownRemaining(remaining);
                    setShowCooldownToast(true);
                    setProcessingMedia(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(mediaId);
                        return newMap;
                    });
                    return;
                }

                setProcessingMedia(prev => new Map(prev).set(mediaId, {
                    mediaId,
                    status: 'error',
                    progress: 0,
                    error: error.message || 'Failed to process'
                }));

                setTimeout(() => {
                    setProcessingMedia(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(mediaId);
                        return newMap;
                    });
                }, 10000);

                throw error;
            }
        },
    });

    const openSettings = (media: InstagramMedia) => {
        setSelectedMedia(media);
        setSettings({
            auto_reply_enabled: media.auto_reply_enabled,
            keywords: media.keywords || [],
            reply_templates: media.reply_templates || [],
            dm_enabled: media.dm_enabled,
            dm_template: media.dm_template || DEFAULT_DM_TEMPLATE,
            resource_link: media.resource_link || '',
            schedule_interval_minutes: media.schedule_interval_minutes || 60,
        });
    };

    const addKeyword = () => {
        if (keywordInput.trim() && !settings.keywords?.includes(keywordInput.trim())) {
            setSettings({
                ...settings,
                keywords: [...(settings.keywords || []), keywordInput.trim()],
            });
            setKeywordInput('');
        }
    };

    const removeKeyword = (keyword: string) => {
        setSettings({
            ...settings,
            keywords: settings.keywords?.filter((k) => k !== keyword) || [],
        });
    };

    const addTemplate = () => {
        if (templateInput.trim() && !settings.reply_templates?.includes(templateInput.trim())) {
            setSettings({
                ...settings,
                reply_templates: [...(settings.reply_templates || []), templateInput.trim()],
            });
            setTemplateInput('');
        }
    };

    const removeTemplate = (template: string) => {
        setSettings({
            ...settings,
            reply_templates: settings.reply_templates?.filter((t) => t !== template) || [],
        });
    };

    const saveSettings = () => {
        if (selectedMedia) {
            updateSettingsMutation.mutate({
                mediaId: selectedMedia.id,
                settings,
            });
        }
    };

    const handleConnectInstagram = () => {
        // Get user ID from Better Auth session
        const userId = user?.id;
        if (userId) {
            const loginUrl = getInstagramLoginUrl(userId, window.location.href);
            window.location.href = loginUrl;
        } else {
            alert('Please log in first to connect Instagram');
        }
    };

    // Not connected state
    if (!isLoading && !accountConnected) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Instagram</h1>
                    <p className="text-gray-400">
                        Connect your Instagram Business account to automate replies
                    </p>
                </div>

                <Card variant="glass" className="text-center py-12 border-white/5 bg-white/[0.02]">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-2xl flex items-center justify-center">
                        <Instagram className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-white">Connect Instagram</h3>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        Connect your Instagram Business or Creator account to automatically reply to comments and send DMs with resource links.
                    </p>
                    <Button
                        onClick={handleConnectInstagram}
                        className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 hover:opacity-90"
                    >
                        <Instagram className="w-4 h-4 mr-2" />
                        Connect Instagram
                    </Button>
                    <p className="text-xs text-gray-500 mt-4">
                        Requires an Instagram Business or Creator account linked to a Facebook Page
                    </p>
                </Card>
            </div>
        );
    }

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

            {/* Cooldown Toast */}
            {showCooldownToast && (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className="bg-amber-500/20 backdrop-blur-md border border-amber-500/30 rounded-xl px-4 py-3 shadow-lg min-w-[280px]">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-amber-500/30 rounded-full flex items-center justify-center">
                                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                            </div>
                            <div>
                                <span className="text-amber-200 text-sm font-medium block">Cooldown Active</span>
                                <span className="text-amber-300/70 text-xs">Please wait before triggering again</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${(cooldownRemaining / 30) * 100}%` }}
                                />
                            </div>
                            <span className="text-amber-400 text-xs font-mono w-8">{cooldownRemaining}s</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    {account?.profile_picture_url && (
                        <img
                            src={account.profile_picture_url}
                            alt={account.username}
                            className="w-10 h-10 rounded-full border-2 border-pink-500/30"
                        />
                    )}
                    <div>
                        <h1 className="text-3xl font-bold">Instagram</h1>
                        {account?.username && (
                            <p className="text-gray-400">@{account.username}</p>
                        )}
                    </div>
                </div>
                <Button
                    onClick={() => syncMutation.mutate()}
                    isLoading={syncMutation.isPending}
                    className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 hover:opacity-90"
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync from Instagram
                </Button>
            </div>

            {/* Media Grid */}
            {isLoading ? (
                <VideosSkeleton />
            ) : media && media.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {media.map((item) => {
                        const processingStatus = processingMedia.get(item.id);

                        return (
                            <Card key={item.id} variant="glass" className="overflow-hidden group bg-white/[0.02] backdrop-blur-sm border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all">
                                {/* Thumbnail */}
                                <div className="relative aspect-square">
                                    {item.thumbnail_url ? (
                                        <img
                                            src={item.thumbnail_url}
                                            alt={item.caption || 'Instagram post'}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-purple-600/20 via-pink-500/20 to-orange-400/20 flex items-center justify-center">
                                            <Instagram className="w-12 h-12 text-pink-400/50" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => openSettings(item)}
                                            className="backdrop-blur-md bg-white/10 hover:bg-white/20 border-white/20"
                                        >
                                            <Settings className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => triggerMutation.mutate(item.id)}
                                            disabled={!!processingStatus || cooldownRemaining > 0}
                                            className={`backdrop-blur-md border-white/20 ${cooldownRemaining > 0
                                                ? 'bg-amber-500/20 hover:bg-amber-500/30'
                                                : 'bg-white/10 hover:bg-white/20'
                                                }`}
                                        >
                                            {processingStatus ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : cooldownRemaining > 0 ? (
                                                <span className="text-xs font-mono text-amber-400">{cooldownRemaining}s</span>
                                            ) : (
                                                <Play className="w-4 h-4" />
                                            )}
                                        </Button>
                                        {item.permalink && (
                                            <a
                                                href={item.permalink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-8 h-8 rounded-lg backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>

                                    {/* Badges */}
                                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                                        {item.auto_reply_enabled && (
                                            <Badge variant="success" className="bg-green-500/20 backdrop-blur-sm border-green-500/30">
                                                Active
                                            </Badge>
                                        )}
                                        {item.dm_enabled && (
                                            <Badge className="bg-purple-500/20 backdrop-blur-sm border-purple-500/30 text-purple-300">
                                                <Send className="w-3 h-3 mr-1" />
                                                DM
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Media type badge */}
                                    {item.media_type && (
                                        <Badge className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm border-white/10 text-xs">
                                            {item.media_type === 'VIDEO' ? 'Reel' : item.media_type === 'CAROUSEL_ALBUM' ? 'Carousel' : 'Post'}
                                        </Badge>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-4 bg-gradient-to-b from-transparent to-black/20">
                                    <p className="text-sm text-gray-300 line-clamp-2 mb-2">
                                        {item.caption || 'No caption'}
                                    </p>

                                    {/* Keywords */}
                                    {item.keywords && item.keywords.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {item.keywords.slice(0, 3).map((keyword) => (
                                                <span
                                                    key={keyword}
                                                    className="px-2 py-0.5 text-xs bg-pink-500/10 backdrop-blur-sm rounded-full border border-pink-500/20 text-pink-300"
                                                >
                                                    {keyword}
                                                </span>
                                            ))}
                                            {item.keywords.length > 3 && (
                                                <span className="text-xs text-gray-400">
                                                    +{item.keywords.length - 3} more
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
                                                        <span className="text-pink-400 flex items-center gap-2">
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                            Processing...
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-white/10 rounded-full h-1.5">
                                                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
                                                    </div>
                                                </>
                                            )}
                                            {processingStatus.status === 'completed' && (
                                                <div className="text-xs flex items-center gap-2 text-green-400">
                                                    <Check className="w-3 h-3" />
                                                    <span>Processing started!</span>
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
                    <Instagram className="w-12 h-12 mx-auto mb-4 text-pink-400/50" />
                    <h3 className="text-lg font-semibold mb-2 text-white">No posts found</h3>
                    <p className="text-gray-400 mb-4">
                        Sync your posts from Instagram to get started
                    </p>
                    <Button
                        onClick={() => syncMutation.mutate()}
                        className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 hover:opacity-90"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Posts
                    </Button>
                </Card>
            )}

            {/* Settings Modal */}
            <Modal
                isOpen={!!selectedMedia}
                onClose={() => setSelectedMedia(null)}
                title="Instagram Post Settings"
                size="lg"
            >
                <div className="space-y-6">
                    {/* Auto-reply Toggle */}
                    <div className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-xl border border-white/5 transition-colors hover:border-white/10">
                        <div>
                            <h4 className="font-medium text-white">Auto-Reply</h4>
                            <p className="text-sm text-gray-400">
                                Enable automatic replies for this post
                            </p>
                        </div>
                        <button
                            onClick={() =>
                                setSettings({
                                    ...settings,
                                    auto_reply_enabled: !settings.auto_reply_enabled,
                                })
                            }
                            className={`relative w-11 h-6 rounded-full transition-all duration-300 flex items-center px-1 ${settings.auto_reply_enabled ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-pink-500/20' : 'bg-white/10'
                                }`}
                        >
                            <span
                                className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow-sm ${settings.auto_reply_enabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* DM Settings */}
                    <div className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-xl border border-white/5 transition-colors hover:border-white/10">
                        <div>
                            <h4 className="font-medium text-white flex items-center gap-2">
                                <Send className="w-4 h-4 text-purple-400" />
                                Send DM with Link
                            </h4>
                            <p className="text-sm text-gray-400">
                                Send a DM to commenters with your resource link
                            </p>
                        </div>
                        <button
                            onClick={() =>
                                setSettings({
                                    ...settings,
                                    dm_enabled: !settings.dm_enabled,
                                })
                            }
                            className={`relative w-11 h-6 rounded-full transition-all duration-300 flex items-center px-1 ${settings.dm_enabled ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-pink-500/20' : 'bg-white/10'
                                }`}
                        >
                            <span
                                className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow-sm ${settings.dm_enabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* DM Template & Resource Link (show when DM enabled) */}
                    {settings.dm_enabled && (
                        <div className="space-y-4 p-4 bg-purple-500/5 rounded-xl border border-purple-500/10">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-white">
                                    <Link2 className="w-4 h-4 inline mr-2 text-purple-400" />
                                    Resource Link
                                </label>
                                <input
                                    type="url"
                                    value={settings.resource_link || ''}
                                    onChange={(e) => setSettings({ ...settings, resource_link: e.target.value })}
                                    placeholder="https://your-link.com/resource"
                                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 placeholder:text-gray-500 text-white transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-white">DM Message Template</label>
                                <p className="text-xs text-gray-400 mb-2">Use {'{link}'} as placeholder for your resource link</p>
                                <textarea
                                    value={settings.dm_template || ''}
                                    onChange={(e) => setSettings({ ...settings, dm_template: e.target.value })}
                                    placeholder="Hey! Here's the link you asked for: {link}"
                                    rows={3}
                                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 placeholder:text-gray-500 text-white transition-all resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Schedule Interval */}
                    {settings.auto_reply_enabled && (
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4">
                            <label className="block text-sm font-medium mb-2 text-white">Auto-Reply Interval</label>
                            <p className="text-xs text-gray-400 mb-3">
                                How often should we check for new comments?
                            </p>
                            <select
                                value={settings.schedule_interval_minutes || 60}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        schedule_interval_minutes: parseInt(e.target.value),
                                    })
                                }
                                className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/50 text-white transition-all cursor-pointer"
                            >
                                <option value={5}>Every 5 minutes</option>
                                <option value={10}>Every 10 minutes</option>
                                <option value={15}>Every 15 minutes</option>
                                <option value={30}>Every 30 minutes</option>
                                <option value={60}>Every 1 hour</option>
                                <option value={120}>Every 2 hours</option>
                            </select>
                        </div>
                    )}

                    {/* Keywords */}
                    <div>
                        <label className="block text-sm font-medium mb-2 text-white">Trigger Keywords</label>
                        <p className="text-xs text-gray-400 mb-3">
                            Comments containing these keywords will trigger a reply (and DM if enabled)
                        </p>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={keywordInput}
                                onChange={(e) => setKeywordInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                                placeholder="Add keyword... (e.g., 'link', 'interested')"
                                className="flex-1 px-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/50 placeholder:text-gray-500 text-white transition-all"
                            />
                            <Button size="sm" onClick={addKeyword} className="bg-pink-500 hover:bg-pink-600">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {settings.keywords?.map((keyword) => (
                                <span
                                    key={keyword}
                                    className="flex items-center gap-1 px-3 py-1 bg-pink-500/10 border border-pink-500/20 text-pink-300 rounded-full text-sm group transition-colors hover:border-pink-500/50"
                                >
                                    {keyword}
                                    <button
                                        onClick={() => removeKeyword(keyword)}
                                        className="hover:text-red-400 transition-colors ml-1 text-pink-400/50 group-hover:text-red-400"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Reply Templates */}
                    <div>
                        <label className="block text-sm font-medium mb-2 text-white">Reply Templates</label>
                        <p className="text-xs text-gray-400 mb-3">
                            Public replies that will be posted on matching comments (e.g., "DM&apos;ed you!")
                        </p>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={templateInput}
                                onChange={(e) => setTemplateInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addTemplate()}
                                placeholder="Add reply template..."
                                className="flex-1 px-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/50 placeholder:text-gray-500 text-white transition-all"
                            />
                            <Button size="sm" onClick={addTemplate} className="bg-pink-500 hover:bg-pink-600">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Quick add default templates */}
                        {(settings.reply_templates?.length || 0) < 3 && (
                            <div className="mb-3 p-3 bg-pink-500/5 rounded-lg border border-pink-500/10">
                                <p className="text-xs text-pink-300 mb-2">Quick add suggestions:</p>
                                <div className="flex flex-wrap gap-2">
                                    {DEFAULT_REPLY_TEMPLATES.filter(t => !settings.reply_templates?.includes(t)).slice(0, 3).map((template) => (
                                        <button
                                            key={template}
                                            onClick={() => setSettings({
                                                ...settings,
                                                reply_templates: [...(settings.reply_templates || []), template]
                                            })}
                                            className="px-3 py-1 text-xs bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 rounded-full text-pink-300 transition-colors"
                                        >
                                            + {template}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            {settings.reply_templates?.map((template) => (
                                <span
                                    key={template}
                                    className="flex items-center gap-1 px-3 py-1 bg-[#0A0A0A] border border-white/10 text-white rounded-full text-sm group transition-colors hover:border-pink-500/50"
                                >
                                    {template}
                                    <button
                                        onClick={() => removeTemplate(template)}
                                        className="hover:text-red-400 transition-colors ml-1 text-gray-500 group-hover:text-red-400"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <Button variant="secondary" onClick={() => setSelectedMedia(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={saveSettings}
                            isLoading={updateSettingsMutation.isPending}
                            className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 hover:opacity-90"
                        >
                            Save Settings
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default function InstagramMediaPage() {
    return (
        <Suspense fallback={<VideosSkeleton />}>
            <InstagramMediaContent />
        </Suspense>
    );
}

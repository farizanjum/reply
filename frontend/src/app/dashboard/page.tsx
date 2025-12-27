'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi, videosApi } from '@/lib/api';
import {
    MessageSquare,
    Video,
    Zap,
    TrendingUp,
    ArrowUpRight,
    Sparkles,
    Play,
    Loader2,
    Youtube,
    X
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSession } from '@/lib/auth-client';
import { useState } from 'react';
import { DashboardSkeleton } from '@/components/ui/LoadingSkeletons';

export default function DashboardPage() {
    const { data: session } = useSession();
    const [ytBannerDismissed, setYtBannerDismissed] = useState(false);

    // Fetch analytics from new Next.js API
    const { data: analytics, isLoading: analyticsLoading } = useQuery({
        queryKey: ['youtube-analytics'],
        queryFn: async () => {
            const response = await fetch('/api/youtube/analytics');
            if (!response.ok) throw new Error('Failed to fetch analytics');
            return response.json();
        },
        staleTime: 60 * 1000, // Cache for 1 minute
    });

    // Fetch videos from new Next.js API
    const { data: videosData, isLoading: videosLoading } = useQuery({
        queryKey: ['youtube-videos'],
        queryFn: async () => {
            const response = await fetch('/api/youtube/videos');
            if (!response.ok) throw new Error('Failed to fetch videos');
            return response.json();
        },
        staleTime: 60 * 1000, // Cache for 1 minute
    });

    const videos = videosData?.videos || [];

    const stats = [
        {
            name: 'Total Replies',
            value: analytics?.total_replies || 0,
            icon: MessageSquare,
            change: '+12%',
            trend: 'up'
        },
        {
            name: 'Active Videos',
            value: videos?.filter((v: any) => v.auto_reply_enabled)?.length || 0,
            icon: Video,
            total: videos?.length || 0,
        },
        {
            name: 'Quota Used',
            value: `${analytics?.quota_used || 0}%`,
            icon: Zap,
            remaining: `${10000 - (analytics?.quota_units_used || 0)} left`,
        },
        {
            name: 'Replies Today',
            value: analytics?.replies_today || 0,
            icon: TrendingUp,
            change: '+8%',
            trend: 'up'
        },
    ];

    // Check if YouTube is connected
    // If user logged in via Google OAuth (has Google profile image), they ARE connected to YouTube
    // For email/password users, they need to explicitly connect YouTube
    const userWithExtras = session?.user as any;

    // Google OAuth users have a profile image from googleusercontent.com
    const isGoogleOAuthUser = userWithExtras?.image?.includes('googleusercontent.com');

    // YouTube is connected if: logged in via Google OAuth OR has explicit youtubeConnected flag
    const youtubeConnected = isGoogleOAuthUser || userWithExtras?.youtubeConnected === true;

    // Show skeleton while data is initially loading (but not on refetch)
    const isInitialLoading = (analyticsLoading || videosLoading) && !analytics && !videosData;

    if (isInitialLoading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="space-y-8">
            {/* YouTube Connection Banner - Only show if not connected and not dismissed */}
            {!youtubeConnected && !ytBannerDismissed && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 border-2 border-orange-500/30 p-6"
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(249,115,22,0.1),transparent_50%)]" />
                    <div className="relative flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                                <Youtube className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">Connect Your YouTube Channel</h3>
                                <p className="text-sm text-neutral-300 mb-4 max-w-2xl">
                                    You need to connect your YouTube channel to access your videos, manage auto-replies, and view analytics. This takes just a few seconds!
                                </p>
                                <Link
                                    href="/auth/connect-youtube"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                                >
                                    <Youtube className="w-4 h-4" />
                                    Connect YouTube Now
                                </Link>
                            </div>
                        </div>
                        <button
                            onClick={() => setYtBannerDismissed(true)}
                            className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-neutral-400 hover:text-white" />
                        </button>
                    </div>
                </motion.div>
            )}
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
                        Overview
                    </h1>
                    <p className="text-sm text-[#A1A1AA]">
                        Welcome back. Here's what's happening with your automation from the last 24 hours.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 text-xs font-medium bg-green-500/10 text-green-400 rounded-full border border-green-500/20 flex items-center gap-1.5 h-8">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                        System Operational
                    </span>
                    <Link
                        href="/dashboard/videos"
                        className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-lg border border-orange-500/20 text-sm font-medium transition-all h-8 shadow-[0_0_15px_rgba(249,115,22,0.15)] hover:shadow-[0_0_25px_rgba(249,115,22,0.4)]"
                    >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Manage Videos
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group relative bg-white/[0.02] border border-white/5 rounded-xl p-5 hover:bg-white/[0.04] transition-all hover:border-white/10"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-[#A1A1AA]">{stat.name}</span>
                            <stat.icon className="w-4 h-4 text-[#52525B] group-hover:text-white transition-colors" />
                        </div>

                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-white tracking-tight">
                                {analyticsLoading || videosLoading ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-[#52525B]" />
                                ) : (
                                    stat.value
                                )}
                            </span>
                            {stat.total !== undefined && (
                                <span className="text-sm text-[#52525B]">/ {stat.total}</span>
                            )}
                        </div>

                        <div className="mt-2 h-4 flex items-center">
                            {stat.change && (
                                <span className={cn(
                                    "text-xs font-medium flex items-center gap-1",
                                    stat.trend === 'up' ? "text-emerald-400" : "text-rose-400"
                                )}>
                                    {stat.trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
                                    {stat.change}
                                    <span className="text-[#52525B] font-normal">vs last week</span>
                                </span>
                            )}
                            {stat.remaining && (
                                <span className="text-xs text-[#52525B]">
                                    {stat.remaining}
                                </span>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Content Layout */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
                        <Link href="/dashboard/analytics" className="text-xs text-[#A1A1AA] hover:text-white transition">View all</Link>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden min-h-[300px]">
                        {analyticsLoading ? (
                            <div className="h-[300px] flex items-center justify-center text-[#52525B]">
                                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                Loading activity...
                            </div>
                        ) : analytics?.recent_replies?.length > 0 ? (
                            <div className="divide-y divide-white/5">
                                {analytics.recent_replies.map((reply: any, index: number) => (
                                    <div key={index} className="p-4 flex items-start gap-4 hover:bg-white/[0.02] transition-colors">
                                        <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500">
                                            <MessageSquare className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-sm font-medium text-white">
                                                    Replied to <span className="text-[#A1A1AA]">{reply.comment_author}</span>
                                                </p>
                                                <span className="text-xs text-[#52525B]">
                                                    {new Date(reply.replied_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-[#A1A1AA] line-clamp-2 leading-relaxed">
                                                {reply.reply_text}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-[300px] flex flex-col items-center justify-center text-[#52525B]">
                                <MessageSquare className="w-8 h-8 opacity-20 mb-3" />
                                <p className="text-sm">No recent replies found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions & Status */}
                <div className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
                        <div className="grid gap-3">
                            <Link
                                href="/dashboard/videos"
                                className="group flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-orange-500/20 hover:bg-orange-500/[0.03] transition-all"
                            >
                                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                    <Video className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm text-white">Configure Videos</div>
                                    <div className="text-xs text-[#52525B]">Enable auto-replies</div>
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-[#52525B] ml-auto group-hover:text-orange-500 transition-colors" />
                            </Link>

                            <Link
                                href="/dashboard/analytics"
                                className="group flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-white/20 hover:bg-white/[0.04] transition-all"
                            >
                                <div className="p-2 rounded-lg bg-white/5 text-[#A1A1AA] group-hover:text-white transition-colors">
                                    <Video className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm text-white">View Analytics</div>
                                    <div className="text-xs text-[#52525B]">Check performance</div>
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-[#52525B] ml-auto group-hover:text-white transition-colors" />
                            </Link>
                        </div>
                    </div>

                    <div className="p-5 rounded-xl bg-orange-500/5 border border-orange-500/10 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-orange-400" />
                            <h3 className="text-sm font-semibold text-white">Pro Tip</h3>
                        </div>
                        <p className="text-xs text-[#A1A1AA] leading-relaxed">
                            Using varied reply templates can increase user engagement by up to <strong className="text-orange-400">40%</strong>. Add more variations in your video settings.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper for charts if needed
function BarChart3(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
        </svg>
    )
}

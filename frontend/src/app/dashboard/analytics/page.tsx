'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { analyticsApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, MessageSquare, Zap, Loader2, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";

export default function AnalyticsPage() {
    const { data: analytics, isLoading } = useQuery({
        queryKey: ['analytics'],
        queryFn: async () => {
            const response = await analyticsApi.getAnalytics();
            return response.data;
        },
    });

    const { data: chartData } = useQuery({
        queryKey: ['chart-data'],
        queryFn: async () => {
            const response = await analyticsApi.getChartData(7);
            return response.data;
        },
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 w-48 bg-white/5 rounded mb-4" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-32 bg-white/5 rounded-2xl border border-white/5" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const stats = [
        {
            name: 'Total Replies',
            value: analytics?.total_replies || 0,
            change: '+12%',
            icon: MessageSquare,
            iconClass: 'text-orange-500',
            bgClass: 'bg-orange-500/10 border-orange-500/20'
        },
        {
            name: 'Quota Used Today',
            value: `${analytics?.quota_used || 0}%`,
            remaining: `${10000 - (analytics?.quota_units_used || 0)} units left`,
            icon: Zap,
            iconClass: 'text-amber-500',
            bgClass: 'bg-amber-500/10 border-amber-500/20'
        },
        {
            name: 'Replies This Week',
            value: analytics?.replies_this_week || 0,
            change: '+8%',
            icon: TrendingUp,
            iconClass: 'text-white',
            bgClass: 'bg-white/10 border-white/20'
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold mb-2 text-white">Analytics</h1>
                <p className="text-[#A1A1AA]">Track your auto-reply performance</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.map((stat) => (
                    <div key={stat.name} className="bg-white/[0.02] border border-white/5 rounded-xl p-6 hover:bg-white/[0.04] transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn("p-2 rounded-lg border", stat.bgClass)}>
                                <stat.icon className={cn("w-5 h-5", stat.iconClass)} />
                            </div>
                            {stat.change && (
                                <span className="text-sm text-green-500 font-medium bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                                    {stat.change}
                                </span>
                            )}
                        </div>
                        <p className="text-3xl font-bold mb-1 text-white">{stat.value}</p>
                        <p className="text-sm text-[#A1A1AA]">{stat.name}</p>
                        {stat.remaining && (
                            <p className="text-xs text-[#52525B] mt-1">{stat.remaining}</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Quota Progress */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/5">
                    <h3 className="font-semibold text-lg text-white">Daily Quota Usage</h3>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-[#A1A1AA]">
                                {analytics?.quota_units_used || 0} / 10,000 units used
                            </span>
                            <span className="text-white font-mono">
                                {analytics?.quota_used || 0}%
                            </span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-orange-600 to-amber-500 rounded-full transition-all duration-500"
                                style={{ width: `${analytics?.quota_used || 0}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between text-xs text-[#52525B]">
                            <span>Resets at midnight (Pacific Time)</span>
                            <span>~{Math.floor((10000 - (analytics?.quota_units_used || 0)) / 50)} replies remaining</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reply Activity Chart */}
            <div className="rounded-xl bg-white/[0.02] text-card-foreground">
                <div className="p-6 border-b border-white/5">
                    <h3 className="font-semibold text-lg text-white">Reply Activity (Last 7 Days)</h3>
                    <p className="text-sm text-muted-foreground">
                        Showing total replies sent automatically
                    </p>
                </div>
                <div className="p-6">
                    {chartData && chartData.length > 0 ? (
                        <div className="h-[300px] w-full">
                            <ChartContainer config={{
                                replies: {
                                    label: "Replies",
                                    color: "#f97316",
                                },
                            }} className="h-full w-full">
                                <AreaChart
                                    accessibilityLayer
                                    data={chartData.map((d: any) => ({
                                        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                                        replies: d.count
                                    }))}
                                    margin={{
                                        left: 12,
                                        right: 12,
                                        top: 12,
                                        bottom: 12
                                    }}
                                >
                                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.1)" />
                                    <XAxis
                                        dataKey="date"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                                    />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent indicator="dot" />}
                                    />
                                    <Area
                                        dataKey="replies"
                                        type="natural"
                                        fill="url(#fillReplies)"
                                        fillOpacity={0.4}
                                        stroke="var(--color-replies)"
                                        strokeWidth={2}
                                    />
                                    <defs>
                                        <linearGradient id="fillReplies" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-replies)" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="var(--color-replies)" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                </AreaChart>
                            </ChartContainer>
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-[#52525B]">
                            <div className="text-center">
                                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>No data yet</p>
                                <p className="text-sm text-[#A1A1AA]">Chart will appear when you have replies</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Replies */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-semibold text-lg text-white">Recent Replies</h3>
                    {analytics?.recent_replies?.length > 3 && (
                        <Link
                            href="/dashboard/replies"
                            className="text-sm text-orange-500 hover:text-orange-400 transition-colors flex items-center gap-1"
                        >
                            View All
                            <ArrowUpRight className="w-4 h-4" />
                        </Link>
                    )}
                </div>
                <div className="p-0">
                    {analytics?.recent_replies?.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs bg-white/[0.02] uppercase tracking-wider text-[#52525B] border-b border-white/5">
                                        <th className="px-6 py-3 font-medium">Comment Author</th>
                                        <th className="px-6 py-3 font-medium">Reply</th>
                                        <th className="px-6 py-3 font-medium">Keyword</th>
                                        <th className="px-6 py-3 font-medium">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {analytics.recent_replies.slice(0, 3).map((reply: any, index: number) => (
                                        <tr key={index} className="text-sm hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4 text-white font-medium">{reply.comment_author}</td>
                                            <td className="px-6 py-4 text-[#A1A1AA] max-w-xs truncate">
                                                {reply.reply_text}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-white/5 border border-white/10 text-white rounded-full text-xs">
                                                    {reply.keyword_matched}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-[#52525B]">
                                                {new Date(reply.replied_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-[#52525B]">
                            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No replies yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

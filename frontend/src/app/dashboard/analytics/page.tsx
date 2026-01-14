'use client';

import { analyticsApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, TrendingDown, MessageSquare, Zap, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    CustomGradientBar,
} from "@/components/ui/bar-chart";
import { useState, useEffect, useMemo } from 'react';

// Time period options
const TIME_PERIODS = [
    { label: '7 Days', value: 7 },
    { label: '30 Days', value: 30 },
    { label: 'All Time', value: 0 },
] as const;

// Countdown timer hook
function useCountdown(targetDate: string | null) {
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [localResetTime, setLocalResetTime] = useState<string>('');

    useEffect(() => {
        if (!targetDate) return;

        const target = new Date(targetDate);

        // Format local time
        const formatter = new Intl.DateTimeFormat(undefined, {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZoneName: 'short'
        });

        // Check if it's today or tomorrow
        const now = new Date();
        const isToday = target.toDateString() === now.toDateString();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = target.toDateString() === tomorrow.toDateString();

        const prefix = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : target.toLocaleDateString();
        setLocalResetTime(`${prefix} at ${formatter.format(target)}`);

        const updateCountdown = () => {
            const now = new Date().getTime();
            const distance = target.getTime() - now;

            if (distance < 0) {
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
                return;
            }

            const hours = Math.floor(distance / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setTimeLeft({ hours, minutes, seconds });
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    return { timeLeft, localResetTime };
}

export default function AnalyticsPage() {
    const [selectedPeriod, setSelectedPeriod] = useState<number>(7);

    const { data: analytics, isLoading } = useQuery({
        queryKey: ['analytics'],
        queryFn: async () => {
            const response = await analyticsApi.getAnalytics();
            return response.data;
        },
    });

    const { data: chartResponse, isLoading: chartLoading } = useQuery({
        queryKey: ['chart-data', selectedPeriod],
        queryFn: async () => {
            const response = await analyticsApi.getChartData(selectedPeriod);
            return response.data;
        },
    });

    // Extract chart data and comparison from new API response format
    const chartData = useMemo(() => {
        if (!chartResponse) return [];
        // Handle both old format (array) and new format (object with data property)
        return Array.isArray(chartResponse) ? chartResponse : (chartResponse.data || []);
    }, [chartResponse]);

    const comparison = useMemo(() => {
        if (!chartResponse || Array.isArray(chartResponse)) return null;
        return chartResponse.comparison || null;
    }, [chartResponse]);

    // Countdown timer
    const { timeLeft, localResetTime } = useCountdown(analytics?.quota_reset_at || null);
    const isUrgent = timeLeft.hours < 1 && (timeLeft.minutes > 0 || timeLeft.seconds > 0);

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
            change: comparison?.change_percent,
            trend: comparison?.trend,
            icon: MessageSquare,
            iconClass: 'text-orange-500',
            bgClass: 'bg-orange-500/10 border-orange-500/20'
        },
        {
            name: 'Quota Used Today',
            value: `${analytics?.quota_used || 0}%`,
            remaining: `${analytics?.quota_remaining?.toLocaleString() || 0} units left`,
            icon: Zap,
            iconClass: 'text-amber-500',
            bgClass: 'bg-amber-500/10 border-amber-500/20'
        },
        {
            name: 'Replies This Week',
            value: analytics?.replies_this_week || 0,
            change: comparison?.change_percent,
            trend: comparison?.trend,
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
                            {stat.change !== undefined && stat.trend && (
                                <span className={cn(
                                    "text-sm font-medium px-2 py-0.5 rounded-full border flex items-center gap-1",
                                    stat.trend === 'up'
                                        ? "text-green-500 bg-green-500/10 border-green-500/20"
                                        : stat.trend === 'down'
                                            ? "text-red-500 bg-red-500/10 border-red-500/20"
                                            : "text-gray-500 bg-gray-500/10 border-gray-500/20"
                                )}>
                                    {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : stat.trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> : null}
                                    {stat.change > 0 ? '+' : ''}{stat.change}%
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

            {/* Quota Progress with Countdown */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/5">
                    <h3 className="font-semibold text-lg text-white">Daily Quota Usage</h3>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-[#A1A1AA]">
                                {analytics?.quota_units_used?.toLocaleString() || 0} / {analytics?.user_daily_quota_limit?.toLocaleString() || '10,000'} units used
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

                        {/* Countdown Timer */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className={cn(
                                    "w-4 h-4",
                                    isUrgent ? "text-amber-500 animate-pulse" : "text-[#52525B]"
                                )} />
                                <span className={cn(
                                    "text-sm font-mono",
                                    isUrgent ? "text-amber-500" : "text-[#A1A1AA]"
                                )}>
                                    Resets in {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m {String(timeLeft.seconds).padStart(2, '0')}s
                                </span>
                            </div>
                            <span className="text-xs text-[#52525B]">
                                {localResetTime}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-[#52525B]">
                            <span>~{Math.floor((analytics?.quota_remaining || 0) / 50)} replies remaining</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reply Activity Chart with Period Toggle */}
            <div className="rounded-xl bg-white/[0.02] border border-white/5">
                <div className="p-6 border-b border-white/5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h3 className="font-semibold text-lg text-white">Reply Activity</h3>
                            <p className="text-sm text-muted-foreground">
                                Showing total replies sent automatically
                            </p>
                        </div>

                        {/* Period Toggle */}
                        <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                            {TIME_PERIODS.map((period) => (
                                <button
                                    key={period.value}
                                    onClick={() => setSelectedPeriod(period.value)}
                                    className={cn(
                                        "px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                                        selectedPeriod === period.value
                                            ? "bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg shadow-orange-500/20"
                                            : "text-[#A1A1AA] hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    {period.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-6">
                    {chartLoading ? (
                        <div className="h-[300px] flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : chartData && chartData.length > 0 ? (
                        <>
                            <div className="h-[300px] w-full">
                                <ChartContainer config={{
                                    replies: {
                                        label: "Replies",
                                        color: "#f97316",
                                    },
                                }} className="h-full w-full">
                                    <BarChart
                                        accessibilityLayer
                                        data={chartData.map((d: { date: string; count: number }) => ({
                                            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                                            replies: d.count
                                        }))}
                                        margin={{
                                            left: 12,
                                            right: 12,
                                            top: 12,
                                            bottom: 12
                                        }}
                                        barSize={selectedPeriod === 0 ? 8 : selectedPeriod === 30 ? 16 : 60}
                                    >
                                        <CartesianGrid
                                            vertical={false}
                                            stroke="rgba(255,255,255,0.05)"
                                            strokeDasharray="3 3"
                                        />
                                        <XAxis
                                            dataKey="date"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                                            interval={selectedPeriod === 0 ? 30 : selectedPeriod === 30 ? 4 : 0}
                                        />
                                        <ChartTooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                            content={<ChartTooltipContent hideLabel />}
                                        />
                                        <Bar
                                            shape={<CustomGradientBar dataKey="replies" fill="#f97316" />}
                                            dataKey="replies"
                                            fill="#f97316"
                                            radius={[4, 4, 0, 0]}
                                        />
                                        <defs>
                                            <linearGradient id="gradient-bar-pattern-replies" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#f97316" stopOpacity={0.6} />
                                                <stop offset="100%" stopColor="#f97316" stopOpacity={0.05} />
                                            </linearGradient>
                                        </defs>
                                    </BarChart>
                                </ChartContainer>
                            </div>

                            {/* Comparison Badge */}
                            {comparison && (
                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-[#A1A1AA]">
                                            Total: <span className="text-white font-semibold">{comparison.current_total}</span> replies
                                        </span>
                                    </div>
                                    <div className={cn(
                                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium",
                                        comparison.trend === 'up'
                                            ? "bg-green-500/10 text-green-500 border border-green-500/20"
                                            : comparison.trend === 'down'
                                                ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                                : "bg-gray-500/10 text-gray-500 border border-gray-500/20"
                                    )}>
                                        {comparison.trend === 'up' ? (
                                            <TrendingUp className="w-4 h-4" />
                                        ) : comparison.trend === 'down' ? (
                                            <TrendingDown className="w-4 h-4" />
                                        ) : null}
                                        {comparison.change_percent > 0 ? '+' : ''}{comparison.change_percent}% vs previous {selectedPeriod === 7 ? 'week' : selectedPeriod === 30 ? 'month' : 'period'}
                                    </div>
                                </div>
                            )}
                        </>
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
                <div className="p-6 border-b border-white/5">
                    <h3 className="font-semibold text-lg text-white">Recent Replies</h3>
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
                                    {analytics.recent_replies.map((reply: { comment_author: string; reply_text: string; keyword_matched: string; replied_at: string }, index: number) => (
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

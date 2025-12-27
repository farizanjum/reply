import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

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

        // Return mock analytics for now - can be enhanced later
        // Once videos API works, we can aggregate real stats
        return NextResponse.json({
            totalReplies: 0,
            activeVideos: 0,
            todayReplies: 0,
            quotaUsed: 0,
            quotaLimit: 10000,
            weeklyStats: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                values: [0, 0, 0, 0, 0, 0, 0]
            }
        });

    } catch (error: any) {
        console.error('Analytics API error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

async function getBackendToken(user: any) {
    // Generate JWT for backend auth (same as other routes)
    const jwt = require('jsonwebtoken');
    const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key-min-32-characters!!';

    return jwt.sign(
        {
            user_id: user.id,
            email: user.email,
            name: user.name,
            source: 'better_auth'
        },
        SECRET_KEY,
        { expiresIn: '24h', algorithm: 'HS256' }
    );
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

        // Get backend token for auth
        const backendToken = await getBackendToken(session.user);

        // Fetch real analytics from backend
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const response = await fetch(`${BACKEND_URL}/api/analytics/`, {
            headers: {
                'Authorization': `Bearer ${backendToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
        }

        const data = await response.json();

        // Return analytics data
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Analytics API error:', error);
        // Return empty analytics on error (graceful degradation)
        return NextResponse.json({
            total_replies: 0,
            replies_today: 0,
            replies_this_week: 0,
            quota_used: 0,
            quota_units_used: 0,
            recent_replies: []
        });
    }
}

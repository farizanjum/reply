import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

async function getBackendToken(user: any) {
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
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const backendToken = await getBackendToken(session.user);

        // Get days parameter
        const { searchParams } = new URL(request.url);
        const days = searchParams.get('days') || '7';

        // Fetch chart data from backend
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const response = await fetch(`${BACKEND_URL}/api/analytics/chart?days=${days}`, {
            headers: {
                'Authorization': `Bearer ${backendToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Chart API error:', error);
        // Return empty array on error
        return NextResponse.json([]);
    }
}

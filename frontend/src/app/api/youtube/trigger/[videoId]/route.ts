import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const BACKEND_SECRET = process.env.BACKEND_SECRET_KEY || process.env.SECRET_KEY || 'dev-secret-key-change-in-production';

async function getBackendToken(user: any) {
    return jwt.sign(
        {
            user_id: user.id,
            email: user.email,
            name: user.name,
            source: 'better_auth',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
        },
        BACKEND_SECRET,
        { algorithm: 'HS256' }
    );
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ videoId: string }> }
) {
    try {
        const { videoId } = await params;

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

        // Generate fresh backend token
        const backendToken = await getBackendToken(session.user);

        // Call backend trigger-reply endpoint
        const response = await fetch(`${BACKEND_URL}/api/videos/${videoId}/trigger-reply`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${backendToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Trigger reply API error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to trigger reply' },
            { status: 500 }
        );
    }
}

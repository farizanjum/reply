import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

// Get backend token if available
async function getBackendToken(): Promise<string | null> {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user?.id) return null;

        // Generate JWT using the same logic as /api/backend/token
        const jwt = require('jsonwebtoken');
        const BACKEND_SECRET = process.env.BACKEND_SECRET_KEY || process.env.SECRET_KEY || 'dev-secret-key-change-in-production';

        const token = jwt.sign(
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

        return token;
    } catch (e) {
        console.error('Failed to generate backend token:', e);
        return null;
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ videoId: string }> }
) {
    try {
        const { videoId } = await params;

        // Get backend token
        const token = await getBackendToken();

        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Fetch settings from Python backend
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/api/videos/${videoId}/settings`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            // If video not found in backend, return default settings
            if (response.status === 404) {
                return NextResponse.json({
                    auto_reply_enabled: false,
                    keywords: [],
                    reply_templates: [],
                    schedule_type: 'hourly',
                    schedule_interval_minutes: 60
                });
            }
            throw new Error(`Backend error: ${response.status}`);
        }

        const settings = await response.json();
        return NextResponse.json(settings);

    } catch (error: any) {
        console.error('Video settings API error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch settings' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ videoId: string }> }
) {
    try {
        const { videoId } = await params;
        const settings = await request.json();

        // Get backend token
        const token = await getBackendToken();

        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Send to Python backend
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/api/videos/${videoId}/settings`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Video settings save error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to save settings' },
            { status: 500 }
        );
    }
}

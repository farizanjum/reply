import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Secret key - must match Python backend's SECRET_KEY
const BACKEND_SECRET = process.env.BACKEND_SECRET_KEY || process.env.SECRET_KEY || 'dev-secret-key-change-in-production';

export async function POST(request: NextRequest) {
    try {
        // Get current Better Auth session
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized - no session' },
                { status: 401 }
            );
        }

        const user = session.user;

        // Create a JWT token compatible with Python backend
        // The Python backend expects: { user_id, email, exp }
        const token = jwt.sign(
            {
                user_id: user.id, // Better Auth user ID
                email: user.email,
                name: user.name,
                // Include a flag so backend knows this is from Better Auth
                source: 'better_auth',
                exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
            },
            BACKEND_SECRET,
            { algorithm: 'HS256' }
        );

        return NextResponse.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image
            }
        });

    } catch (error: any) {
        console.error('Backend token generation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate token' },
            { status: 500 }
        );
    }
}

// GET method to check if user has valid backend token
export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user?.id) {
            return NextResponse.json({ authenticated: false });
        }

        return NextResponse.json({
            authenticated: true,
            user: {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name
            }
        });
    } catch (error) {
        return NextResponse.json({ authenticated: false });
    }
}

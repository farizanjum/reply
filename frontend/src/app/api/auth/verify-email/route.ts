import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendWelcomeEmail } from '@/lib/email';
import { auth } from '@/lib/auth';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const { token, email } = await req.json();

        if (!token || !email) {
            return NextResponse.json(
                { error: 'Token and email are required' },
                { status: 400 }
            );
        }

        // Find the verification record
        const verification = await prisma.verification.findFirst({
            where: {
                identifier: email,
                value: token,
                expiresAt: {
                    gte: new Date(),
                },
            },
        });

        if (!verification) {
            return NextResponse.json(
                { error: 'Invalid or expired verification code' },
                { status: 400 }
            );
        }

        // Update user as verified
        const user = await prisma.user.update({
            where: { email },
            data: { emailVerified: true },
        });

        // Delete the verification record
        await prisma.verification.delete({
            where: { id: verification.id },
        });

        // Create a session for the user using Better Auth
        // This ensures user is logged in after verification
        try {
            // Get the account for this user to find their password hash (if email/password auth)
            const account = await prisma.account.findFirst({
                where: { userId: user.id, providerId: 'credential' }
            });

            if (account) {
                // Create session directly in the database
                const sessionToken = crypto.randomUUID();
                const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

                await prisma.session.create({
                    data: {
                        id: crypto.randomUUID(),
                        userId: user.id,
                        token: sessionToken,
                        expiresAt,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }
                });

                // Set the session cookie
                const response = NextResponse.json({
                    success: true,
                    message: 'Email verified successfully',
                    userId: user.id,
                });

                // Set the auth cookie (Better Auth uses this cookie name)
                response.cookies.set('better-auth.session_token', sessionToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    path: '/',
                    expires: expiresAt,
                });

                // Send welcome email
                await sendWelcomeEmail(user.email, user.name || undefined, false);

                return response;
            }
        } catch (sessionError) {
            console.error('Session creation error:', sessionError);
            // Continue without session - user will need to log in
        }

        // Fallback: Send welcome email even if session creation fails
        await sendWelcomeEmail(user.email, user.name || undefined, false);

        return NextResponse.json({
            success: true,
            message: 'Email verified successfully',
        });
    } catch (error) {
        console.error('Email verification error:', error);
        return NextResponse.json(
            { error: 'Verification failed' },
            { status: 500 }
        );
    }
}


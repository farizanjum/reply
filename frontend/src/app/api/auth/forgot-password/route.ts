import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email },
        });

        // Always return success to prevent email enumeration
        // (Don't tell attackers if an email exists or not)
        if (!user) {
            return NextResponse.json({
                success: true,
                message: 'If that email exists, a password reset link has been sent.',
            });
        }

        // Generate secure reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Store reset token
        await prisma.verification.create({
            data: {
                identifier: email,
                value: resetToken,
                expiresAt,
            },
        });

        // Create reset URL
        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

        // Send password reset email
        const result = await sendPasswordResetEmail(email, resetUrl);

        if (!result.success) {
            console.error('Failed to send password reset email');
        }

        return NextResponse.json({
            success: true,
            message: 'If that email exists, a password reset link has been sent.',
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { error: 'Failed to process request' },
            { status: 500 }
        );
    }
}

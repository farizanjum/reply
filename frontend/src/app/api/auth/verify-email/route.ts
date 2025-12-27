import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendWelcomeEmail } from '@/lib/email';

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
        await prisma.user.update({
            where: { email },
            data: { emailVerified: true },
        });

        // Delete the verification record
        await prisma.verification.delete({
            where: { id: verification.id },
        });

        // Send welcome email
        const user = await prisma.user.findUnique({
            where: { email },
            select: { name: true, email: true },
        });

        if (user) {
            await sendWelcomeEmail(user.email, user.name || undefined);
        }

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

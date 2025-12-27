import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendOTPEmail } from '@/lib/email';

const prisma = new PrismaClient();

// Generate 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in database
        await prisma.verification.create({
            data: {
                identifier: email,
                value: otp,
                expiresAt,
            },
        });

        // Send OTP email
        const result = await sendOTPEmail(email, otp);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Failed to send OTP email' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'OTP sent successfully',
        });
    } catch (error) {
        console.error('Send OTP error:', error);
        return NextResponse.json(
            { error: 'Failed to send OTP' },
            { status: 500 }
        );
    }
}

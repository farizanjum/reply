import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendOTPEmail } from '@/lib/email';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Generate 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
    try {
        const { email, password, name } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            // If user exists and is verified, they need to login instead
            if (existingUser.emailVerified) {
                return NextResponse.json(
                    { error: 'User already exists. Please sign in instead.' },
                    { status: 400 }
                );
            }

            // If user exists but is NOT verified, delete the old account and let them re-register
            // This handles the case where someone started signup but never verified

            // Delete the unverified user and their associated data
            await prisma.user.delete({
                where: { id: existingUser.id },
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user with emailVerified: false
        const user = await prisma.user.create({
            data: {
                email,
                name: name || email.split('@')[0],
                emailVerified: false,
            },
        });

        // Create account record with hashed password
        await prisma.account.create({
            data: {
                userId: user.id,
                accountId: email,
                providerId: 'credential',
                password: hashedPassword,
            },
        });

        // Generate and send OTP
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
            // If email fails, delete the user we just created
            await prisma.user.delete({ where: { id: user.id } });
            return NextResponse.json(
                { error: 'Failed to send verification email. Please try again.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Account created. Please check your email for verification code.',
            email: user.email,
        });
    } catch (error: any) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create account' },
            { status: 500 }
        );
    }
}

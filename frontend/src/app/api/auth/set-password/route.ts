import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        // Get session using Better Auth
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { newPassword, currentPassword } = await req.json();

        if (!newPassword) {
            return NextResponse.json(
                { error: 'New password required' },
                { status: 400 }
            );
        }

        // Validate password length
        if (newPassword.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters' },
                { status: 400 }
            );
        }

        // Get user with current delegation password
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { delegationPassword: true },
        });

        // If user already has a password, require current password for re-auth
        if (user?.delegationPassword) {
            if (!currentPassword) {
                return NextResponse.json(
                    { error: 'Current password required to change password' },
                    { status: 400 }
                );
            }

            const isValid = await bcrypt.compare(currentPassword, user.delegationPassword);
            if (!isValid) {
                return NextResponse.json(
                    { error: 'Current password is incorrect' },
                    { status: 401 }
                );
            }
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update user with new delegation password
        await prisma.user.update({
            where: { id: session.user.id },
            data: { delegationPassword: hashedPassword },
        });

        return NextResponse.json({
            success: true,
            message: user?.delegationPassword
                ? 'Delegation password updated successfully'
                : 'Delegation password set successfully',
        });
    } catch (error) {
        console.error('Set password error:', error);
        return NextResponse.json(
            { error: 'Failed to set password' },
            { status: 500 }
        );
    }
}

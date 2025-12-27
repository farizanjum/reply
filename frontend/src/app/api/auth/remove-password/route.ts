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

        const { password } = await req.json();

        if (!password) {
            return NextResponse.json(
                { error: 'Password required for verification' },
                { status: 400 }
            );
        }

        // Get user with delegation password
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { delegationPassword: true },
        });

        // Check if user has password set
        if (!user?.delegationPassword) {
            return NextResponse.json(
                { error: 'No delegation password to remove' },
                { status: 400 }
            );
        }

        // Verify password before removal
        const isValid = await bcrypt.compare(password, user.delegationPassword);
        if (!isValid) {
            return NextResponse.json(
                { error: 'Incorrect password' },
                { status: 401 }
            );
        }

        // Remove delegation password
        await prisma.user.update({
            where: { id: session.user.id },
            data: { delegationPassword: null },
        });

        return NextResponse.json({
            success: true,
            message: 'Delegation password removed successfully. Delegated access has been revoked.',
        });
    } catch (error) {
        console.error('Remove password error:', error);
        return NextResponse.json(
            { error: 'Failed to remove password' },
            { status: 500 }
        );
    }
}

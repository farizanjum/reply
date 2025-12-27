import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        // Get session using Better Auth
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user has delegation password set
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { delegationPassword: true },
        });

        return NextResponse.json({
            hasPassword: !!user?.delegationPassword,
        });
    } catch (error) {
        console.error('Check password status error:', error);
        return NextResponse.json(
            { error: 'Failed to check password status' },
            { status: 500 }
        );
    }
}

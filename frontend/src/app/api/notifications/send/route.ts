import { NextRequest, NextResponse } from 'next/server';
import { sendQuotaWarningEmail, sendErrorAlertEmail } from '@/lib/email';

// Secret key for backend-to-frontend communication
const NOTIFICATION_SECRET = process.env.NOTIFICATION_SECRET || 'dev-notification-secret';

export async function POST(request: NextRequest) {
    try {
        // Verify secret key
        const authHeader = request.headers.get('x-notification-secret');
        if (authHeader !== NOTIFICATION_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { type, email, ...data } = body;

        if (!type || !email) {
            return NextResponse.json({ error: 'Missing type or email' }, { status: 400 });
        }

        let result;

        switch (type) {
            case 'quota_warning':
                const { usagePercent, quotaUsed, quotaLimit, resetTime } = data;
                if (usagePercent === undefined || quotaUsed === undefined || quotaLimit === undefined) {
                    return NextResponse.json({ error: 'Missing quota data' }, { status: 400 });
                }
                result = await sendQuotaWarningEmail(
                    email,
                    usagePercent,
                    quotaUsed,
                    quotaLimit,
                    resetTime || 'at midnight PT'
                );
                break;

            case 'error_alert':
                const { errorMessage, videoId, videoTitle } = data;
                if (!errorMessage) {
                    return NextResponse.json({ error: 'Missing errorMessage' }, { status: 400 });
                }
                result = await sendErrorAlertEmail(email, errorMessage, videoId, videoTitle);
                break;

            default:
                return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 });
        }

        if (result.success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Failed to send email', details: result.error }, { status: 500 });
        }
    } catch (error) {
        console.error('Notification send error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

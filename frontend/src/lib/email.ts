import { Unosend } from '@unosend/node';
import { generateOTPEmail, generateWelcomeEmail, generatePasswordResetEmail, generateQuotaWarningEmail, generateErrorAlertEmail } from './email-templates';

// Initialize Unosend client only if API key is available
const unosend = process.env.UNOSEND_API_KEY
    ? new Unosend(process.env.UNOSEND_API_KEY)
    : null;

// Email addresses
const VERIFY_EMAIL = 'verify@tryreply.app';
const WELCOME_EMAIL = 'farizanjum@tryreply.app';
const ALERTS_EMAIL = 'alerts@tryreply.app';

// Verify email connection (Unosend doesn't require verification)
export async function verifyEmailConnection() {

    return true;
}

// Send OTP verification email
export async function sendOTPEmail(email: string, otp: string) {
    try {
        if (!unosend) {
            console.warn('Email service not configured (UNOSEND_API_KEY missing)');
            return { success: false, error: 'Email service not configured' };
        }
        const html = generateOTPEmail(otp, email);

        const { data, error } = await unosend.emails.send({
            from: `reply. <${VERIFY_EMAIL}>`,
            to: email,
            subject: 'Verify your email - reply.',
            html,
        });

        if (error) {
            console.error('Failed to send OTP email:', error.message);
            return { success: false, error };
        }

        return { success: true };
    } catch (error) {
        console.error('Failed to send OTP email:', error);
        return { success: false, error };
    }
}

// Send welcome email
export async function sendWelcomeEmail(email: string, name?: string, isYouTubeConnected?: boolean) {
    try {
        if (!unosend) {
            console.warn('Email service not configured (UNOSEND_API_KEY missing)');
            return { success: false, error: 'Email service not configured' };
        }
        const html = generateWelcomeEmail(name || email.split('@')[0], isYouTubeConnected || false);

        const { data, error } = await unosend.emails.send({
            from: `Fariz from reply. <${WELCOME_EMAIL}>`,
            to: email,
            subject: 'Welcome to reply.',
            html,
        });

        if (error) {
            console.error('Failed to send welcome email:', error.message);
            return { success: false, error };
        }

        return { success: true };
    } catch (error) {
        console.error('Failed to send welcome email:', error);
        return { success: false, error };
    }
}

// Send password reset email
export async function sendPasswordResetEmail(email: string, resetUrl: string) {
    try {
        if (!unosend) {
            console.warn('Email service not configured (UNOSEND_API_KEY missing)');
            return { success: false, error: 'Email service not configured' };
        }
        const html = generatePasswordResetEmail(resetUrl, email);

        const { data, error } = await unosend.emails.send({
            from: `reply. <${VERIFY_EMAIL}>`,
            to: email,
            subject: 'Reset your password - reply.',
            html,
        });

        if (error) {
            console.error('Failed to send password reset email:', error.message);
            return { success: false, error };
        }

        return { success: true };
    } catch (error) {
        console.error('Failed to send password reset email:', error);
        return { success: false, error };
    }
}

// Send quota warning email
export async function sendQuotaWarningEmail(
    email: string,
    usagePercent: number,
    quotaUsed: number,
    quotaLimit: number,
    resetTime: string
) {
    try {
        if (!unosend) {
            console.warn('Email service not configured (UNOSEND_API_KEY missing)');
            return { success: false, error: 'Email service not configured' };
        }
        const html = generateQuotaWarningEmail(usagePercent, quotaUsed, quotaLimit, resetTime);

        const { data, error } = await unosend.emails.send({
            from: `reply. Alerts <${ALERTS_EMAIL}>`,
            to: email,
            subject: `⚠️ ${usagePercent}% quota used - reply.`,
            html,
        });

        if (error) {
            console.error('Failed to send quota warning email:', error.message);
            return { success: false, error };
        }

        return { success: true };
    } catch (error) {
        console.error('Failed to send quota warning email:', error);
        return { success: false, error };
    }
}

// Send error alert email
export async function sendErrorAlertEmail(
    email: string,
    errorMessage: string,
    videoId?: string,
    videoTitle?: string
) {
    try {
        if (!unosend) {
            console.warn('Email service not configured (UNOSEND_API_KEY missing)');
            return { success: false, error: 'Email service not configured' };
        }
        const html = generateErrorAlertEmail(errorMessage, videoId, videoTitle);

        const { data, error } = await unosend.emails.send({
            from: `reply. Alerts <${ALERTS_EMAIL}>`,
            to: email,
            subject: '🚨 Processing error - reply.',
            html,
        });

        if (error) {
            console.error('Failed to send error alert email:', error.message);
            return { success: false, error };
        }

        return { success: true };
    } catch (error) {
        console.error('Failed to send error alert email:', error);
        return { success: false, error };
    }
}


import { NextResponse } from 'next/server';

// Force dynamic - never cache health checks
export const dynamic = 'force-dynamic';

export async function GET() {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
        const response = await fetch(`${BACKEND_URL}/health`, {
            signal: controller.signal,
            cache: 'no-store',
        });

        if (!response.ok) {
            return NextResponse.json({ status: 'down' });
        }

        const data = await response.json();

        // Explicit check for critical services we control
        // Don't use Object.values to avoid false positives from config flags
        const postgresHealthy = data.postgres !== false;
        const redisHealthy = data.redis !== false;
        const backendHealthy = data.status === 'healthy';

        // Determine overall status
        let status: 'healthy' | 'degraded' | 'down';
        if (backendHealthy && postgresHealthy && redisHealthy) {
            status = 'healthy';
        } else if (!postgresHealthy || !redisHealthy) {
            status = 'degraded';
        } else {
            status = 'degraded';
        }

        // Sanitized response - don't expose internal architecture
        return NextResponse.json({ status });

    } catch (error: any) {
        // AbortError (timeout) or network error = system down
        return NextResponse.json({ status: 'down' });
    } finally {
        clearTimeout(timeoutId);
    }
}

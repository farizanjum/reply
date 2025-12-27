'use client';

import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { Loader2, X } from 'lucide-react';

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setAuth } = useAuthStore();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            const token = searchParams.get('token');
            const errorParam = searchParams.get('error');

            if (errorParam) {
                setError(errorParam);
                return;
            }

            if (!token) {
                setError('No token received');
                return;
            }

            try {
                // Store the token first
                localStorage.setItem('token', token);

                // Fetch user info with explicit token in header
                const response = await authApi.getMe(token);
                const user = response.data;

                // Update auth store
                setAuth(user, token);

                // Redirect to dashboard
                router.push('/dashboard');
            } catch (err) {
                console.error('Auth callback error:', err);
                setError('Failed to authenticate. Please try again.');
            }
        };

        handleCallback();
    }, [searchParams, setAuth, router]);

    if (error) {
        return (
            <div className="min-h-screen bg-[#050505] text-[#EDEDED] flex items-center justify-center p-6 relative overflow-hidden">
                {/* Background Decor */}
                <div className="fixed inset-0 z-0 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.1] pointer-events-none" />
                <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/5 blur-[120px] rounded-full" />

                <div className="relative z-10 text-center max-w-md w-full p-10 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl">
                    <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <X className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">Authentication Error</h1>
                    <p className="text-[#A1A1AA] mb-8 font-medium leading-relaxed">{error}</p>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all w-full"
                    >
                        Return to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-[#EDEDED] flex items-center justify-center relative overflow-hidden">
            {/* Background Decor */}
            <div className="fixed inset-0 z-0 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.1] pointer-events-none" />
            <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/5 blur-[120px] rounded-full" />

            <div className="relative z-10 text-center">
                <div className="relative mb-8">
                    <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto relative z-10" />
                    <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">reply.</h1>
                <p className="text-[#A1A1AA] text-sm font-medium">Authenticating your account...</p>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}

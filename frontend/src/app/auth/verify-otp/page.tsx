'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CheckCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { CardSpotlight, GlassButton, Tiles } from '@/components/auth/AuthComponents';
import '@/components/auth/auth.css';

function VerifyOTPContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isVerified, setIsVerified] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Focus first input on mount
    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    // Handle OTP input change
    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Only allow digits

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1); // Only take last digit
        setOtp(newOtp);
        setError(null);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    // Handle backspace
    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    // Handle paste
    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pastedData.length === 6) {
            setOtp(pastedData.split(''));
            inputRefs.current[5]?.focus();
        }
    };

    // Verify OTP
    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length !== 6) {
            setError('Please enter the complete 6-digit code');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Call Better Auth verification endpoint
            const response = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: code, email }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Verification failed');
            }

            setIsVerified(true);

            // Redirect to YouTube connection after short delay
            setTimeout(() => {
                router.push('/auth/connect-youtube');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Invalid or expired code. Please try again.');
            setIsLoading(false);
        }
    };

    // Resend OTP
    const handleResend = async () => {
        setIsResending(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                throw new Error('Failed to resend code');
            }

            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } catch (err: any) {
            setError('Failed to resend code. Please try again.');
        } finally {
            setIsResending(false);
        }
    };

    // Success State
    if (isVerified) {
        return (
            <div className="min-h-screen w-full bg-[#050505] text-white flex items-center justify-center relative overflow-hidden font-sans selection:bg-orange-500/30">
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-auto">
                    <div className="absolute inset-0 top-[-10%] scale-[1.2] opacity-40">
                        <Tiles rows={40} cols={20} tileSize="lg" className="w-full h-full" tileClassName="border-neutral-900/80" />
                    </div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_100%)] pointer-events-none" />
                </div>

                <div className="w-full max-w-md mx-4 z-10 relative">
                    <CardSpotlight className="w-full shadow-[0_0_50px_-10px_rgba(0,0,0,0.8)] border border-white/10 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-8 flex flex-col items-center justify-center text-center"
                        >
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Email Verified!</h2>
                            <p className="text-neutral-400 max-w-[280px]">
                                Redirecting you to connect your YouTube account...
                            </p>
                            <div className="mt-6">
                                <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                            </div>
                        </motion.div>
                    </CardSpotlight>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-[#050505] text-white flex items-center justify-center relative overflow-hidden font-sans selection:bg-orange-500/30">
            {/* Background */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-auto">
                <div className="absolute inset-0 top-[-10%] scale-[1.2] opacity-40">
                    <Tiles rows={40} cols={20} tileSize="lg" className="w-full h-full" tileClassName="border-neutral-900/80" />
                </div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_100%)] pointer-events-none" />
            </div>

            {/* Main Content */}
            <div className="w-full max-w-md mx-4 z-10 relative">
                <CardSpotlight className="w-full shadow-[0_0_50px_-10px_rgba(0,0,0,0.8)] border border-white/10 bg-black/80 backdrop-blur-sm">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6">
                            <a href="https://www.tryreply.app" target="_blank" rel="noopener noreferrer">
                                <img src="/reply_logo.jpg" alt="reply." className="w-14 h-14 rounded-2xl cursor-pointer hover:opacity-80 transition-opacity" />
                            </a>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                            Verify your email
                        </h1>
                        <p className="text-sm text-neutral-400">
                            Enter the 6-digit code sent to{' '}
                            <span className="text-white font-medium">{email}</span>
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center"
                        >
                            {error}
                        </motion.div>
                    )}

                    {/* OTP Input */}
                    <div className="flex justify-center gap-3 mb-8" onPaste={handlePaste}>
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => { inputRefs.current[index] = el; }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className="w-12 h-14 bg-neutral-900/50 border border-white/10 rounded-xl text-center text-xl font-bold text-white outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all duration-300"
                            />
                        ))}
                    </div>

                    {/* Verify Button */}
                    <GlassButton
                        onClick={handleVerify}
                        disabled={isLoading || otp.join('').length !== 6}
                        size="lg"
                        variant="orange"
                        className="w-full mb-6"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                Verify Email
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </GlassButton>

                    {/* Resend */}
                    <div className="text-center">
                        <p className="text-xs text-neutral-500 mb-2">Didn&apos;t receive the code?</p>
                        <button
                            onClick={handleResend}
                            disabled={isResending}
                            className="text-sm text-orange-500 hover:text-orange-400 transition-colors inline-flex items-center gap-2"
                        >
                            {isResending ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4" />
                            )}
                            Resend code
                        </button>
                    </div>
                </CardSpotlight>
            </div>
        </div>
    );
}

export default function VerifyOTPPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen w-full bg-[#050505] flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            </div>
        }>
            <VerifyOTPContent />
        </Suspense>
    );
}

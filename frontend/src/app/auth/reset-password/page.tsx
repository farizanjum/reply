'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Mail, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { CardSpotlight, GlassButton, Tiles } from '@/components/auth/AuthComponents';
import '@/components/auth/auth.css';

export default function ResetPasswordPage() {
    const [step, setStep] = useState<'request' | 'success'>('request');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Request password reset
    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to send reset email');
            }

            setStep('success');
        } catch (err: any) {
            setError(err.message || 'An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Success State
    if (step === 'success') {
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
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="py-8 flex flex-col items-center justify-center text-center"
                        >
                            <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
                                <Mail className="w-8 h-8 text-orange-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
                            <p className="text-neutral-400 max-w-[280px] mb-6">
                                We sent a password reset link to{' '}
                                <span className="text-white font-medium">{email}</span>
                            </p>
                            <Link href="/auth/login">
                                <GlassButton size="default" variant="default" className="w-full max-w-[200px]">
                                    Back to Sign In
                                </GlassButton>
                            </Link>
                            <button
                                onClick={() => { setStep('request'); setEmail(''); }}
                                className="mt-4 text-sm text-neutral-500 hover:text-white transition-colors"
                            >
                                Try a different email
                            </button>
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
                            Reset password
                        </h1>
                        <p className="text-sm text-neutral-400">
                            Enter your email and we&apos;ll send you a reset link
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

                    {/* Form */}
                    <form onSubmit={handleRequestReset} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-neutral-400 ml-1">Email address</label>
                            <div className="relative group/input">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within/input:text-orange-400 transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    spellCheck="false"
                                    className="w-full bg-neutral-900/50 border border-white/10 rounded-xl px-10 py-3 outline-none text-sm text-white placeholder:text-neutral-600 focus:bg-neutral-900 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all duration-300"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <GlassButton
                                type="submit"
                                disabled={isLoading}
                                size="lg"
                                variant="orange"
                                className="w-full"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Send Reset Link
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </GlassButton>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <Link
                            href="/auth/login"
                            className="text-sm text-neutral-500 hover:text-white transition-colors"
                        >
                            ← Back to Sign In
                        </Link>
                    </div>
                </CardSpotlight>
            </div>
        </div>
    );
}

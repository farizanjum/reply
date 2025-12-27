'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Mail, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { signUp } from '@/lib/auth-client';
import { CardSpotlight, ShimmerButton, GlassButton, Tiles } from '@/components/auth/AuthComponents';
import '@/components/auth/auth.css';

export default function SignUpPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    // Handle Email/Password Sign Up
    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setAuthError(null);

        try {
            // Use our custom secure signup API that handles unverified accounts
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    name: email.split('@')[0],
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setAuthError(getErrorMessage(data.error || 'Sign up failed'));
                setIsLoading(false);
                return;
            }

            // Success - OTP email already sent by the API
            setIsLoading(false);
            setIsSuccess(true);
        } catch (error: any) {
            setAuthError(getErrorMessage(error.message || 'An unexpected error occurred'));
            setIsLoading(false);
        }
    };

    // Handle Google OAuth
    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        setAuthError(null);

        try {
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
            const { signIn } = await import('@/lib/auth-client');
            await signIn.social({
                provider: 'google',
                callbackURL: `${baseUrl}/dashboard`,
            });
        } catch (error: any) {
            setAuthError(error.message || 'Failed to sign in with Google');
            setIsGoogleLoading(false);
        }
    };

    // Error message helper
    const getErrorMessage = (errorMessage: string) => {
        const errorMap: Record<string, string> = {
            'password should be at least 6 characters': 'Password must be at least 6 characters long.',
            'password should be at least 8 characters': 'Password must be at least 8 characters long.',
            'user already registered': 'This email is already registered. Please sign in instead.',
            'email already exists': 'This email is already registered. Please sign in instead.',
            'invalid email': 'Please enter a valid email address.',
        };

        const lowerMessage = errorMessage.toLowerCase();
        for (const [key, value] of Object.entries(errorMap)) {
            if (lowerMessage.includes(key)) {
                return value;
            }
        }
        return errorMessage;
    };

    // Success State
    if (isSuccess) {
        return (
            <div className="min-h-screen w-full bg-[#050505] text-white flex items-center justify-center relative overflow-hidden font-sans selection:bg-orange-500/30">
                {/* Background */}
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
                                <CheckCircle className="w-8 h-8 text-orange-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Check your email!</h2>
                            <p className="text-neutral-400 max-w-[280px] mb-6">
                                We sent a verification code to <span className="text-white font-medium">{email}</span>. Please check your inbox.
                            </p>
                            <GlassButton
                                onClick={() => router.push('/auth/verify-otp?email=' + encodeURIComponent(email))}
                                size="default"
                                variant="orange"
                                className="w-full max-w-[200px]"
                            >
                                Enter Code
                                <ArrowRight className="w-4 h-4" />
                            </GlassButton>
                            <button
                                onClick={() => { setIsSuccess(false); setEmail(''); setPassword(''); }}
                                className="mt-6 text-sm text-neutral-500 hover:text-white transition-colors"
                            >
                                Use a different email
                            </button>
                        </motion.div>
                    </CardSpotlight>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-[#050505] text-white flex items-center justify-center relative overflow-hidden font-sans selection:bg-orange-500/30">
            {/* Dynamic Tiles Background */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-auto">
                <div className="absolute inset-0 top-[-10%] scale-[1.2] opacity-40">
                    <Tiles
                        rows={40}
                        cols={20}
                        tileSize="lg"
                        className="w-full h-full"
                        tileClassName="border-neutral-900/80"
                    />
                </div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_100%)] pointer-events-none" />
            </div>

            {/* Main Content */}
            <div className="w-full max-w-md mx-4 z-10 relative">
                <CardSpotlight className="w-full shadow-[0_0_50px_-10px_rgba(0,0,0,0.8)] border border-white/10 bg-black/80 backdrop-blur-sm">
                    {/* Header */}
                    <div className="text-center mb-8 relative">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6">
                            <a href="https://www.tryreply.app" target="_blank" rel="noopener noreferrer">
                                <img src="/reply_logo.jpg" alt="reply." className="w-14 h-14 rounded-2xl cursor-pointer hover:opacity-80 transition-opacity" />
                            </a>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                            Create an account
                        </h1>
                        <p className="text-sm text-neutral-400">
                            Join reply. and automate your YouTube engagement
                        </p>
                    </div>

                    {/* Error Message */}
                    {authError && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center"
                        >
                            {authError}
                        </motion.div>
                    )}

                    {/* Google Sign Up */}
                    <div className="mb-6">
                        <ShimmerButton
                            className="w-full shadow-lg h-12 text-sm font-medium"
                            background="rgba(20,20,20,1)"
                            shimmerColor="rgba(249, 115, 22, 0.4)"
                            shimmerDuration="2.5s"
                            onClick={handleGoogleSignIn}
                            disabled={isGoogleLoading}
                        >
                            <div className="flex items-center gap-3">
                                {isGoogleLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                )}
                                Continue with Google
                            </div>
                        </ShimmerButton>
                    </div>

                    {/* Divider */}
                    <div className="relative flex items-center justify-center mb-6">
                        <div className="h-px bg-white/10 w-full"></div>
                        <span className="absolute px-3 bg-[#0a0a0a] text-xs text-neutral-500 uppercase tracking-widest font-semibold">
                            Or via email
                        </span>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSignUp} className="space-y-4">
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

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-neutral-400 ml-1">Password</label>
                            <div className="relative group/input">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within/input:text-orange-400 transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                    className="w-full bg-neutral-900/50 border border-white/10 rounded-xl px-10 py-3 outline-none text-sm text-white placeholder:text-neutral-600 focus:bg-neutral-900 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all duration-300"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-neutral-600 ml-1 mt-1">Minimum 8 characters</p>
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
                                        Create Account
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </GlassButton>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 text-center relative z-20">
                        <p className="text-xs text-neutral-500">
                            Already have an account?{' '}
                            <Link
                                href="/auth/login"
                                className="text-white hover:underline decoration-orange-500 decoration-wavy underline-offset-4"
                            >
                                Log in
                            </Link>
                        </p>
                    </div>
                </CardSpotlight>
            </div>
        </div>
    );
}

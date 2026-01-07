'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Youtube, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSession } from '@/lib/auth-client';
import { connectYouTube } from '@/lib/youtube-connect';
import { CardSpotlight, ShimmerButton, GlassButton, Tiles } from '@/components/auth/AuthComponents';
import '@/components/auth/auth.css';

export default function ConnectYouTubePage() {
    const router = useRouter();
    const { data: session, isPending } = useSession();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Handle Google/YouTube connection using unified helper
    const handleConnectYouTube = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Use unified connect helper - includes reconnect param
            await connectYouTube('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Failed to connect YouTube. Please try again.');
            setIsLoading(false);
        }
    };

    // If already connected, redirect to dashboard
    const userWithExtras = session?.user as any;
    if (userWithExtras?.youtubeConnected) {
        router.push('/dashboard');
        return null;
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
                            Connect YouTube
                        </h1>
                        <p className="text-sm text-neutral-400">
                            Link your YouTube account to start automating replies
                        </p>
                    </div>

                    {/* Info Box */}
                    <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#FF0132] flex items-center justify-center">
                                <img src="/yt_icon_white_digital.png" alt="YouTube" className="w-5 h-5 object-contain" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white mb-1">Why connect YouTube?</p>
                                <ul className="text-xs text-neutral-400 space-y-1">
                                    <li>• Access your channel&apos;s videos and comments</li>
                                    <li>• Automatically reply to matching comments</li>
                                    <li>• Track engagement and analytics</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center flex items-center justify-center gap-2"
                        >
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </motion.div>
                    )}

                    {/* Connect Button */}
                    <ShimmerButton
                        className="w-full shadow-lg h-14 text-base font-semibold"
                        background="#FF0132"
                        shimmerColor="rgba(255, 255, 255, 0.3)"
                        shimmerDuration="2.5s"
                        onClick={handleConnectYouTube}
                        disabled={isLoading}
                    >
                        <div className="flex items-center gap-3">
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <img src="/yt_icon_white_digital.png" alt="YouTube" className="w-5 h-5 object-contain" />
                            )}
                            Connect YouTube Channel
                        </div>
                    </ShimmerButton>


                    {/* Security Note */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-neutral-500">
                            🔒 We only request permissions needed for auto-replies.
                            <br />Your data is secure and never shared.
                        </p>
                    </div>

                    {/* Skip Option - Always available for better UX */}
                    <div className="mt-8 text-center">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="group inline-flex items-center gap-2 py-2 text-xs font-medium text-neutral-500 hover:text-white transition-colors duration-200"
                        >
                            <span>I'll connect later</span>
                            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 opacity-50 group-hover:opacity-100" />
                        </button>
                    </div>
                </CardSpotlight>
            </div>
        </div>
    );
}

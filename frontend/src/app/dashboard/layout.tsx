'use client';

import { useSession } from '@/lib/auth-client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { Sidebar, MobileSidebar } from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';
import { useYouTubeSync } from '@/lib/useYouTubeSync';

// Inner component that uses useSearchParams
function DashboardLayoutInner({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session, isPending } = useSession();

    const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer
    const [collapsed, setCollapsed] = useState(false);     // Desktop collapse
    const [mounted, setMounted] = useState(false);

    // Multi-tab sync hook - broadcasts state changes to other tabs
    const { syncState, broadcast } = useYouTubeSync();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        // Wait for session to load before redirecting
        if (mounted && !isPending && !session) {
            router.push('/auth/login');
        }
    }, [mounted, isPending, session, router]);

    // Handle YouTube reconnection after OAuth callback
    // When URL has ?youtube_reconnect=1, call the reconnect endpoint
    useEffect(() => {
        const isReconnect = searchParams.get('youtube_reconnect') === '1';

        if (isReconnect && session?.user?.id) {
            console.log('[Dashboard] Detected youtube_reconnect param, calling reconnect endpoint');

            fetch('/api/youtube/reconnect', {
                method: 'POST',
                credentials: 'include'
            })
                .then(res => res.json())
                .then((data) => {
                    if (data.success) {
                        console.log('[Dashboard] Reconnection successful:', data);
                        // Show success toast
                        import('sonner').then(({ toast }) => {
                            toast.success('YouTube Connected', {
                                description: `Connected as ${data.channelName || 'your channel'}`,
                            });
                        });
                        // Broadcast to other tabs
                        broadcast({
                            connected: true,
                            channelName: data.channelName || null
                        });
                    } else {
                        console.error('[Dashboard] Reconnection failed:', data.error);
                        import('sonner').then(({ toast }) => {
                            toast.error('Connection Failed', {
                                description: data.error || 'Failed to connect YouTube',
                            });
                        });
                    }

                    // Clean up URL param
                    const url = new URL(window.location.href);
                    url.searchParams.delete('youtube_reconnect');
                    router.replace(url.pathname + url.search);
                })
                .catch((error) => {
                    console.error('[Dashboard] Reconnection error:', error);
                    import('sonner').then(({ toast }) => {
                        toast.error('Connection Failed', {
                            description: 'An unexpected error occurred',
                        });
                    });
                });
        }
    }, [searchParams, session?.user?.id, router, broadcast]);

    // Sync YouTube tokens to backend on every dashboard visit
    // Uses OPTIMISTIC UI from API response + broadcasts to other tabs
    useEffect(() => {
        if (session?.user?.id) {
            fetch('/api/sync/youtube-tokens', {
                method: 'POST',
                credentials: 'include'
            })
                .then(res => res.json())
                .then((data) => {
                    // Optimistic update from API response + broadcast to other tabs
                    if (data.youtubeConnected !== undefined) {
                        broadcast({
                            connected: data.youtubeConnected,
                            channelName: data.channelName || null
                        });
                    }
                })
                .catch(() => { });
        }
    }, [session?.user?.id, broadcast]);

    // Show loading while session is being checked
    if (!mounted || isPending || !session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050505]">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                    </div>
                    <p className="text-[#A1A1AA] text-sm">Loading dashboard...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-[#EDEDED] selection:bg-orange-500/30">
            {/* Background: Dot Grid with Radial Mask */}
            <div className="fixed inset-0 z-0 h-full w-full bg-[#050505] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.1] pointer-events-none" />

            {/* Background: Subtle Noise Texture */}
            <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            {/* Desktop Sidebar */}
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

            {/* Mobile Sidebar */}
            <MobileSidebar open={sidebarOpen} setOpen={setSidebarOpen} />

            {/* Main Content Wrapper */}
            <div
                className={cn(
                    "flex flex-col min-h-screen transition-all duration-300 ease-in-out",
                    collapsed ? "lg:pl-20" : "lg:pl-72"
                )}
            >
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center justify-between px-4 h-16 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl sticky top-0 z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-white/10 transition"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <span className="text-xl font-bold tracking-tight">reply.</span>
                    </Link>
                    <div className="w-10" /> {/* Spacer for balance */}
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 md:p-8 overflow-x-hidden flex flex-col min-h-[calc(100vh-64px)] lg:min-h-screen">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="max-w-7xl mx-auto w-full flex-1 flex flex-col"
                    >
                        <div className="flex-1">
                            {children}
                        </div>

                        <footer className="mt-auto pt-6 pb-4 w-full border-t border-white/5">
                            <div className="flex flex-col items-center justify-center text-center gap-3">
                                {/* Developed with YouTube Badge - Compact & Clickable */}
                                <a
                                    href="https://youtube.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:brightness-110 transition-all"
                                    aria-label="Developed with YouTube"
                                >
                                    <img
                                        src="/developed-with-youtube-sentence-case-light.png"
                                        alt="Developed with YouTube"
                                        className="h-5 object-contain"
                                    />
                                </a>

                                {/* Links Row */}
                                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-[#71717A]">
                                    <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">YouTube ToS</a>
                                    <span className="w-0.5 h-0.5 bg-[#52525B] rounded-full" />
                                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Google Privacy Policy</a>
                                    <span className="w-0.5 h-0.5 bg-[#52525B] rounded-full" />
                                    <a href="mailto:support@reply.com" className="hover:text-white transition-colors">Support</a>
                                </div>

                                {/* Copyright + Trademark */}
                                <div className="flex flex-wrap items-center justify-center gap-x-3 text-[9px] text-[#52525B]">
                                    <span>© 2026 Reply. All rights reserved.</span>
                                    <span className="w-px h-2 bg-[#3f3f46]" />
                                    <span>YouTube is a trademark of Google LLC.</span>
                                </div>
                            </div>
                        </footer>
                    </motion.div>
                </main>
            </div>
        </div>
    );
}

// Wrapper component with Suspense boundary for useSearchParams
export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#050505]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                    </div>
                    <p className="text-[#A1A1AA] text-sm">Loading dashboard...</p>
                </div>
            </div>
        }>
            <DashboardLayoutInner>{children}</DashboardLayoutInner>
        </Suspense>
    );
}


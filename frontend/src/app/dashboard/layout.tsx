'use client';

import { useSession } from '@/lib/auth-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, Youtube } from 'lucide-react';
import { motion } from 'framer-motion';
import { Sidebar, MobileSidebar } from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { data: session, isPending } = useSession();

    const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer
    const [collapsed, setCollapsed] = useState(false);     // Desktop collapse
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        // Wait for session to load before redirecting
        if (mounted && !isPending && !session) {
            router.push('/auth/login');
        }
    }, [mounted, isPending, session, router]);

    // Sync YouTube tokens to backend on every dashboard visit
    useEffect(() => {
        if (session?.user?.id) {
            // Always sync tokens to ensure backend has fresh tokens
            fetch('/api/sync/youtube-tokens', {
                method: 'POST',
                credentials: 'include'
            })
                .then(res => res.json())
                .then(() => { })
                .catch(() => { });
        }
    }, [session?.user?.id]);

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
                <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="max-w-7xl mx-auto"
                    >
                        {children}
                    </motion.div>
                </main>
            </div>
        </div>
    );
}

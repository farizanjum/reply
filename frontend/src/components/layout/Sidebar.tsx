'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Video,
    BarChart3,
    LogOut,
    ChevronRight,
    ChevronLeft,
    Settings,
    X,
    MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession, signOut } from '@/lib/auth-client';
import { Button } from '@/components/ui';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Videos', href: '/dashboard/videos', icon: Video },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

interface SidebarProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}

interface MobileSidebarProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const user = session?.user as any; // Cast to any for custom properties

    return (
        <motion.aside
            initial={false}
            animate={{
                width: collapsed ? 80 : 288,
                transition: { duration: 0.3, ease: 'easeInOut' }
            }}
            className={cn(
                'fixed inset-y-0 left-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-r border-white/10 flex flex-col shadow-2xl',
                'hidden lg:flex' // Desktop only
            )}
        >
            {/* Header / Logo */}
            <div className={cn("flex items-center h-20 px-6 border-b border-white/5", collapsed ? "justify-center px-0" : "justify-between")}>
                <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden hover:opacity-80 transition-opacity">
                    <AnimatePresence mode="wait">
                        {collapsed ? (
                            <motion.span
                                key="icon-logo"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="text-xl font-bold tracking-tight text-white"
                            >
                                r.
                            </motion.span>
                        ) : (
                            <motion.span
                                key="full-logo"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-xl font-bold tracking-tight text-white"
                            >
                                reply.
                            </motion.span>
                        )}
                    </AnimatePresence>
                </Link>

                {!collapsed && (
                    <button
                        onClick={() => setCollapsed(true)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-[#A1A1AA] hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Collapsed Toggle */}
            {collapsed && (
                <div className="flex justify-center py-4 border-b border-white/5">
                    <button
                        onClick={() => setCollapsed(false)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-[#A1A1AA] hover:text-white transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative',
                                isActive
                                    ? 'bg-white/5 text-white border border-white/5'
                                    : 'text-[#A1A1AA] hover:text-white hover:bg-white/5 border border-transparent'
                            )}
                            title={collapsed ? item.name : undefined}
                        >
                            <div className={cn(
                                "flex-shrink-0 transition-colors",
                                isActive ? "text-orange-500" : "text-[#A1A1AA] group-hover:text-white"
                            )}>
                                <item.icon className="w-5 h-5" />
                            </div>

                            {!collapsed && (
                                <span className="whitespace-nowrap">
                                    {item.name}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* User Profile */}
            <div className="p-3">
                {collapsed ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 shadow-lg shadow-orange-500/10 border border-white/10" title={user?.email}>
                            {user?.image ? (
                                <img src={user.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                                    <span className="text-xs font-bold text-white">
                                        {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                    </span>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={async () => {
                                await signOut();
                                window.location.href = '/auth/login';
                            }}
                            className="text-[#A1A1AA] hover:text-orange-500 transition-colors"
                            title="Sign out"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 shadow-lg shadow-orange-500/10 border border-white/10">
                                {user?.image ? (
                                    <img src={user.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                                        <span className="text-xs font-bold text-white">
                                            {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">
                                    {user?.name || user?.email?.split('@')[0] || 'User'}
                                </p>
                                <p className="text-[10px] text-[#A1A1AA] truncate">
                                    Pro Plan
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-[#A1A1AA] hover:text-white hover:bg-white/5 h-8 text-xs font-normal"
                            onClick={async () => {
                                await signOut();
                                window.location.href = '/auth/login';
                            }}
                        >
                            <LogOut className="w-3.5 h-3.5 mr-2" />
                            Sign out
                        </Button>
                    </div>
                )}
            </div>
        </motion.aside>
    );
}

// Mobile Drawer
export function MobileSidebar({ open, setOpen }: MobileSidebarProps) {
    const pathname = usePathname();
    // Using Better Auth signOut

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setOpen(false)}
                    />
                    <motion.aside
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 left-0 z-50 w-72 bg-[#050505] border-r border-white/10 flex flex-col lg:hidden"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setOpen(false)}>
                                <span className="text-xl font-bold tracking-tight text-white">reply.</span>
                            </Link>
                            <button onClick={() => setOpen(false)} className="text-[#A1A1AA]">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <nav className="flex-1 p-4 space-y-1">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                                            isActive
                                                ? 'bg-white/5 text-white'
                                                : 'text-[#A1A1AA] hover:text-white'
                                        )}
                                        onClick={() => setOpen(false)}
                                    >
                                        <item.icon className={cn("w-5 h-5", isActive ? "text-orange-500" : "text-[#A1A1AA]")} />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="p-4 border-t border-white/5">
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-[#A1A1AA] hover:text-white"
                                onClick={async () => {
                                    await signOut();
                                    setOpen(false);
                                    window.location.href = '/auth/login';
                                }}
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Sign Out
                            </Button>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}

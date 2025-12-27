import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export function DashboardSkeleton() {
    return (
        <div className="space-y-8">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <Skeleton width={200} height={32} baseColor="#18181B" highlightColor="#27272A" />
                    <Skeleton width={400} height={20} baseColor="#18181B" highlightColor="#27272A" className="mt-2" />
                </div>
                <Skeleton width={150} height={32} baseColor="#18181B" highlightColor="#27272A" borderRadius={20} />
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-[#18181B] rounded-xl p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <Skeleton circle width={40} height={40} baseColor="#27272A" highlightColor="#3F3F46" />
                            <Skeleton width={60} height={24} baseColor="#27272A" highlightColor="#3F3F46" borderRadius={12} />
                        </div>
                        <Skeleton width="60%" height={32} baseColor="#27272A" highlightColor="#3F3F46" className="mb-2" />
                        <Skeleton width="40%" height={16} baseColor="#27272A" highlightColor="#3F3F46" />
                    </div>
                ))}
            </div>

            {/* Chart Section Skeleton */}
            <div className="bg-[#18181B] rounded-xl p-6 border border-white/5">
                <Skeleton width={200} height={24} baseColor="#27272A" highlightColor="#3F3F46" className="mb-4" />
                <Skeleton height={300} baseColor="#27272A" highlightColor="#3F3F46" borderRadius={12} />
            </div>

            {/* Recent Activity Skeleton */}
            <div className="bg-[#18181B] rounded-xl p-6 border border-white/5">
                <Skeleton width={180} height={24} baseColor="#27272A" highlightColor="#3F3F46" className="mb-4" />
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                            <Skeleton circle width={40} height={40} baseColor="#27272A" highlightColor="#3F3F46" />
                            <div className="flex-1">
                                <Skeleton width="60%" height={16} baseColor="#27272A" highlightColor="#3F3F46" className="mb-1" />
                                <Skeleton width="40%" height={14} baseColor="#27272A" highlightColor="#3F3F46" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function VideosSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Skeleton width={150} height={32} baseColor="#18181B" highlightColor="#27272A" />
                <Skeleton width={120} height={40} baseColor="#18181B" highlightColor="#27272A" borderRadius={12} />
            </div>

            {/* Videos Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-[#18181B] rounded-xl overflow-hidden border border-white/5">
                        <Skeleton height={180} baseColor="#27272A" highlightColor="#3F3F46" />
                        <div className="p-4">
                            <Skeleton width="90%" height={20} baseColor="#27272A" highlightColor="#3F3F46" className="mb-2" />
                            <Skeleton width="60%" height={16} baseColor="#27272A" highlightColor="#3F3F46" className="mb-3" />
                            <div className="flex items-center gap-2">
                                <Skeleton width={60} height={24} baseColor="#27272A" highlightColor="#3F3F46" borderRadius={12} />
                                <Skeleton width={80} height={24} baseColor="#27272A" highlightColor="#3F3F46" borderRadius={12} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function SidebarSkeleton() {
    return (
        <div className="space-y-6 p-6">
            {/* Logo */}
            <Skeleton width={60} height={60} baseColor="#18181B" highlightColor="#27272A" borderRadius={16} />

            {/* Nav Items */}
            <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} height={44} baseColor="#18181B" highlightColor="#27272A" borderRadius={12} />
                ))}
            </div>

            {/* Bottom Section */}
            <div className="mt-auto pt-6">
                <div className="bg-[#18181B] rounded-xl p-4 border border-white/5">
                    <Skeleton width="80%" height={16} baseColor="#27272A" highlightColor="#3F3F46" className="mb-2" />
                    <Skeleton width="60%" height={14} baseColor="#27272A" highlightColor="#3F3F46" />
                </div>

                {/* User Profile */}
                <div className="flex items-center gap-3 mt-4">
                    <Skeleton circle width={40} height={40} baseColor="#27272A" highlightColor="#3F3F46" />
                    <div className="flex-1">
                        <Skeleton width="70%" height={16} baseColor="#27272A" highlightColor="#3F3F46" className="mb-1" />
                        <Skeleton width="50%" height={14} baseColor="#27272A" highlightColor="#3F3F46" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function SettingsSkeleton() {
    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/5 pb-4">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} width={100} height={36} baseColor="#18181B" highlightColor="#27272A" borderRadius={8} />
                ))}
            </div>

            {/* Settings Form */}
            <div className="space-y-8">
                {[1, 2, 3].map((section) => (
                    <div key={section} className="bg-[#18181B] rounded-xl p-6 border border-white/5">
                        <Skeleton width={200} height={24} baseColor="#27272A" highlightColor="#3F3F46" className="mb-4" />
                        <div className="space-y-4">
                            {[1, 2].map((field) => (
                                <div key={field}>
                                    <Skeleton width={120} height={16} baseColor="#27272A" highlightColor="#3F3F46" className="mb-2" />
                                    <Skeleton height={44} baseColor="#27272A" highlightColor="#3F3F46" borderRadius={8} />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Save Button */}
            <Skeleton width={120} height={44} baseColor="#F97316" highlightColor="#EA580C" borderRadius={12} />
        </div>
    );
}

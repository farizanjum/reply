'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Youtube, Instagram } from 'lucide-react';

interface PlatformTabsProps {
    defaultPlatform?: 'youtube' | 'instagram';
    onPlatformChange?: (platform: 'youtube' | 'instagram') => void;
    className?: string;
}

export function PlatformTabs({
    defaultPlatform = 'youtube',
    onPlatformChange,
    className = ''
}: PlatformTabsProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [activePlatform, setActivePlatform] = useState<'youtube' | 'instagram'>(
        (searchParams.get('platform') as 'youtube' | 'instagram') || defaultPlatform
    );

    const handlePlatformChange = (platform: 'youtube' | 'instagram') => {
        setActivePlatform(platform);

        // Update URL with platform param
        const params = new URLSearchParams(searchParams.toString());
        params.set('platform', platform);
        router.push(`${pathname}?${params.toString()}`);

        // Notify parent
        onPlatformChange?.(platform);
    };

    // Sync with URL changes
    useEffect(() => {
        const platform = searchParams.get('platform') as 'youtube' | 'instagram';
        if (platform && platform !== activePlatform) {
            setActivePlatform(platform);
        }
    }, [searchParams, activePlatform]);

    return (
        <div className={`flex rounded-xl bg-white/[0.02] backdrop-blur-sm border border-white/5 p-1 ${className}`}>
            {/* YouTube Tab */}
            <button
                onClick={() => handlePlatformChange('youtube')}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${activePlatform === 'youtube'
                        ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }
                `}
            >
                <Youtube className="w-4 h-4" />
                <span className="hidden sm:inline">YouTube</span>
            </button>

            {/* Instagram Tab */}
            <button
                onClick={() => handlePlatformChange('instagram')}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${activePlatform === 'instagram'
                        ? 'bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white shadow-lg shadow-pink-500/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }
                `}
            >
                <Instagram className="w-4 h-4" />
                <span className="hidden sm:inline">Instagram</span>
            </button>
        </div>
    );
}

export default PlatformTabs;

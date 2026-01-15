'use client';

import { LiquidMetal } from '@paper-design/shaders-react';

interface LiquidMetalLogoProps {
    /** 'wordmark' for "reply." text logo, 'icon' for the R mark */
    variant?: 'wordmark' | 'icon';
    /** Width of the logo container */
    width?: number;
    /** Height of the logo container */
    height?: number;
    /** Speed of the liquid metal animation */
    speed?: number;
    /** Scale of the logo */
    scale?: number;
    /** Additional className for the container */
    className?: string;
    /** Link to wrap the logo (optional) */
    href?: string;
}

export function LiquidMetalLogo({
    variant = 'wordmark',
    width = 120,
    height = 40,
    speed = 1,
    scale = 0.85,
    className = '',
    href,
}: LiquidMetalLogoProps) {
    // Select the appropriate logo based on variant
    const logoImage = variant === 'wordmark'
        ? '/reply-wordmark-logo.png'
        : '/reply-logo (1).png';

    // Adjust dimensions based on variant
    const adjustedWidth = variant === 'icon' ? Math.min(width, height) : width;
    const adjustedHeight = variant === 'icon' ? Math.min(width, height) : height;

    const logoElement = (
        <div
            className={`relative overflow-hidden flex items-center justify-center ${className}`}
            style={{
                width: adjustedWidth,
                height: adjustedHeight,
                // Use CSS Masking for true transparency (removes black box completely)
                // This clips the liquid effect to the exact shape of the logo
                WebkitMaskImage: `url('${logoImage}')`,
                maskImage: `url('${logoImage}')`,
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
            }}
        >
            <LiquidMetal
                style={{ width: '100%', height: '100%' }}
                image={logoImage}
                colorBack="#000000"
                colorTint="#ffffff"
                repetition={2}
                softness={0.1}
                shiftRed={0.3}
                shiftBlue={0.3}
                distortion={0.07}
                contour={0.4}
                angle={70}
                speed={speed}
                scale={1.05} // Scale > 1 ensures liquid fills the mask
                fit="cover"  // Cover ensures no black gaps inside the mask
            />
        </div>
    );

    // Wrap with link if href is provided
    if (href) {
        return (
            <a
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="hover:opacity-90 transition-opacity cursor-pointer inline-block"
            >
                {logoElement}
            </a>
        );
    }

    return logoElement;
}

// Preset configurations for common use cases
export function NavLogo({ className = '' }: { className?: string }) {
    return (
        <LiquidMetalLogo
            variant="wordmark"
            width={120}
            height={40}
            speed={0.8}
            scale={0.9}
            className={className}
        />
    );
}

export function FooterLogo({ className = '' }: { className?: string }) {
    return (
        <LiquidMetalLogo
            variant="wordmark"
            width={110}
            height={34}
            speed={0.6}
            scale={0.85}
            className={className}
        />
    );
}

export function IconLogo({
    size,
    width,
    height,
    className = '',
    href,
}: {
    size?: number;
    width?: number;
    height?: number;
    className?: string;
    href?: string;
}) {
    // effective dimensions: use specific width/height if consistent, else fallback to size or default 80
    const w = width || size || 80;
    const h = height || size || 80;

    return (
        <LiquidMetalLogo
            variant="icon"
            width={w}
            height={h}
            speed={0.8}
            scale={0.75}
            className={className}
            href={href}
        />
    );
}

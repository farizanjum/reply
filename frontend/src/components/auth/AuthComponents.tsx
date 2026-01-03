'use client';

import React, { useRef, useEffect } from 'react';
import { motion, useMotionValue, useMotionTemplate } from 'framer-motion';
import { cn } from '@/lib/utils';

// --- Tiles Background Component ---
const tileSizes = {
    sm: "w-8 h-8",
    md: "w-9 h-9 md:w-12 md:h-12",
    lg: "w-12 h-12 md:w-16 md:h-16",
};

export const Tiles = ({
    className,
    rows = 100,
    cols = 10,
    tileClassName,
    tileSize = "md",
}: {
    className?: string;
    rows?: number;
    cols?: number;
    tileClassName?: string;
    tileSize?: "sm" | "md" | "lg";
}) => {
    const rowsArray = new Array(rows).fill(1);
    const colsArray = new Array(cols).fill(1);

    return (
        <div className={cn("relative z-0 flex w-full h-full justify-center", className)}>
            {rowsArray.map((_, i) => (
                <motion.div
                    key={`row-${i}`}
                    className={cn(
                        tileSizes[tileSize],
                        "border-l border-neutral-900/50 relative",
                        tileClassName
                    )}
                >
                    {colsArray.map((_, j) => (
                        <motion.div
                            whileHover={{
                                backgroundColor: `var(--tile)`,
                                transition: { duration: 0 },
                            }}
                            whileTap={{
                                backgroundColor: `var(--tile)`,
                                transition: { duration: 0 },
                            }}
                            animate={{
                                transition: { duration: 2 },
                            }}
                            key={`col-${j}`}
                            className={cn(
                                tileSizes[tileSize],
                                "border-r border-t border-neutral-900/50 relative",
                                tileClassName
                            )}
                        />
                    ))}
                </motion.div>
            ))}
        </div>
    );
};

// --- Canvas Reveal Effect ---
export const CanvasRevealEffect = ({
    animationSpeed = 0.4,
    opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1],
    colors = [[255, 165, 0]],
    containerClassName,
    dotSize = 3,
    showGradient = true,
}: {
    animationSpeed?: number;
    opacities?: number[];
    colors?: number[][];
    containerClassName?: string;
    dotSize?: number;
    showGradient?: boolean;
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let time = 0;

        const resize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
            }
        };

        window.addEventListener('resize', resize);
        resize();

        const random = (x: number, y: number) => {
            const dot = x * 12.9898 + y * 78.233;
            return (Math.sin(dot) * 43758.5453) % 1;
        };

        const render = () => {
            if (!ctx || !canvas) return;
            const width = canvas.width;
            const height = canvas.height;
            const totalSize = dotSize + 2;

            ctx.clearRect(0, 0, width, height);
            time += 0.01 * animationSpeed;
            const currentColor = colors[Math.floor(time * 0.2) % colors.length];
            const [r, g, b] = currentColor;
            const colorString = `${r}, ${g}, ${b}`;

            for (let x = 0; x < width; x += totalSize) {
                for (let y = 0; y < height; y += totalSize) {
                    const noise = random(Math.floor(x / totalSize), Math.floor(y / totalSize));
                    const wave = Math.sin(time + noise * 5 + (x / width) * 5) * 0.5 + 0.5;
                    const opacityIndex = Math.floor(wave * opacities.length);
                    const opacity = opacities[Math.min(opacityIndex, opacities.length - 1)];

                    if (opacity > 0.1) {
                        ctx.fillStyle = `rgba(${colorString}, ${opacity})`;
                        ctx.fillRect(x, y, dotSize, dotSize);
                    }
                }
            }
            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [animationSpeed, dotSize, colors, opacities]);

    return (
        <div className={cn("h-full relative bg-black w-full", containerClassName)}>
            <canvas ref={canvasRef} className="h-full w-full block" />
            {showGradient && (
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            )}
        </div>
    );
};

// --- Card Spotlight Component ---
export const CardSpotlight = ({
    children,
    radius = 350,
    color = "#262626",
    className,
    ...props
}: {
    children: React.ReactNode;
    radius?: number;
    color?: string;
    className?: string;
}) => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const [isHovering, setIsHovering] = React.useState(false);

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    // Touch event handlers for mobile support
    const handleTouchStart = () => setIsHovering(true);
    const handleTouchEnd = () => setIsHovering(false);
    const handleTouchMove = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        const { left, top } = e.currentTarget.getBoundingClientRect();
        mouseX.set(touch.clientX - left);
        mouseY.set(touch.clientY - top);
    };

    return (
        <div
            className={cn(
                "group/spotlight p-10 rounded-3xl relative border border-neutral-800 bg-black overflow-hidden",
                className
            )}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            {...props}
        >
            <motion.div
                className="pointer-events-none absolute z-0 -inset-px rounded-3xl transition duration-300"
                style={{
                    backgroundColor: color,
                    opacity: isHovering ? 1 : 0,
                    maskImage: useMotionTemplate`
            radial-gradient(
              ${radius}px circle at ${mouseX}px ${mouseY}px,
              white,
              transparent 80%
            )
          `,
                }}
            >
                <div className={cn("absolute inset-0 transition-opacity duration-300", isHovering ? "opacity-100" : "opacity-0")}>
                    <CanvasRevealEffect
                        animationSpeed={3}
                        containerClassName="bg-transparent absolute inset-0 pointer-events-none"
                        colors={[
                            [249, 115, 22],
                            [255, 165, 0],
                        ]}
                        dotSize={3}
                    />
                </div>
            </motion.div>
            <div className="relative z-10">{children}</div>
        </div>
    );
};

// --- Shimmer Button Component ---
export const ShimmerButton = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
        shimmerColor?: string;
        shimmerSize?: string;
        shimmerDuration?: string;
        borderRadius?: string;
        background?: string;
    }
>(
    (
        {
            shimmerColor = "#ffffff",
            shimmerSize = "0.05em",
            shimmerDuration = "3s",
            borderRadius = "12px",
            background = "rgba(23, 23, 23, 1)",
            className,
            children,
            ...props
        },
        ref
    ) => {
        return (
            <button
                style={{
                    "--spread": "90deg",
                    "--shimmer-color": shimmerColor,
                    "--radius": borderRadius,
                    "--speed": shimmerDuration,
                    "--cut": shimmerSize,
                    "--bg": background,
                } as React.CSSProperties}
                className={cn(
                    "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 text-white [background:var(--bg)] [border-radius:var(--radius)]",
                    "transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px",
                    className
                )}
                ref={ref}
                {...props}
            >
                <div className={cn("-z-30 blur-[2px]", "absolute inset-0 overflow-visible [container-type:size]")}>
                    <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1] [border-radius:0] [mask:none]">
                        <div className="animate-spin-around absolute -inset-full w-auto rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] [translate:0_0]" />
                    </div>
                </div>
                {children}
                <div
                    className={cn(
                        "insert-0 absolute size-full",
                        "rounded-xl px-4 py-1.5 text-sm font-medium md:shadow-[inset_0_-8px_10px_#ffffff1f]",
                        "transform-gpu transition-all duration-300 ease-in-out",
                        "md:group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]",
                        "md:group-active:shadow-[inset_0_-10px_10px_#ffffff3f]"
                    )}
                />
                <div className={cn("absolute -z-20 [background:var(--bg)] [border-radius:var(--radius)] [inset:var(--cut)]")} />
            </button>
        );
    }
);
ShimmerButton.displayName = "ShimmerButton";

// --- Glass Button Component ---
export const GlassButton = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
        size?: 'default' | 'sm' | 'lg' | 'icon';
        variant?: 'default' | 'orange';
        contentClassName?: string;
    }
>(({ className, children, size = 'default', variant = 'default', contentClassName, ...props }, ref) => {
    const sizeClasses = {
        default: "text-base font-medium",
        sm: "text-sm font-medium",
        lg: "text-lg font-bold",
        icon: "h-10 w-10",
    }[size];

    const textPaddingClasses = {
        default: "px-6 py-3.5",
        sm: "px-4 py-2",
        lg: "px-8 py-4",
        icon: "flex h-10 w-10 items-center justify-center",
    }[size];

    const variantClass = variant === 'orange' ? 'glass-button-orange' : 'glass-button';

    return (
        <div className={cn("glass-button-wrap cursor-pointer rounded-xl group/glass w-full", className)}>
            <button
                className={cn(variantClass, "relative isolate all-unset cursor-pointer rounded-xl transition-all w-full", sizeClasses)}
                ref={ref}
                {...props}
            >
                <span
                    className={cn(
                        "glass-button-text relative block select-none tracking-tighter flex items-center justify-center gap-2",
                        textPaddingClasses,
                        contentClassName
                    )}
                >
                    {children}
                </span>
            </button>
            <div className={cn("glass-button-shadow rounded-xl absolute inset-0 -z-10 transition-all duration-300 group-hover/glass:opacity-100 opacity-70", variant === 'orange' && 'glass-button-shadow-orange')}></div>
        </div>
    );
});
GlassButton.displayName = "GlassButton";

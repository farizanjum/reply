"use client";

import { useMotionValue, motion, useMotionTemplate } from "framer-motion";
import React, { MouseEvent as ReactMouseEvent, useState, lazy, Suspense } from "react";
import { cn } from "@/lib/utils";

// Lazy load the heavy Three.js canvas effect - only loads when user hovers
const CanvasRevealEffect = lazy(() => import("@/components/ui/canvas-reveal-effect").then(mod => ({ default: mod.CanvasRevealEffect })));

export const CardSpotlight = ({
    children,
    radius = 350,
    color = "#262626",
    className,
    ...props
}: {
    radius?: number;
    color?: string;
    children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    function handleMouseMove({
        currentTarget,
        clientX,
        clientY,
    }: ReactMouseEvent<HTMLDivElement>) {
        let { left, top } = currentTarget.getBoundingClientRect();

        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    const [isHovering, setIsHovering] = useState(false);
    const [hasHovered, setHasHovered] = useState(false); // Track if user has ever hovered

    const handleMouseEnter = () => {
        setIsHovering(true);
        if (!hasHovered) setHasHovered(true); // Start loading the effect on first hover
    };
    const handleMouseLeave = () => setIsHovering(false);

    // Touch event handlers for mobile support
    const handleTouchStart = () => {
        setIsHovering(true);
        if (!hasHovered) setHasHovered(true);
    };
    const handleTouchEnd = () => setIsHovering(false);
    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        const touch = e.touches[0];
        const { left, top } = e.currentTarget.getBoundingClientRect();
        mouseX.set(touch.clientX - left);
        mouseY.set(touch.clientY - top);
    };

    return (
        <div
            className={cn(
                "group/spotlight p-10 rounded-md relative border border-neutral-800 bg-black dark:border-neutral-800",
                className
            )}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            {...props}
        >
            <motion.div
                className="pointer-events-none absolute z-0 -inset-px rounded-md transition duration-300"
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
                {/* Only load CanvasRevealEffect after first hover to improve LCP */}
                {hasHovered && (
                    <Suspense fallback={null}>
                        {isHovering && (
                            <CanvasRevealEffect
                                animationSpeed={5}
                                containerClassName="bg-transparent absolute inset-0 pointer-events-none"
                                colors={[
                                    [255, 77, 0], // reply orange
                                    [255, 10, 0], // red accent
                                ]}
                                dotSize={3}
                            />
                        )}
                    </Suspense>
                )}
            </motion.div>
            <div className="relative z-10 h-full w-full">{children}</div>
        </div>
    );
};

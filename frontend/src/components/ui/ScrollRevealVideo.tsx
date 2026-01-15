"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";

interface ScrollRevealVideoProps {
    src: string;
    className?: string;
    fullScreen?: boolean;
    /** Time in seconds to show when video is paused/not in view (poster frame) */
    posterTime?: number;
}

export default function ScrollRevealVideo({
    src,
    className = "",
    fullScreen = false,
    posterTime = 0.5 // Default poster frame at 0.5 seconds (visible content)
}: ScrollRevealVideoProps) {
    // Reference to the video element to control play/pause
    const videoRef = useRef<HTMLVideoElement>(null);

    // Reference to the container to track visibility
    const containerRef = useRef(null);

    // Track if video has been initialized with poster frame
    const [isInitialized, setIsInitialized] = useState(false);

    // useInView detects when the element is inside the viewport
    // Trigger when 30% of the element is visible
    const isInView = useInView(containerRef, { amount: 0.3 });

    // Initialize video to poster frame on load
    useEffect(() => {
        const video = videoRef.current;
        if (video && !isInitialized) {
            const seekToPoster = () => {
                // Set initial frame to posterTime
                video.currentTime = posterTime;
            };

            const handleSeeked = () => {
                // Frame is now rendered
                setIsInitialized(true);
            };

            const handleCanPlay = () => {
                seekToPoster();
            };

            video.addEventListener('canplay', handleCanPlay);
            video.addEventListener('seeked', handleSeeked);

            // If already loaded, seek immediately
            if (video.readyState >= 3) {
                seekToPoster();
            }

            return () => {
                video.removeEventListener('canplay', handleCanPlay);
                video.removeEventListener('seeked', handleSeeked);
            };
        }
    }, [posterTime, isInitialized]);

    // Handle Play/Pause logic based on visibility - Framer-style
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isInView) {
            // When entering view: reset to beginning and play
            video.currentTime = 0;
            video.play().catch((e) => {
                // Handle autoplay browser restrictions silently
                console.log("Autoplay prevented:", e);
            });
        } else {
            // When leaving view: pause and show poster frame
            video.pause();
            if (isInitialized) {
                video.currentTime = posterTime;
            }
        }
    }, [isInView, posterTime, isInitialized]);

    // Handle video ended event - show poster frame when video finishes
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleEnded = () => {
            // When video ends, show the poster frame instead of blank screen
            video.currentTime = posterTime;
        };

        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('ended', handleEnded);
        };
    }, [posterTime]);

    return (
        <div
            ref={containerRef}
            className={`w-full flex justify-center items-center ${fullScreen ? 'min-h-screen' : 'py-20'} ${className}`}
        >
            {/* Poster frame always visible at 100% opacity - Removed motion.div to guarantee no opacity issues */}
            <div
                className={`relative overflow-hidden ${fullScreen ? 'w-full h-full' : 'rounded-2xl shadow-2xl'}`}
            >
                <video
                    ref={videoRef}
                    src={src}
                    preload="auto"
                    playsInline
                    muted
                    className={`${fullScreen ? 'w-full h-screen' : 'w-full max-w-4xl rounded-2xl'}`}
                    style={{
                        cursor: 'auto',
                        display: 'block',
                        objectFit: 'contain',
                        backgroundColor: 'rgba(0, 0, 0, 0)',
                        objectPosition: '50% 50%',
                        opacity: 1, // Explicit 100% opacity
                    }}
                />
            </div>
        </div>
    );
}

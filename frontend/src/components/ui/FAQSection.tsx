'use client';

import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Lazy load the heavy shader component
const Dithering = lazy(() =>
    import('@paper-design/shaders-react').then(mod => ({ default: mod.Dithering }))
);

const faqItems = [
    {
        id: "01",
        title: "What is reply. ?",
        content:
            "reply. is an AI-powered YouTube comment management tool that automatically generates and posts personalized replies to your viewers. It learns your unique tone of voice and engages your community 24/7, so you never miss a conversation.",
    },
    {
        id: "02",
        title: "How does reply. AI understand my content?",
        content:
            "Our AI analyzes your video content, previous replies, and channel style to understand context deeply. It doesn't just read keywords. It understands sentiment, humor, and nuance to craft replies that genuinely sound like you.",
    },
    {
        id: "03",
        title: "Is reply. safe for my YouTube channel?",
        content:
            "Absolutely. reply. is built with ban protection in mind. We use intelligent rate limiting, human-like response delays, and request throttling to ensure your account stays safe. Every reply goes through YouTube's official API.",
    },
    {
        id: "04",
        title: "How much does reply. cost?",
        content:
            "reply. is completely free to get started. We believe every creator deserves the tools to grow their community without barriers. Premium features may be available in the future, but the core functionality is and always will be free.",
    },
    {
        id: "05",
        title: "Do I need any technical skills?",
        content:
            "Not at all! reply. is designed for creators, not developers. Simply connect your YouTube channel, customize your preferences, and let our AI handle the rest. Setup takes less than 2 minutes.",
    },
];

// Shader loading placeholder with animated gradient
function ShaderPlaceholder() {
    return (
        <div
            className="w-full h-full animate-pulse"
            style={{
                background: 'radial-gradient(ellipse at center, rgba(255, 106, 0, 0.15) 0%, #080808 70%)'
            }}
        />
    );
}

export default function FAQSection() {
    const sectionRef = useRef<HTMLElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile for optimized shader params
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Intersection Observer - only load shader when section is near viewport
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect(); // Stop observing once visible
                }
            },
            {
                threshold: 0.1,
                rootMargin: '200px' // Start loading 200px before it enters viewport
            }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <section ref={sectionRef} className="relative z-10 py-20 px-6 overflow-hidden">
            {/* Dithering Shader Background - Lazy loaded */}
            <div className="absolute inset-0 z-0" style={{ willChange: 'transform' }}>
                {isVisible ? (
                    <Suspense fallback={<ShaderPlaceholder />}>
                        <Dithering
                            colorBack="#080808"
                            colorFront="#ff6a00"
                            shape="warp"
                            type="2x2"
                            // Optimized params: smaller size & slower speed on mobile
                            size={isMobile ? 3 : 2}
                            speed={isMobile ? 0.3 : 0.5}
                            style={{ width: '100%', height: '100%' }}
                        />
                    </Suspense>
                ) : (
                    <ShaderPlaceholder />
                )}

                {/* 4-Sided Fading Effect - Vignette overlay */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'radial-gradient(ellipse at center, transparent 30%, #080808 85%)'
                    }}
                />

                {/* Top fade */}
                <div
                    className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
                    style={{
                        background: 'linear-gradient(to bottom, #080808 0%, transparent 100%)'
                    }}
                />

                {/* Bottom fade */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
                    style={{
                        background: 'linear-gradient(to top, #080808 0%, transparent 100%)'
                    }}
                />

                {/* Left fade */}
                <div
                    className="absolute top-0 bottom-0 left-0 w-24 md:w-32 pointer-events-none"
                    style={{
                        background: 'linear-gradient(to right, #080808 0%, transparent 100%)'
                    }}
                />

                {/* Right fade */}
                <div
                    className="absolute top-0 bottom-0 right-0 w-24 md:w-32 pointer-events-none"
                    style={{
                        background: 'linear-gradient(to left, #080808 0%, transparent 100%)'
                    }}
                />
            </div>

            <div className="max-w-3xl mx-auto relative z-10">
                {/* Section Header */}
                <div className="text-center mb-12">
                    <h2
                        className="text-3xl sm:text-4xl font-bold mb-4"
                        style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.8), 0 4px 20px rgba(0, 0, 0, 0.6)' }}
                    >
                        Frequently Asked <span className="text-[#FF6A00]" style={{ textShadow: '0 0 20px rgba(0, 0, 0, 0.9), 0 2px 10px rgba(0, 0, 0, 1)' }}>Questions</span>
                    </h2>
                    <p className="text-[#A1A1AA] max-w-lg mx-auto">
                        Everything you need to know about reply. Can't find the answer you're looking for? Reach out to us.
                    </p>
                </div>

                {/* FAQ Accordion */}
                <Accordion type="single" defaultValue="01" collapsible className="w-full space-y-3">
                    {faqItems.map((item) => (
                        <AccordionItem
                            value={item.id}
                            key={item.id}
                            className="border border-white/10 rounded-xl bg-[#0A0A0A] overflow-hidden last:border-b"
                            style={{ willChange: 'contents' }}
                        >
                            <AccordionTrigger className="text-left px-6 py-5 hover:no-underline cursor-pointer group [&>svg]:hidden">
                                <div className="flex flex-1 justify-between items-center gap-4">
                                    <h3 className="text-lg sm:text-xl font-semibold text-white group-hover:text-orange-400 transition-colors duration-150">
                                        {item.title}
                                    </h3>
                                    <div className="relative w-6 h-6 shrink-0">
                                        <Plus
                                            strokeWidth={2}
                                            className={cn(
                                                "absolute inset-0 h-6 w-6 text-orange-500 transition-[opacity,transform] duration-150",
                                                "group-data-[state=open]:opacity-0 group-data-[state=open]:rotate-90",
                                                "group-data-[state=closed]:opacity-100 group-data-[state=closed]:rotate-0"
                                            )}
                                            style={{ willChange: 'opacity, transform' }}
                                        />
                                        <X
                                            strokeWidth={2}
                                            className={cn(
                                                "absolute inset-0 h-6 w-6 text-orange-500 transition-[opacity,transform] duration-150",
                                                "group-data-[state=closed]:opacity-0 group-data-[state=closed]:-rotate-90",
                                                "group-data-[state=open]:opacity-100 group-data-[state=open]:rotate-0"
                                            )}
                                            style={{ willChange: 'opacity, transform' }}
                                        />
                                    </div>
                                </div>
                            </AccordionTrigger>

                            <AccordionContent className="px-6 pb-6 text-[#A1A1AA] leading-relaxed">
                                {item.content}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    );
}

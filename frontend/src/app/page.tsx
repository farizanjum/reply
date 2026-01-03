'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Shield,
  BarChart2,
  Clock,
  MessageSquare,
  LogOut
} from 'lucide-react';
import { authApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from '@/lib/auth-client';

// Lazy load heavy components - these use Three.js/WebGL and are render-blocking
const CardSpotlight = lazy(() => import('@/components/ui/card-spotlight').then(mod => ({ default: mod.CardSpotlight })));

// Lightweight fallback card while CardSpotlight loads
function LightCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`group relative border border-white/10 bg-gray-900/50 overflow-hidden rounded-xl transition-all duration-300 hover:border-white/20 ${className}`}>
      <div className="relative h-full">{children}</div>
    </div>
  );
}


// === Components ===

function ShimmerButton({ onClick, children, className }: { onClick?: () => void, children: React.ReactNode, className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex overflow-hidden rounded-lg p-[1px] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-50 ${className}`}
    >
      <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
      <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-lg bg-gray-950 px-6 py-3 text-sm font-medium text-white backdrop-blur-3xl transition hover:bg-gray-900">
        <div className="relative flex items-center gap-2">
          {children}
          {/* Shimmer overlay - hidden on mobile to avoid frozen gradient look */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent hidden md:block" />
        </div>
      </span>
    </button>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAuthenticated = !!session;
  const [channelUrl, setChannelUrl] = useState('');

  // Removed auto-redirect - allow logged-in users to view landing page

  const handleLogin = async () => {
    try {
      const response = await authApi.getGoogleAuthUrl();
      window.location.href = response.data.auth_url;
    } catch (error) {
      console.error('Failed to get auth URL:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#EDEDED] font-sans selection:bg-orange-500/30 overflow-hidden relative">

      {/* Background: Dot Grid with Radial Mask */}
      <div className="absolute inset-0 z-0 h-full w-full bg-[#050505] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.1]" />

      {/* Background: Subtle Noise Texture */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* Sticky Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050505]/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">reply.</span>
          </div>
          <div className="flex items-center gap-6">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-all shadow-lg shadow-orange-500/25"
                >
                  Open Dashboard
                </Link>
                <button
                  onClick={async () => {
                    await signOut();
                    window.location.href = '/';
                  }}
                  className="p-2 rounded-full text-gray-400 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="text-sm font-medium px-5 py-2 sticky bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-full hover:bg-orange-500/20 hover:border-orange-500/30 transition-all shadow-lg shadow-orange-500/5 backdrop-blur-md"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Use CSS animation instead of framer-motion for faster LCP */}
          <div className="space-y-8 animate-[fadeInUp_0.5s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.1s' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs text-[#A1A1AA]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              v2.0 is now live
            </div>

            <h1 className="text-6xl sm:text-7xl font-bold leading-[0.95] tracking-tight">
              Don't just read comments. <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#FF4D00] to-[#FF8000] drop-shadow-[0_0_15px_rgba(255,77,0,0.3)]">Reply.</span>
            </h1>

            <p className="text-xl text-[#A1A1AA] leading-relaxed max-w-lg">
              The context-aware AI co-pilot for high-volume YouTube creators. Trained on your tone of voice to turn viewers into community.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 max-w-md relative">
              <input
                type="text"
                placeholder="Paste your channel URL"
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                className="flex-1 relative z-10 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/50 transition-colors placeholder:text-gray-600"
              />

              <ShimmerButton onClick={() => router.push('/auth/signup')}>
                Generate Replies <ArrowRight className="w-4 h-4 ml-1" />
              </ShimmerButton>
            </div>

            <div className="flex items-center gap-4 text-sm text-[#52525B]">
              <a
                href="https://www.instagram.com/parasmadan.in"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="/Paras_Madan.jpeg"
                  alt="Paras Madan"
                  className="w-6 h-6 rounded-full object-cover border border-[#050505] ring-1 ring-white/10 hover:ring-orange-500/50 transition-all cursor-pointer"
                />
              </a>
              <p>Trusted by creators with 100M+ views</p>
            </div>
          </div>

          {/* 3D Dashboard Mockup - Floating & Alive */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: 15 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="hidden lg:block relative perspective-1000"
          >
            {/* Floating Animation Wrapper */}
            <motion.div
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="relative z-10 bg-[#0A0A0A] border border-white/10 rounded-xl p-4 shadow-2xl backdrop-blur-sm"
            >
              {/* Fake Dashboard Header */}
              <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600" />
                  <div>
                    <div className="h-2 w-24 bg-gray-800 rounded mb-1" />
                    <div className="h-2 w-16 bg-gray-800/50 rounded" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-green-500 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    Live
                  </div>
                </div>
              </div>

              {/* Fake Comment Thread */}
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 bg-[#111] rounded-lg border border-white/5 relative overflow-hidden group">
                    <div className="flex gap-3 mb-2 relative z-10">
                      <div className="w-6 h-6 rounded-full bg-gray-800" />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <div className="h-2 w-20 bg-gray-800 rounded" />
                          <div className="h-2 w-8 bg-gray-800/50 rounded" />
                        </div>
                        <div className="h-2 w-3/4 bg-gray-800/50 rounded mt-2" />
                      </div>
                    </div>
                    {/* Simulated Reply Animation */}
                    <div className="ml-9 p-3 bg-[#1A1A1A] rounded border border-white/5 relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-1.5 w-12 bg-orange-500/50 rounded" />
                        <div className="text-[10px] text-[#52525B]">AI Analyzing context...</div>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1 overflow-hidden">
                        <motion.div
                          className="bg-orange-500 h-1 rounded-full"
                          animate={{ width: ["0%", "100%"] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: i * 0.5 }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Ambient Glows behind the mockup */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-orange-500/10 blur-[100px] -z-10 rounded-full pointer-events-none" />
          </motion.div>
        </div>
      </section>

      {/* Bento Grid Features - Lazy loaded for better LCP */}
      <section className="py-20 px-6 max-w-7xl mx-auto border-t border-white/5 relative z-10">
        <div className="mb-12">
          <h2 className="text-3xl font-semibold mb-2">Engineered for growth</h2>
          <p className="text-[#A1A1AA]">Tools designed for the modern creator workflow.</p>
        </div>

        <Suspense fallback={
          <div className="grid md:grid-cols-3 gap-6">
            <LightCard className="md:col-span-2 h-[320px]"><div className="p-8 animate-pulse"><div className="h-10 w-10 bg-gray-800 rounded-lg mb-6" /><div className="h-6 w-48 bg-gray-800 rounded mb-2" /><div className="h-4 w-64 bg-gray-800/50 rounded" /></div></LightCard>
            <LightCard className="h-[320px]"><div className="p-8 animate-pulse"><div className="h-10 w-10 bg-gray-800 rounded-lg mb-6" /><div className="h-6 w-32 bg-gray-800 rounded mb-2" /><div className="h-4 w-40 bg-gray-800/50 rounded" /></div></LightCard>
            <LightCard className="h-[320px]"><div className="p-8 animate-pulse"><div className="h-10 w-10 bg-gray-800 rounded-lg mb-6" /><div className="h-6 w-32 bg-gray-800 rounded mb-2" /><div className="h-4 w-40 bg-gray-800/50 rounded" /></div></LightCard>
            <LightCard className="md:col-span-2 h-[320px]"><div className="p-8 animate-pulse"><div className="h-10 w-10 bg-gray-800 rounded-lg mb-6" /><div className="h-6 w-40 bg-gray-800 rounded mb-2" /><div className="h-4 w-56 bg-gray-800/50 rounded" /></div></LightCard>
          </div>
        }>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1: Context Aware (Span 2) */}
            <CardSpotlight className="md:col-span-2 p-0 bg-gray-900/50 border-white/10 overflow-hidden relative rounded-xl h-[320px]">
              <div className="p-8 h-full flex flex-col justify-between relative z-20">
                <div>
                  <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-6 text-orange-500">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-medium mb-2 text-white">Context Aware Intelligence</h3>
                  <p className="text-[#A1A1AA] text-sm max-w-sm">
                    Understanding nuance, sentiment, and humor. Not just keywords.
                  </p>
                </div>

                {/* Visual: Code Snippet */}
                <div className="absolute top-8 right-8 w-72 hidden lg:block opacity-100 group-hover:opacity-100 transition_opacity duration-500">
                  <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4 text-xs font-mono shadow-2xl">
                    <div className="flex gap-1.5 mb-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/20"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500/20"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-gray-500"># Incoming Comment</div>
                      <div className="text-white">"How did you do that transition?!"</div>
                      <div className="h-px bg-white/5 my-2" />
                      <div className="text-orange-500"># Generated Reply</div>
                      <div className="text-orange-300">"Using a masked adjustment layer! Tutorial comping up next week. 🎥"</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardSpotlight>

            {/* Card 2: Human-like Delays */}
            <CardSpotlight className="p-0 bg-gray-900/5 border-white/10 overflow-hidden relative rounded-xl h-[320px]">
              <div className="p-8 h-full flex flex-col relative z-20">
                <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-6 text-orange-400">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-medium mb-2 text-white">Natural Delays</h3>
                <p className="text-[#A1A1AA] text-sm mb-auto">
                  Randomized timing engine.
                </p>

                {/* Visual: Animated Toggle */}
                <div className="mt-6 bg-[#0a0a0a] border border-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">Variance</span>
                    <span className="text-xs text-orange-400 font-mono">142ms</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-orange-500 rounded-full"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                </div>
              </div>
            </CardSpotlight>

            {/* Card 3: Ban Protection */}
            <CardSpotlight className="p-0 bg-gray-900/5 border-white/10 overflow-hidden relative rounded-xl h-[320px]">
              <div className="p-8 h-full flex flex-col relative z-20">
                <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-6 text-red-500">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-medium mb-2 text-white">Ban Protection</h3>
                <p className="text-[#A1A1AA] text-sm mb-auto">
                  Request throttling & fingerprinting.
                </p>

                {/* Visual: Status Pulse */}
                <div className="mt-6 flex items-center gap-3 bg-[#0a0a0a] border border-red-500/10 rounded-lg px-3 py-2">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </div>
                  <span className="text-xs font-medium text-red-500 uppercase tracking-widest">Secure</span>
                </div>
              </div>
            </CardSpotlight>

            {/* Card 4: Analytics (Span 2) */}
            <CardSpotlight className="md:col-span-2 p-0 bg-gray-900/50 border-white/10 overflow-hidden relative rounded-xl h-[320px]">
              <div className="p-8 h-full flex flex-col relative z-20">
                <div className="flex flex-col h-full relative z-10">
                  <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-6 text-orange-600">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-medium mb-2 text-white">Real-time Analytics</h3>
                  <p className="text-[#A1A1AA] text-sm max-w-sm z-20 relative">
                    Track engagement metrics, reply rates, and community sentiment as it happens.
                  </p>
                </div>

                {/* Visual: Growing Chart */}
                <div className="absolute bottom-0 right-0 w-2/3 h-40 flex items-end gap-2 px-8 pb-8 opacity-40 group-hover:opacity-100 transition-opacity duration-500 mask-image-b">
                  {[30, 45, 35, 60, 50, 75, 65, 90, 80, 100].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      className="flex-1 bg-gradient-to-t from-orange-600 to-orange-500/10 rounded-t-[2px]"
                    />
                  ))}
                </div>
              </div>
            </CardSpotlight>
          </div>
        </Suspense>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6 relative z-10 bg-[#050505]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tighter">reply.</span>
            <span className="text-xs text-[#52525B]">© 2025</span>
          </div>
          <div className="flex gap-8 text-sm text-[#A1A1AA]">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

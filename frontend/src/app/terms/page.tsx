"use client";

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-[#050505] text-[#EDEDED] font-sans antialiased selection:bg-orange-500/20 selection:text-orange-300">
            {/* Subtle Noise Overlay */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

            {/* Header */}
            <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#050505]/70 backdrop-blur-md">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm">Back to Home</span>
                    </Link>
                    <Link href="/" className="text-xl font-bold tracking-tight">reply.</Link>
                </div>
            </nav>

            {/* Content */}
            <main className="relative z-10 max-w-4xl mx-auto px-6 py-16">
                <div className="mb-12">
                    <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">Terms of Service</h1>
                    <p className="text-[#A1A1AA]">Last updated: January 1, 2026</p>
                </div>

                <div className="prose prose-invert prose-lg max-w-none space-y-8">
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">1. Acceptance of Terms</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            Welcome to Reply. These Terms of Service ("Terms") govern your access to and use of the Reply platform, including our website, applications, and services (collectively, the "Service"). By accessing or using the Service, you agree to be bound by these Terms and our Privacy Policy.
                        </p>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms. If you do not agree to these Terms, you may not access or use the Service.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">2. Description of Service</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            Reply is an automated comment management platform designed for YouTube content creators. The Service provides:
                        </p>
                        <ul className="list-disc list-inside text-[#A1A1AA] space-y-2 ml-4">
                            <li>Automated reply generation based on user-defined keywords and templates</li>
                            <li>Comment monitoring and analysis for your YouTube videos</li>
                            <li>Customizable response templates with placeholder support</li>
                            <li>Analytics and insights on comment engagement</li>
                            <li>API integration with YouTube through official Google APIs</li>
                        </ul>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, with or without notice.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">3. Account Registration and Security</h2>

                        <h3 className="text-xl font-medium text-orange-400">3.1 Account Creation</h3>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            To use the Service, you must authenticate using your Google account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate.
                        </p>

                        <h3 className="text-xl font-medium text-orange-400">3.2 Account Security</h3>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:
                        </p>
                        <ul className="list-disc list-inside text-[#A1A1AA] space-y-2 ml-4">
                            <li>Notify us immediately of any unauthorized access or use of your account</li>
                            <li>Not share your account credentials with any third party</li>
                            <li>Ensure your Google account security settings are properly configured</li>
                            <li>Log out of your account at the end of each session</li>
                        </ul>

                        <h3 className="text-xl font-medium text-orange-400">3.3 Account Termination</h3>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            We reserve the right to suspend or terminate your account at our sole discretion, without prior notice, for conduct that we believe violates these Terms, is harmful to other users, or is otherwise inappropriate.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">4. User Responsibilities and Conduct</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">By using the Service, you agree to:</p>
                        <ul className="list-disc list-inside text-[#A1A1AA] space-y-2 ml-4">
                            <li>Comply with all applicable laws, regulations, and third-party agreements</li>
                            <li>Use the Service only for lawful purposes and in accordance with these Terms</li>
                            <li>Respect YouTube's Terms of Service and Community Guidelines</li>
                            <li>Not use the Service to send spam, misleading, or inappropriate content</li>
                            <li>Take full responsibility for the content of your automated replies</li>
                            <li>Not attempt to circumvent any security features or access restrictions</li>
                            <li>Not use the Service to harass, abuse, or harm other users</li>
                            <li>Not interfere with or disrupt the Service or servers connected to it</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">5. Content and Intellectual Property</h2>

                        <h3 className="text-xl font-medium text-orange-400">5.1 Your Content</h3>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            You retain ownership of all content you create through the Service, including reply templates and custom configurations. By using the Service, you grant us a limited, non-exclusive license to use, store, and process your content solely for the purpose of providing the Service.
                        </p>

                        <h3 className="text-xl font-medium text-orange-400">5.2 Our Content</h3>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            The Service, including its original content, features, and functionality, is owned by Reply and is protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                        </p>

                        <h3 className="text-xl font-medium text-orange-400">5.3 Feedback</h3>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            Any feedback, suggestions, or ideas you provide about the Service may be used by us without any obligation to compensate you.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">6. YouTube API Compliance</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            Our Service uses YouTube API Services. By using Reply, you also agree to be bound by the YouTube Terms of Service: <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">https://www.youtube.com/t/terms</a>
                        </p>
                        <p className="text-[#A1A1AA] leading-relaxed">You acknowledge that:</p>
                        <ul className="list-disc list-inside text-[#A1A1AA] space-y-2 ml-4">
                            <li>Reply accesses YouTube on your behalf using OAuth 2.0 authorization</li>
                            <li>You are responsible for ensuring your use complies with YouTube's policies</li>
                            <li>YouTube may impose rate limits or restrictions that affect Service availability</li>
                            <li>Changes to YouTube's API or policies may impact Service functionality</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">7. Prohibited Uses</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">You may not use the Service to:</p>
                        <ul className="list-disc list-inside text-[#A1A1AA] space-y-2 ml-4">
                            <li>Violate any applicable law or regulation</li>
                            <li>Infringe upon the intellectual property rights of others</li>
                            <li>Transmit any malicious code, viruses, or harmful content</li>
                            <li>Attempt to reverse engineer, decompile, or disassemble the Service</li>
                            <li>Use automated scripts or bots beyond the intended functionality</li>
                            <li>Overwhelm or disable the Service through excessive requests</li>
                            <li>Impersonate any person or entity</li>
                            <li>Engage in any activity that could damage, disable, or impair the Service</li>
                            <li>Collect or harvest user information without consent</li>
                            <li>Use the Service for any illegal or unauthorized purpose</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">8. Subscription and Payments</h2>

                        <h3 className="text-xl font-medium text-orange-400">8.1 Free and Paid Plans</h3>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            Reply may offer both free and paid subscription plans. Features, limitations, and pricing for each plan are described on our website and may change from time to time.
                        </p>

                        <h3 className="text-xl font-medium text-orange-400">8.2 Billing</h3>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            For paid subscriptions, you agree to pay all applicable fees. Fees are billed in advance on a monthly or annual basis and are non-refundable except as required by law.
                        </p>

                        <h3 className="text-xl font-medium text-orange-400">8.3 Cancellation</h3>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            You may cancel your subscription at any time through your account settings. Upon cancellation, you will continue to have access to paid features until the end of your current billing period.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">9. Disclaimer of Warranties</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
                        </p>
                        <ul className="list-disc list-inside text-[#A1A1AA] space-y-2 ml-4">
                            <li>Implied warranties of merchantability and fitness for a particular purpose</li>
                            <li>Warranties that the Service will be uninterrupted, timely, secure, or error-free</li>
                            <li>Warranties regarding the accuracy or reliability of any information obtained through the Service</li>
                            <li>Warranties that defects will be corrected</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">10. Limitation of Liability</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW, REPLY AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
                        </p>
                        <ul className="list-disc list-inside text-[#A1A1AA] space-y-2 ml-4">
                            <li>Loss of profits, revenue, or data</li>
                            <li>YouTube account suspension or termination resulting from use of the Service</li>
                            <li>Damage to your reputation arising from automated replies</li>
                            <li>Service interruptions or outages</li>
                            <li>Any unauthorized access to or alteration of your data</li>
                        </ul>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE AMOUNT PAID BY YOU TO US DURING THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">11. Indemnification</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            You agree to indemnify, defend, and hold harmless Reply and its officers, directors, employees, agents, licensors, and suppliers from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to:
                        </p>
                        <ul className="list-disc list-inside text-[#A1A1AA] space-y-2 ml-4">
                            <li>Your violation of these Terms</li>
                            <li>Your use of the Service</li>
                            <li>Content you create or transmit through the Service</li>
                            <li>Your violation of any third-party rights</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">12. Governing Law and Disputes</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Reply operates, without regard to its conflict of law provisions.
                        </p>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            Any disputes arising out of or relating to these Terms or the Service shall be resolved through binding arbitration, except that either party may seek injunctive or other equitable relief in any court of competent jurisdiction.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">13. Changes to Terms</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            We reserve the right to modify these Terms at any time. We will notify you of any material changes by posting the updated Terms on this page and updating the "Last updated" date. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms.
                        </p>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            It is your responsibility to review these Terms periodically for changes. If you do not agree to the modified Terms, you must discontinue use of the Service.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">14. Severability</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">15. Entire Agreement</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            These Terms, together with our Privacy Policy, constitute the entire agreement between you and Reply regarding the use of the Service and supersede all prior agreements and understandings.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">16. Contact Information</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            If you have any questions about these Terms, please contact us:
                        </p>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                            <p className="text-white font-medium">Reply Legal</p>
                            <p className="text-[#A1A1AA]">Email: legal@tryreply.app</p>
                            <p className="text-[#A1A1AA]">Response Time: Within 5 business days</p>
                        </div>
                    </section>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 py-8 mt-16">
                <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-[#52525B]">© 2026 Reply. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <Link href="/privacy" className="text-sm text-[#52525B] hover:text-white transition-colors">Privacy</Link>
                        <Link href="/terms" className="text-sm text-[#52525B] hover:text-white transition-colors">Terms</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

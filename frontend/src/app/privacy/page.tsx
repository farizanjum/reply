"use client";

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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
                    <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">Privacy Policy</h1>
                    <p className="text-[#A1A1AA]">Last updated: December 14, 2024</p>
                </div>

                <div className="prose prose-invert prose-lg max-w-none space-y-8">
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">1. Introduction</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            Welcome to Reply ("we," "our," or "us"). We are committed to protecting your privacy and ensuring transparency about how we collect, use, and safeguard your personal information. This Privacy Policy explains our practices regarding data collection when you use our YouTube comment auto-reply service (the "Service").
                        </p>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            By accessing or using Reply, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree with our policies, please do not use our Service.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">2. Information We Collect</h2>

                        <h3 className="text-xl font-medium text-orange-400">2.1 Information You Provide</h3>
                        <ul className="list-disc list-inside text-[#A1A1AA] space-y-2 ml-4">
                            <li><strong className="text-white">Google Account Information:</strong> When you authenticate with Google OAuth, we receive your Google account email, profile name, and profile picture.</li>
                            <li><strong className="text-white">YouTube Channel Data:</strong> We access your YouTube channel information, including channel ID, channel name, and subscriber count.</li>
                            <li><strong className="text-white">Reply Templates:</strong> Custom reply templates and keywords you create within the Service.</li>
                            <li><strong className="text-white">Video Preferences:</strong> Settings you configure for individual videos, including auto-reply toggles and template selections.</li>
                        </ul>

                        <h3 className="text-xl font-medium text-orange-400">2.2 Information We Collect Automatically</h3>
                        <ul className="list-disc list-inside text-[#A1A1AA] space-y-2 ml-4">
                            <li><strong className="text-white">YouTube Comments:</strong> We read comments on your videos to analyze and respond to them based on your configured keywords and templates.</li>
                            <li><strong className="text-white">Usage Data:</strong> Information about how you interact with our Service, including pages visited, features used, and actions taken.</li>
                            <li><strong className="text-white">Device Information:</strong> Browser type, operating system, device identifiers, and IP address for security and analytics purposes.</li>
                            <li><strong className="text-white">Cookies:</strong> We use essential cookies to maintain your session and preferences.</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">3. How We Use Your Information</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">We use the collected information for the following purposes:</p>
                        <ul className="list-disc list-inside text-[#A1A1AA] space-y-2 ml-4">
                            <li><strong className="text-white">Service Delivery:</strong> To provide, operate, and maintain the auto-reply functionality on your YouTube videos.</li>
                            <li><strong className="text-white">Comment Analysis:</strong> To read and analyze comments on your videos to match them against your configured keywords.</li>
                            <li><strong className="text-white">Reply Generation:</strong> To generate and post replies on your behalf using your configured templates.</li>
                            <li><strong className="text-white">Account Management:</strong> To create and manage your Reply account, including authentication and authorization.</li>
                            <li><strong className="text-white">Analytics:</strong> To provide you with insights about reply performance, engagement metrics, and usage statistics.</li>
                            <li><strong className="text-white">Security:</strong> To detect, prevent, and address technical issues, fraud, and abuse.</li>
                            <li><strong className="text-white">Communication:</strong> To send you important updates about the Service, including security alerts and policy changes.</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">4. Data Sharing and Disclosure</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
                        <ul className="list-disc list-inside text-[#A1A1AA] space-y-2 ml-4">
                            <li><strong className="text-white">With YouTube/Google:</strong> To interact with the YouTube API on your behalf for reading comments and posting replies.</li>
                            <li><strong className="text-white">Service Providers:</strong> With trusted third-party service providers who assist us in operating the Service (e.g., hosting, analytics), bound by confidentiality agreements.</li>
                            <li><strong className="text-white">Legal Requirements:</strong> When required by law, court order, or governmental authority.</li>
                            <li><strong className="text-white">Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, with prior notice to users.</li>
                            <li><strong className="text-white">With Your Consent:</strong> For any other purpose with your explicit consent.</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">5. Data Security</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            We implement industry-standard security measures to protect your personal information, including:
                        </p>
                        <ul className="list-disc list-inside text-[#A1A1AA] space-y-2 ml-4">
                            <li>Encryption of data in transit using TLS/SSL protocols</li>
                            <li>Secure storage of OAuth tokens with encryption at rest</li>
                            <li>Regular security audits and vulnerability assessments</li>
                            <li>Access controls limiting employee access to user data</li>
                            <li>Rate limiting and request throttling to prevent abuse</li>
                        </ul>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">6. Data Retention</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            We retain your personal information for as long as your account is active or as needed to provide the Service. You may request deletion of your data at any time. Upon account deletion:
                        </p>
                        <ul className="list-disc list-inside text-[#A1A1AA] space-y-2 ml-4">
                            <li>Your account information will be permanently deleted within 30 days</li>
                            <li>OAuth tokens will be immediately revoked</li>
                            <li>Reply templates and video settings will be permanently removed</li>
                            <li>Aggregated, anonymized analytics data may be retained for service improvement</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">7. Your Rights and Choices</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">Depending on your location, you may have the following rights:</p>
                        <ul className="list-disc list-inside text-[#A1A1AA] space-y-2 ml-4">
                            <li><strong className="text-white">Access:</strong> Request a copy of the personal data we hold about you.</li>
                            <li><strong className="text-white">Correction:</strong> Request correction of inaccurate or incomplete data.</li>
                            <li><strong className="text-white">Deletion:</strong> Request deletion of your personal data.</li>
                            <li><strong className="text-white">Portability:</strong> Request transfer of your data to another service.</li>
                            <li><strong className="text-white">Objection:</strong> Object to certain processing of your data.</li>
                            <li><strong className="text-white">Revoke Access:</strong> Disconnect your Google account and revoke OAuth permissions at any time through your Google Account settings.</li>
                        </ul>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            To exercise these rights, please contact us at privacy@reply.app or use the account settings within the Service.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">8. YouTube API Services</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            Our Service uses YouTube API Services. By using Reply, you are also bound by the Google Privacy Policy: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">https://policies.google.com/privacy</a>
                        </p>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            You can revoke Reply's access to your YouTube data at any time via the Google security settings page: <a href="https://security.google.com/settings/security/permissions" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">https://security.google.com/settings/security/permissions</a>
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">9. Children's Privacy</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            Reply is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child without parental consent, we will take steps to delete that information promptly.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">10. International Data Transfers</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            Your information may be transferred to and processed in countries other than your own. We ensure that such transfers comply with applicable data protection laws and that appropriate safeguards are in place.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">11. Changes to This Policy</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of the Service after changes become effective constitutes acceptance of the revised policy.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">12. Contact Us</h2>
                        <p className="text-[#A1A1AA] leading-relaxed">
                            If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
                        </p>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                            <p className="text-white font-medium">Reply Support</p>
                            <p className="text-[#A1A1AA]">Email: privacy@reply.app</p>
                            <p className="text-[#A1A1AA]">Response Time: Within 48 hours</p>
                        </div>
                    </section>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 py-8 mt-16">
                <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-[#52525B]">© 2025 Reply. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <Link href="/privacy" className="text-sm text-[#52525B] hover:text-white transition-colors">Privacy</Link>
                        <Link href="/terms" className="text-sm text-[#52525B] hover:text-white transition-colors">Terms</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

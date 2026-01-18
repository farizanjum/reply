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
                    <p className="text-[#A1A1AA]">Last updated: January 18, 2026</p>
                </div>

                <div className="space-y-10">
                    {/* Section 1 */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">1. Introduction</h2>
                        <p className="text-[#A1A1AA] leading-relaxed text-base">
                            Welcome to <span className="text-white font-semibold">reply.</span> This Privacy Policy constitutes a legally binding agreement between you and <span className="text-white font-semibold">Fariz Anjum</span>, a sole proprietorship operating under the brand name &quot;reply.&quot; (hereinafter referred to as &quot;reply.&quot;, &quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, and &quot;our&quot;).
                        </p>
                        <p className="text-[#A1A1AA] leading-relaxed text-base">
                            We are committed to protecting your privacy and ensuring transparency about how we collect, use, and safeguard your personal information. This Privacy Policy explains our practices regarding data collection, processing, and storage when you access our website, applications, and services (collectively, the &quot;Service&quot;).
                        </p>
                        <p className="text-[#A1A1AA] leading-relaxed text-base">
                            By accessing or using the Service, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree with our policies and practices, please do not use our Service.
                        </p>
                    </section>

                    {/* Section 2 */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">2. Information We Collect</h2>
                        <p className="text-[#A1A1AA] leading-relaxed text-base">
                            We collect information to provide, improve, and protect our Service. This includes information you provide directly, information collected automatically, and data received from third-party sources (specifically Google and YouTube).
                        </p>

                        <h3 className="text-xl font-medium text-orange-400 pt-2">2.1 Information You Provide</h3>
                        <ul className="space-y-3 text-[#A1A1AA] text-base">
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Account Information:</span> When you register using Google OAuth, we collect your primary Google email address, profile name, and profile picture to authenticate your identity.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Service Configuration:</span> Data you input into the Service, including custom reply templates, keyword triggers, and individual video configuration settings.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Communications:</span> Information provided when you contact our support team, including your email address and the content of your messages.</span>
                            </li>
                        </ul>

                        <h3 className="text-xl font-medium text-orange-400 pt-2">2.2 Information from YouTube API Services</h3>
                        <p className="text-[#A1A1AA] leading-relaxed text-base">As a YouTube-focused tool, we access specific data via YouTube API Services. This includes:</p>
                        <ul className="space-y-3 text-[#A1A1AA] text-base">
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Channel Data:</span> Your YouTube Channel ID, channel name, and subscriber counts.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Content Data:</span> Metadata of your videos (titles, IDs, descriptions) required to identify where comments are located.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Comment Data:</span> The text, author name, and timestamp of public comments posted on your videos, which are processed to generate automated replies.</span>
                            </li>
                        </ul>

                        <h3 className="text-xl font-medium text-orange-400 pt-2">2.3 Information Collected Automatically</h3>
                        <ul className="space-y-3 text-[#A1A1AA] text-base">
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Usage Data:</span> Details of your visits to our Service, including traffic data, logs, and other communication data and the resources that you access and use.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Device and Technical Data:</span> Information about your computer and internet connection, including your IP address, operating system, and browser type.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Cookies and Tracking Technologies:</span> We use cookies to operate the Service, remember your preferences, and maintain your session security.</span>
                            </li>
                        </ul>
                    </section>

                    {/* Section 3 */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">3. How We Use Your Information</h2>
                        <p className="text-[#A1A1AA] leading-relaxed text-base">We use the information we collect for specific business purposes, including to:</p>
                        <ul className="space-y-3 text-[#A1A1AA] text-base">
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Provide the Service:</span> Process YouTube comments and publish replies on your behalf based on your configured templates.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Authenticate Users:</span> Verify your identity and maintain the security of your account via Google OAuth.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Improve the Service:</span> Analyze usage patterns to develop new features and enhance user experience.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Customer Support:</span> Respond to your comments, questions, and requests.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Security:</span> Detect, prevent, and address fraud, breach of terms, and technical issues.</span>
                            </li>
                        </ul>
                    </section>

                    {/* Section 4 */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">4. Google User Data and Limited Use Policy</h2>
                        <p className="text-[#A1A1AA] leading-relaxed text-base">
                            Our use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">Google API Services User Data Policy</a>, including the Limited Use requirements.
                        </p>
                        <ul className="space-y-3 text-[#A1A1AA] text-base">
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">No Surveillance:</span> We do not use Google User Data for surveillance purposes.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">No Sale of Data:</span> We do not sell your Google User Data to third parties.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Proportionality:</span> We only request access to the specific Google user data (scopes) necessary to provide the features of our Service.</span>
                            </li>
                        </ul>
                    </section>

                    {/* Section 5 */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">5. Data Sharing and Disclosure</h2>
                        <p className="text-[#A1A1AA] leading-relaxed text-base">
                            We respect the confidentiality of your information. We do not sell or rent your personal data. We may disclose your information only in the following situations:
                        </p>
                        <ul className="space-y-3 text-[#A1A1AA] text-base">
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">With Service Providers:</span> We may share data with trusted third-party vendors (e.g., cloud hosting providers, analytics services) who perform services on our behalf and are bound by confidentiality obligations.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Legal Compliance:</span> We may disclose information if required to do so by law or in the good-faith belief that such action is necessary to comply with state and federal laws, or in response to a court order, judicial or other government subpoena, or warrant.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Business Transfers:</span> If we are involved in a merger, acquisition, financing due diligence, reorganization, bankruptcy, or sale of all or a portion of our assets, your information may be transferred as part of that transaction.</span>
                            </li>
                        </ul>
                    </section>

                    {/* Section 6 */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">6. Data Retention</h2>
                        <p className="text-[#A1A1AA] leading-relaxed text-base">
                            We retain your personal information only for as long as is necessary for the purposes set out in this Privacy Policy.
                        </p>
                        <ul className="space-y-3 text-[#A1A1AA] text-base">
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Active Accounts:</span> We retain your data while your account is active to provide the Service.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Deleted Accounts:</span> Upon account deletion, your personal information, OAuth tokens, and configuration data are permanently removed from our active databases within 30 days.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Logs:</span> Server logs and technical data may be retained for a limited period for security and debugging purposes before being automatically overwritten.</span>
                            </li>
                        </ul>
                    </section>

                    {/* Section 7 */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">7. Data Security</h2>
                        <p className="text-[#A1A1AA] leading-relaxed text-base">
                            We implement appropriate technical and organizational measures designed to protect the security of your personal information, including:
                        </p>
                        <ul className="space-y-3 text-[#A1A1AA] text-base">
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Encryption:</span> Data is encrypted in transit using TLS 1.2+ protocols.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Token Security:</span> OAuth tokens are stored using industry-standard encryption at rest.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Access Control:</span> Access to personal data is strictly restricted to authorized personnel who require access to perform their job functions.</span>
                            </li>
                        </ul>
                    </section>

                    {/* Section 8 */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">8. Your Rights</h2>
                        <p className="text-[#A1A1AA] leading-relaxed text-base">Depending on your jurisdiction, you may have the right to:</p>
                        <ul className="space-y-3 text-[#A1A1AA] text-base">
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Access and Portability:</span> Request a copy of the personal data we hold about you.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Correction:</span> Request that we correct inaccurate or incomplete data.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Deletion:</span> Request the permanent deletion of your account and associated data.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Revocation of Consent:</span> You may revoke our access to your Google/YouTube account at any time via the Google Security Settings page (linked in Section 9).</span>
                            </li>
                        </ul>
                        <p className="text-[#A1A1AA] leading-relaxed text-base">
                            To exercise these rights, please contact us at <a href="mailto:legal@tryreply.app" className="text-orange-400 hover:text-orange-300 underline">legal@tryreply.app</a>.
                        </p>
                    </section>

                    {/* Section 9 */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">9. Third-Party Links and YouTube</h2>
                        <p className="text-[#A1A1AA] leading-relaxed text-base">
                            Our Service utilizes YouTube API Services. By using our Service, you agree to be bound by the YouTube Terms of Service and acknowledge the Google Privacy Policy.
                        </p>
                        <ul className="space-y-3 text-[#A1A1AA] text-base">
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">YouTube Terms of Service:</span> <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline break-all">https://www.youtube.com/t/terms</a></span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Google Privacy Policy:</span> <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline break-all">https://policies.google.com/privacy</a></span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-orange-400 mt-1.5">•</span>
                                <span><span className="text-white font-medium">Revoking Access:</span> You can revoke our access to your data via the Google Security Settings page: <a href="https://security.google.com/settings/security/permissions" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline break-all">https://security.google.com/settings/security/permissions</a></span>
                            </li>
                        </ul>
                    </section>

                    {/* Section 10 */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">10. Children&apos;s Privacy</h2>
                        <p className="text-[#A1A1AA] leading-relaxed text-base">
                            Our Service is not directed to children under the age of 18. We do not knowingly collect personal information from children. If we learn that we have collected personal information from a child without parental consent, we will take steps to delete that information.
                        </p>
                    </section>

                    {/* Section 11 */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">11. International Data Transfers</h2>
                        <p className="text-[#A1A1AA] leading-relaxed text-base">
                            Your information, including personal data, may be transferred to—and maintained on—computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ from those from your jurisdiction. By using the Service, you consent to this transfer.
                        </p>
                    </section>

                    {/* Section 12 */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">12. Changes to This Policy</h2>
                        <p className="text-[#A1A1AA] leading-relaxed text-base">
                            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date at the top of this policy. You are advised to review this Privacy Policy periodically for any changes.
                        </p>
                    </section>

                    {/* Section 13 */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white border-b border-white/10 pb-2">13. Contact Information</h2>
                        <p className="text-[#A1A1AA] leading-relaxed text-base">
                            If you have any questions about this Privacy Policy, please contact us:
                        </p>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                            <p className="text-white font-semibold text-lg">reply. Legal</p>
                            <div className="space-y-3 text-base">
                                <p className="text-[#A1A1AA]"><span className="text-orange-400 font-medium">Proprietor:</span> Fariz Anjum</p>
                                <p className="text-[#A1A1AA]"><span className="text-orange-400 font-medium">Registered Office:</span> Falah Nagar, Post Bilariyaganj, Tehsil Sagari, Azamgarh, Uttar Pradesh, 276121, India</p>
                                <p className="text-[#A1A1AA]"><span className="text-orange-400 font-medium">Email:</span> <a href="mailto:legal@tryreply.app" className="text-orange-400 hover:text-orange-300 underline">legal@tryreply.app</a></p>
                                <p className="text-[#A1A1AA]"><span className="text-orange-400 font-medium">Response Time:</span> Within 5 business days</p>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 py-8 mt-16">
                <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-[#52525B]">© 2026 reply. (Fariz Anjum). All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <Link href="/privacy" className="text-sm text-[#52525B] hover:text-white transition-colors">Privacy</Link>
                        <Link href="/terms" className="text-sm text-[#52525B] hover:text-white transition-colors">Terms</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

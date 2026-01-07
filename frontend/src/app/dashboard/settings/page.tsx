'use client';

import { Card, Button } from '@/components/ui';
import { Settings, User, Bell, Shield, Key, Youtube, LogOut, Link2, Mail, Lock, Plus, Check, Trash2, AlertTriangle, Users, ShieldAlert } from 'lucide-react';
import { useSession, signOut, signIn, authClient } from '@/lib/auth-client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ReAuthModal } from '@/components/ui/ReAuthModal';
import { useYouTubeSync } from '@/lib/useYouTubeSync';
import { connectYouTube } from '@/lib/youtube-connect';
import { toast } from 'sonner';

export default function SettingsPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const user = session?.user as any;
    const [activeTab, setActiveTab] = useState('profile');

    // Multi-tab sync for YouTube state
    const { broadcast } = useYouTubeSync();

    // Check if user is accessing via delegation (restricted access)
    const [isDelegation, setIsDelegation] = useState(false);

    useEffect(() => {
        // Check sessionStorage for delegation flag
        const delegationFlag = sessionStorage.getItem('isDelegation');
        if (delegationFlag === 'true') {
            setIsDelegation(true);
        }
    }, []);

    // Delegation password state
    const [hasPassword, setHasPassword] = useState<boolean | null>(null);
    const [showAddPassword, setShowAddPassword] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // YouTube connection state
    const [youtubeConnected, setYoutubeConnected] = useState<boolean>(user?.youtubeConnected ?? false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

    // Re-auth modal state
    const [showReAuthModal, setShowReAuthModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<'remove-password' | 'link-google' | null>(null);

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'connections', label: 'Connections', icon: Link2 },
        { id: 'delegation', label: 'Delegation', icon: Users },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'api', label: 'API Keys', icon: Key },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    // Check password status on mount
    useEffect(() => {
        checkPasswordStatus();
    }, []);

    // Update YouTube connection status when user changes
    useEffect(() => {
        if (user) {
            setYoutubeConnected(user.youtubeConnected ?? false);
        }
    }, [user]);

    // YouTube disconnect handler
    const handleDisconnectYouTube = async () => {
        setIsDisconnecting(true);
        setStatusMessage(null);

        try {
            const response = await fetch('/api/youtube/disconnect', {
                method: 'POST',
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                // Update local state
                setYoutubeConnected(false);
                setShowDisconnectConfirm(false);

                // Broadcast to all other tabs
                broadcast({ connected: false, channelName: null });

                // Force refresh auth session to update cookie
                await authClient.getSession();

                // Show toast notification
                toast.success('YouTube Disconnected', {
                    description: data.message || 'You can reconnect anytime.',
                });

                // Navigate to dashboard after short delay
                setTimeout(() => {
                    router.push('/dashboard');
                }, 1000);
            } else {
                toast.error('Disconnect Failed', {
                    description: data.error || 'Failed to disconnect YouTube',
                });
                setStatusMessage({ type: 'error', text: data.error || 'Failed to disconnect' });
            }
        } catch (error) {
            toast.error('Disconnect Failed', {
                description: 'An unexpected error occurred',
            });
            setStatusMessage({ type: 'error', text: 'Failed to disconnect YouTube' });
        } finally {
            setIsDisconnecting(false);
        }
    };

    // Block delegation users from settings
    if (isDelegation) {
        return (
            <div className="space-y-6">
                <Card variant="glass" className="p-8 bg-red-500/5 border-red-500/20 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                            <ShieldAlert className="w-8 h-8 text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
                            <p className="text-[#A1A1AA] mb-4">
                                Settings are not available for delegation accounts.<br />
                                Only the account owner can modify settings.
                            </p>
                        </div>
                        <Button
                            variant="primary"
                            onClick={() => router.push('/dashboard')}
                        >
                            Return to Dashboard
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    const checkPasswordStatus = async () => {
        try {
            const response = await fetch('/api/auth/check-password-status');
            const data = await response.json();
            if (response.ok) {
                setHasPassword(data.hasPassword);
            }
        } catch (error) {
            console.error('Failed to check password status:', error);
        }
    };

    const handleSetPassword = async () => {
        if (newPassword !== confirmPassword) {
            setStatusMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        if (newPassword.length < 8) {
            setStatusMessage({ type: 'error', text: 'Password must be at least 8 characters' });
            return;
        }

        setIsLoading(true);
        setStatusMessage(null);

        try {
            const response = await fetch('/api/auth/set-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    newPassword,
                    currentPassword: hasPassword ? currentPassword : undefined,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatusMessage({ type: 'success', text: data.message });
                setHasPassword(true);
                setShowAddPassword(false);
                setShowChangePassword(false);
                setNewPassword('');
                setConfirmPassword('');
                setCurrentPassword('');
            } else {
                setStatusMessage({ type: 'error', text: data.error });
            }
        } catch (error) {
            setStatusMessage({ type: 'error', text: 'Failed to set password' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemovePassword = async () => {
        setPendingAction('remove-password');
        setShowReAuthModal(true);
    };

    const handleReAuthSuccess = async () => {
        if (pendingAction === 'remove-password') {
            // The re-auth was successful, now actually remove the password
            // We need another API call because verify-password only verifies
            // For simplicity, we'll call remove-password with the password again
            // In production, you might use a short-lived token from verify-password
            setShowReAuthModal(false);
            setPendingAction(null);

            // Show success - the password was already verified in the modal
            // Now we need the user to confirm one more time
            // Actually, let's just remove it directly since they just verified
            setStatusMessage({ type: 'success', text: 'To complete removal, enter your password again in the form below.' });
        } else if (pendingAction === 'link-google') {
            // Proceed with Google OAuth linking
            await signIn.social({
                provider: 'google',
                callbackURL: '/dashboard/settings',
            });
        }
    };

    const handleActualRemove = async () => {
        if (!currentPassword) {
            setStatusMessage({ type: 'error', text: 'Please enter your password' });
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/remove-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: currentPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatusMessage({ type: 'success', text: data.message });
                setHasPassword(false);
                setCurrentPassword('');
            } else {
                setStatusMessage({ type: 'error', text: data.error });
            }
        } catch (error) {
            setStatusMessage({ type: 'error', text: 'Failed to remove password' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnectGoogle = () => {
        if (hasPassword) {
            // Require re-auth before linking OAuth
            setPendingAction('link-google');
            setShowReAuthModal(true);
        } else {
            // No password set, allow direct OAuth linking
            signIn.social({
                provider: 'google',
                callbackURL: '/dashboard/settings',
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Re-Auth Modal */}
            <ReAuthModal
                isOpen={showReAuthModal}
                onClose={() => {
                    setShowReAuthModal(false);
                    setPendingAction(null);
                }}
                onSuccess={handleReAuthSuccess}
                action={
                    pendingAction === 'remove-password'
                        ? 'remove your delegation password'
                        : pendingAction === 'link-google'
                            ? 'connect your Google account'
                            : 'perform this action'
                }
            />

            <div>
                <h1 className="text-3xl font-bold mb-2 text-white">Settings</h1>
                <p className="text-[#A1A1AA]">Manage your account preferences and configurations</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id
                            ? 'border-orange-500 text-orange-500'
                            : 'border-transparent text-[#A1A1AA] hover:text-white'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className="space-y-4">
                    <Card variant="glass" className="p-6 bg-white/[0.02] backdrop-blur-sm border-white/5">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-2xl shadow-orange-500/10 border border-white/10 flex-shrink-0">
                                {user?.image ? (
                                    <img src={user.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                                        <span className="text-2xl font-bold text-white">
                                            {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">{user?.name || user?.email?.split('@')[0] || 'User'}</h3>
                                <p className="text-sm text-[#A1A1AA]">{user?.email}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-[#EDEDED]">Display Name</label>
                                <input
                                    type="text"
                                    value={user?.name || ''}
                                    disabled
                                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-sm text-white disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-[#EDEDED]">Email</label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-sm text-white disabled:opacity-50"
                                />
                            </div>
                            {youtubeConnected ? (
                                <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                                    <Youtube className="w-5 h-5 text-green-500" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-white">YouTube Connected</p>
                                        <p className="text-xs text-[#A1A1AA]">{user?.channelName || 'Your YouTube account is linked'}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                                    <Youtube className="w-5 h-5 text-orange-500" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-white">YouTube Not Connected</p>
                                        <p className="text-xs text-[#A1A1AA]">Connect to manage your videos and auto-replies</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* Connections Tab */}
            {activeTab === 'connections' && (
                <div className="space-y-4">
                    <Card variant="glass" className="p-6 bg-white/[0.02] backdrop-blur-sm border-white/5">
                        <h3 className="text-lg font-semibold text-white mb-4">Connected Accounts</h3>
                        <p className="text-sm text-[#A1A1AA] mb-6">
                            Manage your login methods and connected services
                        </p>

                        <div className="space-y-4">
                            {/* Google/YouTube Connection */}
                            <div className="p-4 bg-[#0A0A0A] rounded-xl border border-white/5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
                                            <Youtube className="w-5 h-5 text-red-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">Google / YouTube</p>
                                            <p className="text-xs text-[#A1A1AA]">
                                                {youtubeConnected
                                                    ? (user?.channelName || user?.email || 'Connected for YouTube access')
                                                    : 'Not connected - Connect to manage videos'}
                                            </p>
                                        </div>
                                    </div>
                                    {youtubeConnected ? (
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2 text-green-500">
                                                <Check className="w-4 h-4" />
                                                <span className="text-xs font-medium">Connected</span>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setShowDisconnectConfirm(true)}
                                                className="text-xs text-neutral-400 hover:text-red-400"
                                            >
                                                Disconnect
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            onClick={() => connectYouTube('/dashboard/settings')}
                                        >
                                            Connect
                                        </Button>
                                    )}
                                </div>

                                {/* Disconnect Confirmation */}
                                {showDisconnectConfirm && (
                                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-red-400 mb-1">Disconnect YouTube?</p>
                                                <p className="text-xs text-[#A1A1AA] mb-3">
                                                    {hasPassword
                                                        ? 'Your YouTube connection will be removed. You can reconnect anytime.'
                                                        : 'Your YouTube access will be revoked, but you\'ll still use Google to log in.'}
                                                </p>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setShowDisconnectConfirm(false)}
                                                        autoFocus
                                                        className="border border-white/20"
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="danger"
                                                        onClick={handleDisconnectYouTube}
                                                        disabled={isDisconnecting}
                                                    >
                                                        {isDisconnecting ? 'Disconnecting...' : 'Yes, Disconnect'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Delegation Password Status */}
                            <div className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-xl border border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                                        <Lock className="w-5 h-5 text-orange-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Delegation Password</p>
                                        <p className="text-xs text-[#A1A1AA]">
                                            {hasPassword === null
                                                ? 'Loading...'
                                                : hasPassword
                                                    ? 'Password set - Account delegation enabled'
                                                    : 'Not configured - Set up in Delegation tab'}
                                        </p>
                                    </div>
                                </div>
                                {hasPassword && (
                                    <div className="flex items-center gap-2 text-green-500">
                                        <Check className="w-4 h-4" />
                                        <span className="text-xs font-medium">Active</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Delegation Tab */}
            {activeTab === 'delegation' && (
                <div className="space-y-4">
                    {/* Status Message */}
                    {statusMessage && (
                        <div className={`p-4 rounded-xl border ${statusMessage.type === 'success'
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}>
                            <p className="text-sm">{statusMessage.text}</p>
                        </div>
                    )}

                    {/* Info Card */}
                    <Card variant="glass" className="p-4 bg-orange-500/5 border-orange-500/20">
                        <div className="flex items-start gap-3">
                            <Users className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-white mb-1">Account Delegation</p>
                                <p className="text-xs text-[#A1A1AA]">
                                    Set a delegation password to allow trusted team members to access your account.
                                    Share your email and the delegation password with them. You can revoke access at any time by removing the password.
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card variant="glass" className="p-6 bg-white/[0.02] backdrop-blur-sm border-white/5">
                        <h3 className="text-lg font-semibold text-white mb-4">Delegation Password</h3>

                        {hasPassword === null ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                            </div>
                        ) : hasPassword ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Check className="w-4 h-4 text-green-500" />
                                        <p className="text-sm font-medium text-green-400">Delegation Password Active</p>
                                    </div>
                                    <p className="text-xs text-[#A1A1AA]">
                                        Team members can log in with your email and delegation password.
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => {
                                            setShowChangePassword(true);
                                            setStatusMessage(null);
                                        }}
                                    >
                                        <Lock className="w-4 h-4 mr-2" />
                                        Change Password
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="danger"
                                        onClick={handleRemovePassword}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Remove Password
                                    </Button>
                                </div>

                                {/* Change Password Form */}
                                {showChangePassword && (
                                    <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl space-y-4 mt-4">
                                        <div>
                                            <label className="block text-xs font-medium mb-2 text-[#EDEDED]">Current Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525B]" />
                                                <input
                                                    type="password"
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    placeholder="Enter current password"
                                                    className="w-full px-10 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-sm text-white placeholder:text-[#52525B] focus:outline-none focus:border-orange-500"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-2 text-[#EDEDED]">New Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525B]" />
                                                <input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder="Minimum 8 characters"
                                                    className="w-full px-10 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-sm text-white placeholder:text-[#52525B] focus:outline-none focus:border-orange-500"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-2 text-[#EDEDED]">Confirm New Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525B]" />
                                                <input
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    placeholder="Re-enter new password"
                                                    className="w-full px-10 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-sm text-white placeholder:text-[#52525B] focus:outline-none focus:border-orange-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="primary"
                                                onClick={handleSetPassword}
                                                disabled={isLoading || !currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 8}
                                            >
                                                {isLoading ? 'Saving...' : 'Update Password'}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    setShowChangePassword(false);
                                                    setNewPassword('');
                                                    setConfirmPassword('');
                                                    setCurrentPassword('');
                                                    setStatusMessage(null);
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Remove Password Section */}
                                {!showChangePassword && (
                                    <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl mt-4">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-red-400 mb-1">Revoke Delegation Access</p>
                                                <p className="text-xs text-[#A1A1AA] mb-3">
                                                    Enter your delegation password to remove it. This will immediately revoke access for all delegated users.
                                                </p>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525B]" />
                                                        <input
                                                            type="password"
                                                            value={currentPassword}
                                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                                            placeholder="Enter delegation password"
                                                            className="w-full px-10 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-sm text-white placeholder:text-[#52525B] focus:outline-none focus:border-red-500"
                                                        />
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="danger"
                                                        onClick={handleActualRemove}
                                                        disabled={isLoading || !currentPassword}
                                                    >
                                                        {isLoading ? 'Removing...' : 'Remove'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {!showAddPassword ? (
                                    <div className="p-4 bg-[#0A0A0A] rounded-xl border border-white/5">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                                                <Lock className="w-5 h-5 text-orange-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">No Delegation Password Set</p>
                                                <p className="text-xs text-[#A1A1AA]">Set up a password to enable account delegation</p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            onClick={() => {
                                                setShowAddPassword(true);
                                                setStatusMessage(null);
                                            }}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Set Delegation Password
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium mb-2 text-[#EDEDED]">New Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525B]" />
                                                <input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder="Minimum 8 characters"
                                                    className="w-full px-10 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-sm text-white placeholder:text-[#52525B] focus:outline-none focus:border-orange-500"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-2 text-[#EDEDED]">Confirm Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525B]" />
                                                <input
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    placeholder="Re-enter password"
                                                    className="w-full px-10 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-sm text-white placeholder:text-[#52525B] focus:outline-none focus:border-orange-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="primary"
                                                onClick={handleSetPassword}
                                                disabled={isLoading || !newPassword || newPassword !== confirmPassword || newPassword.length < 8}
                                            >
                                                {isLoading ? 'Saving...' : 'Set Password'}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    setShowAddPassword(false);
                                                    setNewPassword('');
                                                    setConfirmPassword('');
                                                    setStatusMessage(null);
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
                <Card variant="glass" className="p-6 bg-white/[0.02] backdrop-blur-sm border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4">Notification Preferences</h3>
                    <div className="space-y-4">
                        {[
                            { label: 'Email notifications for new replies', desc: 'Get notified when auto-replies are sent' },
                            { label: 'Quota warnings', desc: 'Alert me when approaching daily quota limit' },
                            { label: 'Error notifications', desc: 'Notify me of any processing errors' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-xl border border-white/5">
                                <div>
                                    <p className="text-sm font-medium text-white">{item.label}</p>
                                    <p className="text-xs text-[#A1A1AA]">{item.desc}</p>
                                </div>
                                <button className="relative w-12 h-6 rounded-full bg-white/10">
                                    <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform" />
                                </button>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* API Tab */}
            {activeTab === 'api' && (
                <Card variant="glass" className="p-6 bg-white/[0.02] backdrop-blur-sm border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4">YouTube API Configuration</h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Key className="w-5 h-5 text-orange-500" />
                                <p className="text-sm font-medium text-orange-500">Bring Your Own Key (BYOK)</p>
                            </div>
                            <p className="text-xs text-[#A1A1AA] mb-4">
                                Use your own YouTube Data API v3 key for unlimited quota. This gives you full control over your API usage and costs.
                            </p>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium mb-2 text-[#EDEDED]">
                                        YouTube Data API v3 Key
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="password"
                                            placeholder="AIzaSy..."
                                            className="flex-1 px-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-sm text-white placeholder:text-[#52525B] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50"
                                        />
                                        <Button size="sm" variant="primary">
                                            Save Key
                                        </Button>
                                    </div>
                                    <p className="text-xs text-[#52525B] mt-2">
                                        Get your API key from{' '}
                                        <a
                                            href="https://console.cloud.google.com/apis/credentials"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-orange-500 hover:text-orange-400 underline"
                                        >
                                            Google Cloud Console
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <p className="text-sm font-medium text-green-500 mb-1">✓ Default API Active</p>
                            <p className="text-xs text-[#A1A1AA]">Currently using shared API key with daily quota limits</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-[#EDEDED]">Daily Quota Limit</label>
                            <input
                                type="text"
                                value="10,000 units (Shared)"
                                disabled
                                className="w-full px-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-sm text-white disabled:opacity-50"
                            />
                            <p className="text-xs text-[#52525B] mt-2">
                                With BYOK, you'll have your own quota limit (typically 10,000 units/day for free tier)
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
                <Card variant="glass" className="p-6 bg-white/[0.02] backdrop-blur-sm border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4">Security Settings</h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-[#0A0A0A] rounded-xl border border-white/5">
                            <p className="text-sm font-medium text-white mb-2">Active Sessions</p>
                            <p className="text-xs text-[#A1A1AA] mb-4">You are currently signed in on this device</p>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={async () => {
                                    await signOut();
                                    window.location.href = '/auth/login';
                                }}
                                className="w-full"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}

'use client';

import { useState } from 'react';
import { X, Lock, AlertCircle } from 'lucide-react';

interface ReAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    action: string;
}

export function ReAuthModal({ isOpen, onClose, onSuccess, action }: ReAuthModalProps) {
    const [password, setPassword] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleVerify = async () => {
        if (!password.trim()) {
            setError('Please enter your password');
            return;
        }

        setIsVerifying(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/verify-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Verification failed');
                setIsVerifying(false);
                return;
            }

            // Success - clear state and proceed
            setPassword('');
            setError(null);
            setIsVerifying(false);
            onSuccess();
            onClose();
        } catch (err) {
            setError('An error occurred. Please try again.');
            setIsVerifying(false);
        }
    };

    const handleClose = () => {
        setPassword('');
        setError(null);
        setIsVerifying(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                            <Lock className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Security Verification</h2>
                            <p className="text-xs text-[#A1A1AA]">Re-authentication required</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-[#A1A1AA]" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <p className="text-sm text-[#A1A1AA]">
                        Please enter your delegation password to <span className="text-white font-medium">{action}</span>
                    </p>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <span className="text-sm text-red-400">{error}</span>
                        </div>
                    )}

                    {/* Password Input */}
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525B]" />
                        <input
                            type="password"
                            placeholder="Enter your delegation password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                            className="w-full px-10 py-3 bg-neutral-900/50 border border-white/10 rounded-xl text-sm text-white placeholder:text-[#52525B] focus:outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all"
                            autoFocus
                            disabled={isVerifying}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleClose}
                            disabled={isVerifying}
                            className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleVerify}
                            disabled={isVerifying || !password.trim()}
                            className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isVerifying ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                'Verify & Continue'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

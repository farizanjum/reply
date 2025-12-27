'use client';

import { Card } from '@/components/ui';
import { MessageSquare, Search } from 'lucide-react';

export default function MessagesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2 text-white">Messages</h1>
                <p className="text-[#A1A1AA]">Manage your discussions and direct replies</p>
            </div>

            <Card variant="glass" className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 border-white/5 bg-white/[0.02]">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-[#52525B]" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No messages yet</h3>
                <p className="text-[#A1A1AA] max-w-sm mx-auto">
                    Direct messaging and advanced comment management features are coming soon.
                </p>
            </Card>
        </div>
    );
}

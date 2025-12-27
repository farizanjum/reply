import "better-auth";

declare module "better-auth" {
    interface User {
        channelId?: string | null;
        channelName?: string | null;
        channelThumbnail?: string | null;
        youtubeConnected?: boolean;
    }

    interface Session {
        user: User;
    }
}

declare module "better-auth/react" {
    interface User {
        channelId?: string | null;
        channelName?: string | null;
        channelThumbnail?: string | null;
        youtubeConnected?: boolean;
    }
}

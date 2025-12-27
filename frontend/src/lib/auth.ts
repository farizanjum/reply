import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { delegationAuthPlugin } from "./auth-delegation-plugin";

// Only initialize Prisma if DATABASE_URL is available (skip during build)
const prisma = process.env.DATABASE_URL ? new PrismaClient() : null;

// Check if Google OAuth credentials are available
const hasGoogleCredentials = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);


export const auth = betterAuth({
    // Secret for signing tokens and state (CRITICAL for OAuth)
    secret: process.env.BETTER_AUTH_SECRET || "fallback-secret-for-dev-only-change-in-production",

    database: prisma ? prismaAdapter(prisma, {
        provider: "postgresql",
    }) : undefined as any, // Fallback for build time

    // Add delegation auth plugin
    plugins: [delegationAuthPlugin],


    // Base URL configuration
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

    // Trusted origins for OAuth callbacks
    trustedOrigins: [
        "http://localhost:3000",
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.BETTER_AUTH_URL,
    ].filter(Boolean) as string[],

    // Email + Password authentication
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false, // We'll handle verification separately for now
    },

    // Social OAuth providers - only include Google if credentials are present
    socialProviders: hasGoogleCredentials ? {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            // Force account selection and consent to prevent silent re-auth
            prompt: "consent",
            // Disable ID token sign-in to prevent FedCM interference
            disableIdTokenSignIn: true,
            // Request offline access for refresh tokens
            accessType: "offline",
            // YouTube scopes for channel access
            scope: [
                "openid",
                "email",
                "profile",
                "https://www.googleapis.com/auth/youtube.force-ssl",
                "https://www.googleapis.com/auth/youtube.readonly",
            ],
        },
    } : {},


    // Session configuration
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // Update session every 24 hours
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5, // 5 minutes cache
        },
    },

    // Account linking
    account: {
        accountLinking: {
            enabled: true,
            trustedProviders: hasGoogleCredentials ? ["google"] : [],
        },
    },

    // Advanced options for OAuth state management
    advanced: {
        // Use secure cookies only in production
        useSecureCookies: process.env.NODE_ENV === "production",
        // Disable cross subdomain cookies
        crossSubDomainCookies: {
            enabled: false,
        },
        // FIX: Use SameSite=None for OAuth state cookies to prevent state mismatch
        cookiePrefix: "better-auth",
    },
});

export type Session = typeof auth.$Infer.Session;

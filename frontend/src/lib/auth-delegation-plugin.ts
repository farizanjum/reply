import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import bcrypt from "bcryptjs";
import type { BetterAuthPlugin } from "better-auth";
import { prisma } from "./google-token"; // Use shared Prisma instance

// 24 hours in milliseconds (per security requirements for delegation users)
const DELEGATION_SESSION_DURATION = 24 * 60 * 60 * 1000;

export const delegationAuthPlugin = {
    id: "delegation-auth",
    endpoints: {
        delegationLogin: createAuthEndpoint(
            "/delegation-login",
            {
                method: "POST",
            },
            async (ctx) => {
                // Get body from context (Better Auth has already parsed it)
                const body = ctx.body as any;
                const email = body?.email;
                const password = body?.password;

                if (!email || !password) {
                    return ctx.json(
                        { error: "Email and password are required" },
                        { status: 400 }
                    );
                }

                // Find user by email using direct Prisma query
                // (Better Auth's adapter wasn't working due to table mapping issues)
                const user = await prisma.user.findUnique({
                    where: { email: email.toLowerCase() },
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        image: true,
                        emailVerified: true,
                        createdAt: true,
                        updatedAt: true,
                        delegationPassword: true,
                        // YouTube fields for session state
                        youtubeConnected: true,
                        channelName: true,
                        channelId: true,
                    },
                });

                // Check if user exists
                if (!user) {
                    return ctx.json(
                        { error: "Invalid email or password" },
                        { status: 401 }
                    );
                }

                // Check if user has delegation password set
                if (!user.delegationPassword) {
                    return ctx.json(
                        { error: "Delegation login not enabled for this account. Please use Google sign-in." },
                        { status: 401 }
                    );
                }

                // Verify delegation password
                const isValid = await bcrypt.compare(password, user.delegationPassword);

                if (!isValid) {
                    return ctx.json(
                        { error: "Invalid email or password" },
                        { status: 401 }
                    );
                }

                // Generate session token
                const sessionToken = generateSecureToken();
                // 24-hour expiry for delegation sessions (shorter for security)
                const expiresAt = new Date(Date.now() + DELEGATION_SESSION_DURATION);

                // Get request metadata for audit
                const ipAddress = ctx.request?.headers.get("x-forwarded-for") ||
                    ctx.request?.headers.get("x-real-ip") || null;
                const userAgent = ctx.request?.headers.get("user-agent") || null;

                // Create session with isDelegation flag using direct Prisma
                const session = await prisma.session.create({
                    data: {
                        token: sessionToken,
                        userId: user.id,
                        expiresAt: expiresAt,
                        ipAddress: ipAddress,
                        userAgent: userAgent,
                        isDelegation: true, // Mark as delegation session for access control
                    },
                });

                // Log the delegation login for audit trail
                try {
                    await prisma.auditLog.create({
                        data: {
                            userId: user.id,
                            action: "LOGIN_DELEGATION",
                            details: JSON.stringify({
                                sessionId: session.id,
                                email: user.email,
                            }),
                            ipAddress: ipAddress,
                            userAgent: userAgent,
                        },
                    });
                } catch (auditError) {
                    // Don't fail login if audit logging fails
                    console.error("Failed to log audit event:", auditError);
                }

                // Set session cookie using Better Auth's method
                await setSessionCookie(ctx, {
                    session: {
                        id: session.id,
                        token: sessionToken,
                        userId: user.id,
                        expiresAt: expiresAt,
                        createdAt: session.createdAt,
                        updatedAt: session.updatedAt,
                        ipAddress: session.ipAddress || null,
                        userAgent: session.userAgent || null,
                    },
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name || "",
                        image: user.image || null,
                        emailVerified: user.emailVerified,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt,
                        // YouTube fields for UI state (Cookie Diet: no tokens)
                        // @ts-ignore - Custom fields from additionalFields in auth.ts
                        youtubeConnected: user.youtubeConnected || false,
                        channelName: user.channelName || null,
                        channelId: user.channelId || null,
                    } as any,
                });

                return ctx.json({
                    success: true,
                    message: "Logged in successfully",
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        image: user.image,
                    },
                    isDelegation: true, // Let frontend know this is delegation access
                });
            }
        ),
    },
} satisfies BetterAuthPlugin;

function generateSecureToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => chars[byte % chars.length]).join('');
}

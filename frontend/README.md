# Reply Comments - Frontend

Next.js 16 frontend for the YouTube Comment Auto-Reply system with account delegation.

## Features

- 🔐 **Better Auth** - Google OAuth + custom delegation login
- 👥 **Account Delegation** - Share access without sharing OAuth credentials
- 📹 **Video Management** - Configure auto-reply per video
- 📊 **Analytics Dashboard** - Track replies and quota usage
- 🎨 **Modern UI** - Tailwind CSS with dark mode

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Auth**: Better Auth + Prisma
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Prisma ORM)
- **Deployment**: Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run development server
npm run dev
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Better Auth
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000
BACKEND_SECRET_KEY=...

# Email (Unosend)
UNOSEND_API_KEY=...
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/         # Auth endpoints
│   │   ├── youtube/      # YouTube API proxy
│   │   └── sync/         # Token sync
│   ├── auth/             # Auth pages
│   └── dashboard/        # Dashboard pages
├── components/           # React components
│   ├── ui/              # Base UI components
│   └── layout/          # Layout components
├── lib/                  # Utilities
│   ├── auth.ts          # Better Auth config
│   ├── auth-client.ts   # Client-side auth
│   └── google-token.ts  # Token refresh
└── store/               # State management
```

## Account Delegation

Allows account owners to share access with managers:

1. Owner sets delegation password in Settings
2. Manager logs in with owner's email + delegation password
3. Manager has restricted access (no settings)
4. Sessions expire in 24 hours
5. All logins are audit logged

## Deployment

Deploy to Vercel:

```bash
# Build for production
npm run build

# Or push to GitHub and import to Vercel
```

Required Vercel environment variables:
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_API_URL`
- `BACKEND_SECRET_KEY`

## License

MIT

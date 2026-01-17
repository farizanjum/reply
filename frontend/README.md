# Reply - Frontend

Next.js 15 frontend for the YouTube Comment Auto-Reply system.

**Live at:** [tryreply.app](https://tryreply.app)

## Features

- 🔐 **Better Auth** - Google OAuth + delegation login
- 👥 **Account Delegation** - Share access without sharing credentials
- 📹 **Video Management** - Configure auto-reply per video
- 📊 **Analytics Dashboard** - Track replies and quota usage
- 🟢 **System Health** - Real-time backend status monitoring
- 🎨 **Modern UI** - Tailwind CSS with dark mode

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Auth**: Better Auth + Prisma
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Prisma ORM)
- **Deployment**: Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run development server
npm run dev
```

## Environment Variables

```env
# Database (Prisma Accelerate recommended for Vercel)
DATABASE_URL=prisma://accelerate.prisma-data.net/?api_key=...

# Better Auth
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=https://tryreply.app

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Backend API (AWS EC2)
NEXT_PUBLIC_BACKEND_URL=https://your-ec2-ip.nip.io

# JWT Secret (must match backend)
SECRET_KEY=your-32-char-secret

# Email (Unosend)
UNOSEND_API_KEY=your-api-key
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/         # Auth endpoints
│   │   ├── youtube/      # YouTube API proxy
│   │   ├── health/       # System health check
│   │   └── notifications/ # Notification preferences
│   ├── auth/             # Auth pages
│   └── dashboard/        # Dashboard pages
├── components/           # React components
│   └── ui/              # Base UI components
└── lib/                  # Utilities
    ├── auth.ts          # Better Auth config
    └── api.ts           # API client
```

## Deployment

Deploy to Vercel:

1. Connect GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

Required Vercel environment variables:
- `DATABASE_URL` (Prisma Accelerate URL)
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_BACKEND_URL`
- `SECRET_KEY`

## License

MIT

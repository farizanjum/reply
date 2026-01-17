# reply.

A fully automated system that monitors your YouTube videos 24/7 and replies to comments based on keywords with human-like behavior.

**Live at:** [tryreply.app](https://tryreply.app)

## What It Does

- Monitors your YouTube channel videos automatically
- Filters comments by custom keywords (e.g., "MCP", "help", "tutorial")
- Replies automatically with customizable templates
- Prevents duplicate replies with sub-millisecond database checks
- Uses human-like delays to avoid YouTube ban
- Tracks quota usage (10,000 units/day limit)
- Provides analytics dashboard with real-time system health

## Architecture

```
+------------------+
|   Next.js        |  Frontend (Vercel)
|   Frontend       |  - Video management
|   (Vercel)       |  - Settings UI
+--------+---------+  - Analytics
         |
         | HTTPS/REST
         v
+------------------+
|   FastAPI        |  Backend (AWS EC2)
|   Backend        |  - OAuth authentication
|   (Docker)       |  - YouTube API integration
+--------+---------+  - Auto-reply engine
         |
    +----+----+----------+----------+
    |         |          |          |
    v         v          v          v
+--------+ +------+ +--------+ +---------+
|  RDS   | |Redis | |YouTube | | Celery  |
|Postgres| |(Docker)| |  API   | | Worker |
+--------+ +------+ +--------+ +---------+
```

## Infrastructure

| Service | Spec | Cost/Month |
|---------|------|------------|
| AWS EC2 | t3.small (Ubuntu) | ~$15 |
| AWS RDS | PostgreSQL db.t3.micro | ~$13 |
| Elastic IP | 1 (attached) | FREE |
| Vercel | Hobby tier | FREE |
| **TOTAL** | | **~$28/month** |

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/farizanjum/reply.git
cd reply-comments
```

### 2. Backend Setup (Local)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Run locally
uvicorn main:app --reload
```

### 3. Deploy to AWS EC2

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Clone and deploy
git clone https://github.com/farizanjum/reply.git app
cd app

# Configure environment
cp backend/.env.example backend/.env.prod
# Edit .env.prod with production credentials

# Deploy with Docker Compose
sudo docker-compose -f docker-compose.prod.yml up -d
```

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Deploy to Vercel by connecting your GitHub repository.

## Features

### Core Features

- [x] Google OAuth authentication
- [x] YouTube API integration
- [x] Video synchronization
- [x] Keyword-based filtering
- [x] Auto-reply engine
- [x] Duplicate prevention (< 1ms lookup)
- [x] Human-like delays
- [x] Text variation
- [x] Quota management
- [x] Analytics dashboard
- [x] Real-time system health monitoring
- [x] Notification preferences (email alerts)

### Anti-Ban Strategy

1. **Random Delays**
   - Before reply: 0.8-3.5 seconds
   - After reply: 1.0-2.5 seconds
   - Between batches: 2-5 minutes

2. **Batch Processing**
   - Random batch size: 8-15 comments
   - Randomized intervals

3. **Reply Variation**
   - Random greetings
   - Random closings
   - Template selection

4. **Gradual Ramp-up**
   - Week 1: 10 replies/day
   - Week 2: 25 replies/day
   - Week 3: 50 replies/day
   - Week 4: 100 replies/day
   - Week 5+: 180 replies/day

## Configuration

### Video Settings

Each video can be configured with:

```json
{
  "auto_reply_enabled": true,
  "keywords": ["MCP", "help", "tutorial"],
  "reply_templates": [
    "Hey {name}! Check out this resource: {link}",
    "Thanks for watching! Here's what you need: {link}"
  ],
  "schedule_type": "hourly"
}
```

### Environment Variables

**Backend:**
- `DATABASE_URL` - PostgreSQL connection (AWS RDS)
- `REDIS_URL` - Redis connection
- `GOOGLE_CLIENT_ID` - OAuth client ID
- `GOOGLE_CLIENT_SECRET` - OAuth secret
- `YOUTUBE_API_KEY` - YouTube API key
- `SECRET_KEY` - JWT secret
- `FRONTEND_URL` - Frontend URL (https://tryreply.app)
- `REDIRECT_URI` - OAuth redirect

**Frontend:**
- `DATABASE_URL` - Prisma database URL
- `NEXT_PUBLIC_BACKEND_URL` - Backend API URL
- `BETTER_AUTH_SECRET` - Auth secret
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth credentials

## Performance Metrics

- **Duplicate Check**: < 1ms per lookup
- **Batch Check**: 2-5ms for 100 comments
- **Reply Speed**: 100 comments in ~3 minutes
- **Daily Capacity**: 150-180 replies/day (within quota)
- **Uptime**: 99.9% (AWS SLA)

## Project Structure

```
reply-comments/
├── backend/                 # FastAPI backend
│   ├── main.py             # App entry point
│   ├── config.py           # Configuration
│   ├── database_pg.py      # PostgreSQL functions
│   ├── routers/            # API routes
│   ├── services/           # Business logic
│   ├── middleware/         # Auth middleware
│   └── docker-compose.prod.yml
├── frontend/               # Next.js frontend
│   ├── src/app/           # App Router pages
│   ├── src/components/    # React components
│   └── src/lib/           # Utilities
└── README.md               # This file
```

## Security

- OAuth 2.0 authentication
- JWT token-based sessions
- Environment variable secrets
- HTTPS only (Caddy reverse proxy)
- CORS protection
- SQL injection prevention (parameterized queries)

## Monitoring

### View Logs

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# View all container logs
sudo docker-compose -f docker-compose.prod.yml logs --tail=100

# View specific service
sudo docker-compose -f docker-compose.prod.yml logs web --tail=50
```

### Health Check

```bash
curl https://your-api-url/health
# Returns: {"status":"healthy","postgres":true,"redis":true}
```

### Database

```bash
# Connect to RDS PostgreSQL
psql -h your-rds-endpoint -U postgres -d youtube_autoreply
```

## Troubleshooting

### Common Issues

1. **OAuth Error**
   - Verify redirect URI matches Google Console
   - Check client ID and secret

2. **Database Connection Error**
   - Verify DATABASE_URL in .env.prod
   - Check RDS security group allows EC2 access

3. **Quota Exhausted**
   - Check daily usage in analytics
   - Wait for midnight PT reset

4. **Container Not Starting**
   - Check logs: `docker-compose logs web`
   - Verify environment variables

## v3.0 Roadmap

### Planned Features

**1. AI Video Analysis**
- Automatically analyze video content
- Smart link recommendations based on context
- Auto-insert relevant links in replies

**2. Instagram DM Auto-Reply**
- Automated responses to Instagram DMs
- Keyword-based filtering
- Template-based personalized replies
- Analytics and engagement tracking

**3. One-Click Instagram Connect**
- Seamless Instagram Business account connection
- Facebook OAuth integration
- Real-time DM webhook notifications

**4. Google OAuth Verification**
- Complete app verification for production
- Remove "unverified app" warning

### Timeline (Estimated)

| Phase | Features | Duration |
|-------|----------|----------|
| Phase 1 | AI Video Analysis | 3 weeks |
| Phase 2 | Instagram Connect | 2 weeks |
| Phase 3 | Instagram DM Auto-Reply | 2 weeks |
| Phase 4 | Testing & Polish | 1 week |

## License

MIT License - see LICENSE file

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

**Built with ❤️ for YouTube creators**

# reply.

A fully automated system that monitors your YouTube videos 24/7 and replies to comments based on keywords with human-like behavior.

## What It Does

- Monitors your YouTube channel videos automatically
- Filters comments by custom keywords (e.g., "MCP", "help", "tutorial")
- Replies automatically with customizable templates
- Prevents duplicate replies with sub-millisecond database checks
- Uses human-like delays to avoid YouTube ban
- Tracks quota usage (10,000 units/day limit)
- Provides analytics dashboard

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
|   FastAPI        |  Backend (Heroku)
|   Backend        |  - OAuth authentication
|   (Heroku)       |  - YouTube API integration
+--------+---------+  - Auto-reply engine
         |
    +----+----+----------+----------+
    |         |          |          |
    v         v          v          v
+--------+ +------+ +--------+ +---------+
|Postgres| |Redis | |YouTube | |Scheduler|
|  (DB)  | |(Cache)| |  API   | | (Cron) |
+--------+ +------+ +--------+ +---------+
```

## Cost Breakdown

| Service | Plan | Cost/Month |
|---------|------|------------|
| Heroku Eco Dyno | Eco | $5 |
| PostgreSQL | Mini | $5 |
| Redis | Mini | $3 |
| Heroku Scheduler | Standard | FREE |
| Vercel (Frontend) | Hobby | FREE |
| **TOTAL** | | **$13/month** |

## Quick Start

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd reply-comments
```

### 2. Backend Setup

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

### 3. Deploy to Heroku

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete instructions.

Quick deploy:
```bash
heroku create youtube-autoreply-api
heroku addons:create heroku-postgresql:mini
heroku addons:create heroku-redis:mini
heroku addons:create scheduler:standard

# Set environment variables
heroku config:set GOOGLE_CLIENT_ID="your-id"
heroku config:set GOOGLE_CLIENT_SECRET="your-secret"
heroku config:set YOUTUBE_API_KEY="your-key"
heroku config:set SECRET_KEY="$(openssl rand -hex 32)"

# Deploy
git push heroku main
```

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

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

Required variables:

- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `GOOGLE_CLIENT_ID` - OAuth client ID
- `GOOGLE_CLIENT_SECRET` - OAuth secret
- `YOUTUBE_API_KEY` - YouTube API key
- `SECRET_KEY` - JWT secret
- `FRONTEND_URL` - Frontend URL
- `REDIRECT_URI` - OAuth redirect

## Performance Metrics

- **Duplicate Check**: < 1ms per lookup
- **Batch Check**: 2-5ms for 100 comments
- **Reply Speed**: 100 comments in ~3 minutes
- **Daily Capacity**: 150-180 replies/day (within quota)
- **Uptime**: 99.9% (Heroku SLA)

## Project Structure

```
reply-comments/
├── backend/                 # FastAPI backend
│   ├── main.py             # App entry point
│   ├── config.py           # Configuration
│   ├── database.py         # Database functions
│   ├── schema.sql          # Database schema
│   ├── routers/            # API routes
│   │   ├── auth.py         # Authentication
│   │   ├── videos.py       # Video management
│   │   └── analytics.py    # Analytics
│   ├── services/           # Business logic
│   │   ├── youtube_client.py
│   │   ├── reply_engine.py
│   │   └── quota_manager.py
│   ├── utils/              # Utilities
│   │   ├── human_delays.py
│   │   └── text_variation.py
│   ├── middleware/         # Middleware
│   │   └── auth_middleware.py
│   └── scripts/            # Background jobs
│       └── auto_reply_job.py
├── frontend/               # Next.js frontend
├── DEPLOYMENT_GUIDE.md     # Deployment instructions
└── README.md               # This file
```

## Security

- OAuth 2.0 authentication
- JWT token-based sessions
- Environment variable secrets
- HTTPS only in production
- CORS protection
- SQL injection prevention (parameterized queries)

## Monitoring

### View Logs

```bash
heroku logs --tail
```

### Database Status

```bash
heroku pg:info
heroku pg:psql
```

### Redis Status

```bash
heroku redis:info
heroku redis:cli
```

### Quota Usage

Check via analytics dashboard or:

```bash
heroku redis:cli
> GET quota:daily
```

## Troubleshooting

### Common Issues

1. **OAuth Error**
   - Verify redirect URI matches Google Console
   - Check client ID and secret

2. **Database Connection Error**
   - Verify DATABASE_URL is set
   - Check Heroku Postgres status

3. **Quota Exhausted**
   - Check daily usage in analytics
   - Wait for midnight PT reset

4. **Scheduler Not Running**
   - Verify job configuration
   - Check Heroku Scheduler dashboard

## Documentation

- [Backend README](./backend/README.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [API Documentation](https://youtube-autoreply-api.herokuapp.com/docs)

## Development

### Run Tests

```bash
cd backend
pytest tests/ -v
```

### Code Quality

```bash
# Format code
black .

# Lint
flake8 .

# Type checking
mypy .
```

## License

MIT License - see LICENSE file

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## Support

For issues or questions:
1. Check documentation
2. Review logs
3. Open GitHub issue

## v3.0 Roadmap

### Planned Features

**1. Instagram DM Auto-Reply**
- Automated responses to Instagram DMs based on keywords
- Similar to existing YouTube functionality
- Template-based personalized replies
- Analytics and engagement tracking

**2. One-Click Instagram Connect**
- Seamless Instagram Business account connection via Facebook OAuth
- Webhook integration for real-time DM notifications
- Automatic permission handling

**3. Google OAuth Verification**
- Complete Google OAuth app verification for production deployment
- Domain verification and security assessment
- Removal of "unverified app" warning screen

### Timeline (Estimated)

| Phase | Features | Duration |
|-------|----------|----------|
| Phase 1 | Google OAuth Verification | 2-4 weeks |
| Phase 2 | Instagram Connect Backend | 2 weeks |
| Phase 3 | Instagram DM Auto-Reply | 2 weeks |
| Phase 4 | UI/UX Polish & Testing | 1 week |

## Acknowledgments

- FastAPI for the amazing framework
- Heroku for reliable hosting
- Google for YouTube API
- All contributors

---

**Built with love for YouTube creators**


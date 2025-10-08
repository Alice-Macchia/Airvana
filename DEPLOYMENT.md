# 🚀 Airvana Deployment Instructions

## Server Setup (DigitalOcean)

### 1. Environment Configuration
Create `.env` file in the root directory:

```bash
cp .env.example .env
```

Then edit `.env` with your actual values:

```bash
nano .env
```

### 2. Required Environment Variables

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/airvana_db

# JWT
SECRET_KEY=your-actual-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Google OAuth (from WhatsApp message)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://165.22.75.145:8001/auth/google/callback

# Production
APP_HOST=0.0.0.0
APP_PORT=80
DEBUG=False
```

### 3. Deploy Commands

```bash
git pull origin main
docker-compose down
docker-compose up --build -d
```

### 4. Check Status

```bash
docker ps
docker-compose logs
```

## 🔒 Security Notes

- **NEVER commit `.env` file**
- Use strong SECRET_KEY (generate with: `openssl rand -hex 32`)
- Update Google OAuth redirect URI to production domain

## 🆘 Troubleshooting

- If `.env` is missing: Create from `.env.example`
- If Google OAuth fails: Check redirect URI matches production URL
- If database connection fails: Check DATABASE_URL format
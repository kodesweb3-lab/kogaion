# 🚂 Kogaion Deployment Guide

## Deploy to Railway (Recommended)

### Option 1: Railway Dashboard (Easiest)

1. Go to https://railway.app
2. Sign up with GitHub
3. **Important:** Install Railway GitHub app on your account:
   - Go to https://github.com/settings/installations
   - Find "Railway" 
   - Grant access to the `kodesweb3-lab/kogaion` repo
4. Click "New Project" → "Deploy from GitHub repo"
5. Select `kodesweb3-lab/kogaion`
6. Railway will auto-detect settings from `railway.json`
7. Click "Deploy"

### Option 2: Railway CLI

```bash
# Install Railway CLI
npm i -g railway

# Login
railway login

# Link your project
cd /home/rob/.openclaw/workspace/kogaion
railway link

# Deploy
railway up
```

### Option 3: Manual Docker Deploy

```bash
# Build image
docker build -t kogaion .

# Run container
docker run -d -p 3000:3000 -p 4000:4000 --name kogaion kogaion

# Check logs
docker logs -f kogaion
```

## Deploy to Render (Free Alternative)

1. Go to https://render.com
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect `kodesweb3-lab/kogaion`
5. Settings:
   - Build Command: `npm install`
   - Start Command: `node index.js`
   - Environment: `Node`
6. Click "Create Web Service"

## Deploy to Vercel (Frontend Only)

```bash
cd /home/rob/.openclaw/workspace/kogaion/website
npx vercel --prod
```

## Deploy to Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch
fly launch

# Set secrets
fly secrets set PORT=3000

# Deploy
fly deploy
```

## Deploy to Coolify (Self-Hosted)

1. Install Coolify on your server
2. Connect GitHub repo
3. Settings:
   - Build Pack: Node.js
   - Start Command: `node index.js`
   - Port: 3000
4. Deploy

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | HTTP port |
| `P2P_PORT` | 4000 | WebSocket port |
| `MINING_DIFFICULTY` | 2 | PoW difficulty |
| `INITIAL_REPUTATION` | 100 | Starting rep |
| `INITIAL_CREDITS` | 50 | Starting credits |

## Health Check

Railway/containers will check:
```
GET /health
```

Returns:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-04T21:00:00.000Z"
}
```

## Metrics

Prometheus metrics at:
```
GET /metrics
```

## Troubleshooting

### Build Fails
- Check `package.json` has correct dependencies
- Ensure `package-lock.json` exists
- Node version should be 18+

### Won't Start
- Check `PORT` environment variable is set
- Ensure port 3000 is not in use
- Check logs for errors

### Can't Connect
- Verify security groups allow traffic
- Check application is listening on 0.0.0.0 (not localhost)
- Ensure health check endpoint returns 200

## Quick Deploy Command

```bash
# Deploy to any server with Docker
docker run -d \
  --name kogaion \
  -p 3000:3000 \
  -p 4000:4000 \
  ghcr.io/kodesweb3-lab/kogaion:latest
```

---

**Railway Dashboard:** https://railway.app/dashboard  
**GitHub Repo:** https://github.com/kodesweb3-lab/kogaion

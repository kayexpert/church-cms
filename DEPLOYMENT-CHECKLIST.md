# 🚀 Deployment Checklist

## Pre-Deployment
- [ ] Build passes: `npm run build`
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] SMS provider configured (optional)

## Vercel Setup
- [ ] Repository connected to Vercel
- [ ] Environment variables set in Vercel dashboard
- [ ] Domain configured (if custom domain)

## Post-Deployment
- [ ] Application loads successfully
- [ ] Authentication works
- [ ] Database operations function
- [ ] Cron jobs working
- [ ] SMS functionality (if enabled)

## Environment Variables for Vercel
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_API_SECRET_KEY=your-api-secret
CRON_SECRET_KEY=your-cron-secret
```

## Quick Commands
```bash
# Test build locally
npm run build

# Start production server locally
npm run build && npm start

# Deploy with Vercel CLI
vercel --prod
```

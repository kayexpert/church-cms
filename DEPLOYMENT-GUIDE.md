# 🚀 Church CMS Deployment Guide

## 📋 Pre-Deployment Checklist

### ⚠️ **CRITICAL: Fix Build Errors First**

Before deploying, you **MUST** fix the TypeScript/ESLint errors that prevent successful builds:

```bash
npm run build
```

**Current Status**: ❌ Build fails with 79 TypeScript/ESLint errors

### 🔧 **Quick Fix Options**

#### Option 1: Disable Strict Linting for Deployment (Quick Fix)
Add to `next.config.ts`:
```typescript
eslint: {
  ignoreDuringBuilds: true,
},
typescript: {
  ignoreBuildErrors: true,
},
```

#### Option 2: Fix All Errors (Recommended)
The errors are mainly:
- Unused variables (remove or prefix with `_`)
- Explicit `any` types (replace with proper types)
- Unused imports (remove)

---

## 🌐 Vercel Deployment Steps

### 1. **Environment Variables Setup**

In your Vercel dashboard, add these environment variables:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_API_SECRET_KEY=your-api-secret-key
CRON_SECRET_KEY=your-cron-secret-key

# Optional (for SMS functionality)
NEXT_PUBLIC_SMS_PROVIDER=mock
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number
```

### 2. **Deploy to Vercel**

#### Method A: Vercel CLI
```bash
npm install -g vercel
vercel
```

#### Method B: GitHub Integration
1. Push to GitHub
2. Connect repository in Vercel dashboard
3. Deploy automatically

### 3. **Post-Deployment Setup**

1. **Database Setup**: Run database migrations via the admin panel
2. **SMS Configuration**: Configure SMS provider in settings
3. **Test Core Features**: Login, member management, messaging

---

## 🔒 Security Considerations

### **Production Environment Variables**
- Use **different** API keys for production
- Generate new `CRON_SECRET_KEY` for production
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is kept secret

### **Supabase Security**
- Enable Row Level Security (RLS) on all tables
- Review API permissions
- Set up proper authentication policies

---

## 🐛 Common Deployment Issues

### **Build Failures**
- **Cause**: TypeScript/ESLint errors
- **Solution**: Fix errors or temporarily disable strict checking

### **Environment Variable Issues**
- **Cause**: Missing or incorrect environment variables
- **Solution**: Double-check all required variables in Vercel dashboard

### **Database Connection Issues**
- **Cause**: Incorrect Supabase credentials
- **Solution**: Verify URL and keys in Supabase dashboard

### **Cron Jobs Not Working**
- **Cause**: Incorrect `CRON_SECRET_KEY` or Vercel cron configuration
- **Solution**: Verify `vercel.json` cron setup and environment variable

---

## 📊 Performance Optimization

### **Already Configured**
✅ Next.js standalone output
✅ Image optimization
✅ Bundle splitting
✅ CSS optimization
✅ Console log removal in production

### **Additional Recommendations**
- Monitor Core Web Vitals in Vercel Analytics
- Set up error tracking (Sentry)
- Configure CDN for static assets

---

## 🔄 Continuous Deployment

### **GitHub Actions** (Optional)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## 📞 Support

If you encounter issues during deployment:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test locally with production build: `npm run build && npm start`
4. Review Supabase logs for database issues

---

## ✅ Post-Deployment Verification

- [ ] Application loads successfully
- [ ] Authentication works
- [ ] Database operations function
- [ ] SMS functionality (if configured)
- [ ] Cron jobs execute properly
- [ ] All environment variables are set
- [ ] No console errors in production

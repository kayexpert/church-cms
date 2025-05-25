# 🔒 Security Deployment Checklist

## Pre-Deployment Security Checks

### Environment Variables
- [ ] ADMIN_EMAILS configured with actual admin emails
- [ ] All API keys are production-ready (different from development)
- [ ] CRON_SECRET_KEY is unique for production
- [ ] Database credentials are production-specific

### Database Security
- [ ] Row Level Security (RLS) enabled on all tables
- [ ] Admin functions are properly protected
- [ ] Database backups configured
- [ ] Connection limits set appropriately

### API Security
- [ ] Admin routes require authentication
- [ ] Rate limiting enabled for critical endpoints
- [ ] Error messages sanitized for production
- [ ] Input validation implemented

### Infrastructure Security
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Monitoring and alerting set up

## Post-Deployment Security Tasks

### Immediate (First 24 hours)
- [ ] Test all authentication flows
- [ ] Verify admin access controls
- [ ] Check error handling in production
- [ ] Monitor for unusual activity

### Short-term (First week)
- [ ] Review access logs
- [ ] Test rate limiting effectiveness
- [ ] Verify backup procedures
- [ ] Update security documentation

### Ongoing
- [ ] Regular security audits
- [ ] Monitor for security updates
- [ ] Review and update admin access
- [ ] Incident response planning

## Security Contacts
- Primary Admin: [Your Email]
- Backup Admin: [Backup Email]
- Security Issues: security@church.com

## Emergency Procedures
1. Suspected breach: Immediately disable affected accounts
2. Database issues: Contact Supabase support
3. API abuse: Enable emergency rate limiting
4. Data concerns: Review audit logs and notify admins

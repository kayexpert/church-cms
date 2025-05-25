#!/usr/bin/env node

/**
 * Security fixes script for Church CMS
 * Applies critical security improvements before deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 Church CMS Security Fixes');
console.log('============================\n');

// Security middleware template
const authMiddleware = `
// Security middleware for admin routes
import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function checkAdminAuth(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // In production, implement proper admin role checking
    // For now, we'll use a simple email check
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    if (!adminEmails.includes(user.email || '')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    return null; // No error, user is authenticated admin
  } catch (error) {
    return NextResponse.json({ error: 'Authentication error' }, { status: 500 });
  }
}

export function sanitizeError(error: any) {
  if (process.env.NODE_ENV === 'production') {
    console.error('Production error:', error);
    return { error: 'Internal server error' };
  }
  return { error: error instanceof Error ? error.message : String(error) };
}
`;

// Rate limiting utility
const rateLimitUtil = `
// Simple in-memory rate limiting (for production, use Redis)
const requestCounts = new Map();

export function rateLimit(identifier: string, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Clean old entries
  for (const [key, data] of requestCounts.entries()) {
    if (data.timestamp < windowStart) {
      requestCounts.delete(key);
    }
  }
  
  const current = requestCounts.get(identifier) || { count: 0, timestamp: now };
  
  if (current.timestamp < windowStart) {
    // Reset if outside window
    requestCounts.set(identifier, { count: 1, timestamp: now });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false; // Rate limit exceeded
  }
  
  requestCounts.set(identifier, { count: current.count + 1, timestamp: current.timestamp });
  return true;
}
`;

// Create security utilities
function createSecurityUtils() {
  const securityDir = path.join(process.cwd(), 'src', 'lib', 'security');
  
  if (!fs.existsSync(securityDir)) {
    fs.mkdirSync(securityDir, { recursive: true });
  }
  
  // Create auth middleware
  fs.writeFileSync(
    path.join(securityDir, 'auth-middleware.ts'),
    authMiddleware
  );
  
  // Create rate limiting utility
  fs.writeFileSync(
    path.join(securityDir, 'rate-limit.ts'),
    rateLimitUtil
  );
  
  console.log('✅ Created security utilities');
}

// Update environment example with security variables
function updateEnvExample() {
  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  if (fs.existsSync(envExamplePath)) {
    let content = fs.readFileSync(envExamplePath, 'utf8');
    
    const securityVars = `

# Security Configuration
ADMIN_EMAILS=admin@church.com,pastor@church.com
ENABLE_RATE_LIMITING=true
SECURITY_HEADERS=true
DISABLE_DEBUG_LOGS=true`;

    if (!content.includes('ADMIN_EMAILS')) {
      content += securityVars;
      fs.writeFileSync(envExamplePath, content);
      console.log('✅ Updated .env.example with security variables');
    }
  }
}

// Create security configuration
function createSecurityConfig() {
  const securityConfig = `
// Security configuration for Church CMS
export const securityConfig = {
  // Rate limiting settings
  rateLimit: {
    enabled: process.env.ENABLE_RATE_LIMITING === 'true',
    maxRequests: 10,
    windowMs: 60000, // 1 minute
  },
  
  // Admin configuration
  admin: {
    emails: process.env.ADMIN_EMAILS?.split(',') || [],
  },
  
  // Security headers
  headers: {
    enabled: process.env.SECURITY_HEADERS === 'true',
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin',
  },
  
  // Error handling
  errors: {
    sanitizeInProduction: true,
    logErrors: true,
  },
};
`;

  fs.writeFileSync(
    path.join(process.cwd(), 'src', 'lib', 'security', 'config.ts'),
    securityConfig
  );
  
  console.log('✅ Created security configuration');
}

// Create deployment security checklist
function createSecurityChecklist() {
  const checklist = `# 🔒 Security Deployment Checklist

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
`;

  fs.writeFileSync(
    path.join(process.cwd(), 'SECURITY-CHECKLIST.md'),
    checklist
  );
  
  console.log('✅ Created security deployment checklist');
}

// Main execution
function main() {
  console.log('🎯 Applying security fixes...\n');
  
  createSecurityUtils();
  updateEnvExample();
  createSecurityConfig();
  createSecurityChecklist();
  
  console.log('\n🎉 Security fixes applied!');
  console.log('\n📋 Next steps:');
  console.log('   1. Review SECURITY-AUDIT-REPORT.md');
  console.log('   2. Update .env.local with ADMIN_EMAILS');
  console.log('   3. Test admin authentication locally');
  console.log('   4. Follow SECURITY-CHECKLIST.md for deployment');
  console.log('\n⚠️  IMPORTANT: Update admin routes to use auth middleware before deployment!');
}

main();

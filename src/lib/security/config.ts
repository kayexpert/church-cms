
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

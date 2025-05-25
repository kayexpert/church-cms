/**
 * Centralized configuration for the application
 * This file provides a single source of truth for all configuration values
 */

export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  api: {
    secretKey: process.env.NEXT_PUBLIC_API_SECRET_KEY,
  },
  auth: {
    // Session refresh settings
    sessionRefreshInterval: 60000, // Check session every minute
    sessionRefreshThreshold: 5 * 60, // Refresh if less than 5 minutes left (in seconds)
    // CSRF settings
    csrfCookieName: 'church-cms-csrf-token',
    // Password reset settings
    passwordResetTimeout: 60 * 60, // 1 hour (in seconds)
    passwordResetRateLimit: {
      maxAttempts: 3,
      windowMs: 60 * 60 * 1000, // 1 hour (in milliseconds)
    },
  },
  sms: {
    // SMS provider configuration
    provider: process.env.NEXT_PUBLIC_SMS_PROVIDER || 'mock', // 'mock', 'twilio', etc.
    // Twilio configuration
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
    // Message scheduling configuration
    scheduling: {
      checkInterval: 60000, // Check for scheduled messages every minute
      batchSize: 10, // Number of messages to process in a batch
    },
  },
  routes: {
    // Public routes that don't require authentication
    public: ['/', '/auth/login', '/auth/reset-password'],
    // Routes that are always accessible
    alwaysAccessible: [
      '/auth/callback',
      '/auth/signout',
      '/api/auth/logout',
    ],
  },
};

// Validate required environment variables in development
if (process.env.NODE_ENV === 'development') {
  const requiredEnvVars = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', value: config.supabase.url },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: config.supabase.anonKey },
  ];

  requiredEnvVars.forEach(({ key, value }) => {
    if (!value) {
      console.warn(`Missing required environment variable: ${key}`);
    }
  });
}

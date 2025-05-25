# Fix SMS Provider Configuration Guide

This guide will help you fix the SMS provider configuration issue in your Church CMS application.

## The Issue

The error you're seeing is related to Row Level Security (RLS) in your Supabase database. The application is trying to access or modify the `messaging_configurations` table, but it's being blocked by RLS policies.

## Solution

### Option 1: Run SQL Script in Supabase

1. Log in to your Supabase dashboard at https://app.supabase.com/
2. Select your project (School Reporting system or CMS TT)
3. Go to the SQL Editor
4. Copy and paste the contents of the `fix-messaging-config.sql` file
5. Run the script
6. Restart your application

### Option 2: Use the Supabase Management API

If you have the Supabase service role key, you can run the following command:

```bash
curl -X POST "https://bmpypfvovmlmsmpmmqau.supabase.co/rest/v1/rpc/exec_sql" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "CREATE TABLE IF NOT EXISTS messaging_configurations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider_name TEXT NOT NULL, api_key TEXT, api_secret TEXT, base_url TEXT, auth_type TEXT, sender_id TEXT, is_default BOOLEAN DEFAULT FALSE, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()); ALTER TABLE messaging_configurations DISABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS \"Allow authenticated users to read messaging_configurations\" ON messaging_configurations; CREATE POLICY \"Allow authenticated users to read messaging_configurations\" ON messaging_configurations FOR SELECT TO authenticated USING (true); CREATE POLICY \"Allow authenticated users to insert messaging_configurations\" ON messaging_configurations FOR INSERT TO authenticated WITH CHECK (true); CREATE POLICY \"Allow authenticated users to update messaging_configurations\" ON messaging_configurations FOR UPDATE TO authenticated USING (true); CREATE POLICY \"Allow authenticated users to delete messaging_configurations\" ON messaging_configurations FOR DELETE TO authenticated USING (true); CREATE POLICY \"Allow service role full access to messaging_configurations\" ON messaging_configurations USING (auth.role() = \'service_role\'); ALTER TABLE messaging_configurations ENABLE ROW LEVEL SECURITY;"}'
```

Replace `YOUR_SERVICE_ROLE_KEY` with your actual Supabase service role key.

### Option 3: Modify the Supabase Client

If you're still having issues, you can modify the Supabase client to use the service role key for operations related to the messaging configurations:

1. Open `src/lib/supabase.ts`
2. Add a new client that uses the service role key:

```typescript
// Create a Supabase client with service role to bypass RLS
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
```

3. Use this client in your messaging configuration endpoints

## Verification

After applying one of these solutions, you should be able to:

1. See your SMS provider configuration in the settings page
2. Create, update, and delete SMS provider configurations
3. Send SMS messages through the configured provider

If you're still having issues, please check the server logs for more detailed error messages.

## Additional Notes

- The error message `new row violates row-level security policy for table "messaging_configurations"` indicates that the RLS policies are preventing the application from accessing the table.
- The empty error message `{ message: '' }` suggests there might be an issue with the Supabase connection or permissions.
- Make sure your Supabase URL and API keys are correctly set in your environment variables.

-- Create the exec_sql function if it doesn't exist
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;

-- Create a stored procedure to set up messaging tables
CREATE OR REPLACE FUNCTION create_messaging_tables()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create extension for UUID generation if it doesn't exist
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  -- Create messages table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    CREATE TABLE messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('quick', 'group', 'birthday')),
      frequency TEXT NOT NULL CHECK (frequency IN ('one-time', 'daily', 'weekly', 'monthly')),
      schedule_time TIMESTAMP WITH TIME ZONE NOT NULL,
      end_date TIMESTAMP WITH TIME ZONE,
      status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;

  -- Create message_recipients table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'message_recipients') THEN
    CREATE TABLE message_recipients (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      recipient_type TEXT NOT NULL CHECK (recipient_type IN ('individual', 'group')),
      recipient_id UUID NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;

  -- Create message_logs table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'message_logs') THEN
    CREATE TABLE message_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      recipient_id UUID NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')) DEFAULT 'pending',
      error_message TEXT,
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;

  -- Create message_templates table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'message_templates') THEN
    CREATE TABLE message_templates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;

  -- Create messaging_configurations table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messaging_configurations') THEN
    CREATE TABLE messaging_configurations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      provider_name TEXT NOT NULL,
      api_key TEXT,
      api_secret TEXT,
      base_url TEXT,
      auth_type TEXT,
      sender_id TEXT,
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;

  -- Create ai_configurations table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_configurations') THEN
    CREATE TABLE ai_configurations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      ai_provider TEXT NOT NULL,
      api_key TEXT,
      default_prompt TEXT,
      character_limit INTEGER DEFAULT 160,
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END;
$$;

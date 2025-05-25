-- Comprehensive Messaging System Fix Script
-- This script fixes issues with the messaging system tables and constraints

-- Function to log migration messages
CREATE OR REPLACE FUNCTION log_message(message TEXT) RETURNS VOID AS $$
BEGIN
    RAISE NOTICE '%', message;
END;
$$ LANGUAGE plpgsql;

-- Start transaction
BEGIN;

-- Log start of migration
SELECT log_message('Starting messaging system fix script...');

-- Fix messages table
DO $$
BEGIN
    -- Check if the messages table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
        -- Update the status check constraint to include all needed statuses
        ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;
        
        ALTER TABLE messages 
        ADD CONSTRAINT messages_status_check 
        CHECK (status IN ('active', 'inactive', 'scheduled', 'pending', 'processing'));
        
        SELECT log_message('Updated status constraint in messages table');
        
        -- Add error_message column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'messages' 
            AND column_name = 'error_message'
        ) THEN
            ALTER TABLE messages ADD COLUMN error_message TEXT;
            SELECT log_message('Added error_message column to messages table');
        ELSE
            SELECT log_message('error_message column already exists in messages table');
        END IF;
        
        -- Add processing_started_at column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'messages' 
            AND column_name = 'processing_started_at'
        ) THEN
            ALTER TABLE messages ADD COLUMN processing_started_at TIMESTAMP WITH TIME ZONE;
            SELECT log_message('Added processing_started_at column to messages table');
        ELSE
            SELECT log_message('processing_started_at column already exists in messages table');
        END IF;
        
        -- Add processing_completed_at column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'messages' 
            AND column_name = 'processing_completed_at'
        ) THEN
            ALTER TABLE messages ADD COLUMN processing_completed_at TIMESTAMP WITH TIME ZONE;
            SELECT log_message('Added processing_completed_at column to messages table');
        ELSE
            SELECT log_message('processing_completed_at column already exists in messages table');
        END IF;
        
        -- Add last_processed_at column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'messages' 
            AND column_name = 'last_processed_at'
        ) THEN
            ALTER TABLE messages ADD COLUMN last_processed_at TIMESTAMP WITH TIME ZONE;
            SELECT log_message('Added last_processed_at column to messages table');
        ELSE
            SELECT log_message('last_processed_at column already exists in messages table');
        END IF;
    ELSE
        SELECT log_message('messages table does not exist, skipping updates');
    END IF;
END $$;

-- Fix message_logs table
DO $$
BEGIN
    -- Check if the message_logs table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'message_logs') THEN
        -- Update the status check constraint to include all needed statuses
        ALTER TABLE message_logs DROP CONSTRAINT IF EXISTS message_logs_status_check;
        
        ALTER TABLE message_logs 
        ADD CONSTRAINT message_logs_status_check 
        CHECK (status IN ('sent', 'failed', 'pending', 'delivered', 'rejected', 'expired'));
        
        SELECT log_message('Updated status constraint in message_logs table');
        
        -- Add message_id_from_provider column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'message_logs' 
            AND column_name = 'message_id_from_provider'
        ) THEN
            ALTER TABLE message_logs ADD COLUMN message_id_from_provider TEXT;
            SELECT log_message('Added message_id_from_provider column to message_logs table');
        ELSE
            SELECT log_message('message_id_from_provider column already exists in message_logs table');
        END IF;
        
        -- Add delivered_at column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'message_logs' 
            AND column_name = 'delivered_at'
        ) THEN
            ALTER TABLE message_logs ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;
            SELECT log_message('Added delivered_at column to message_logs table');
        ELSE
            SELECT log_message('delivered_at column already exists in message_logs table');
        END IF;
        
        -- Add delivery_status column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'message_logs' 
            AND column_name = 'delivery_status'
        ) THEN
            ALTER TABLE message_logs ADD COLUMN delivery_status TEXT;
            SELECT log_message('Added delivery_status column to message_logs table');
        ELSE
            SELECT log_message('delivery_status column already exists in message_logs table');
        END IF;
        
        -- Add delivery_status_details column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'message_logs' 
            AND column_name = 'delivery_status_details'
        ) THEN
            ALTER TABLE message_logs ADD COLUMN delivery_status_details TEXT;
            SELECT log_message('Added delivery_status_details column to message_logs table');
        ELSE
            SELECT log_message('delivery_status_details column already exists in message_logs table');
        END IF;
        
        -- Add cost column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'message_logs' 
            AND column_name = 'cost'
        ) THEN
            ALTER TABLE message_logs ADD COLUMN cost NUMERIC;
            SELECT log_message('Added cost column to message_logs table');
        ELSE
            SELECT log_message('cost column already exists in message_logs table');
        END IF;
        
        -- Add segments column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'message_logs' 
            AND column_name = 'segments'
        ) THEN
            ALTER TABLE message_logs ADD COLUMN segments INTEGER;
            SELECT log_message('Added segments column to message_logs table');
        ELSE
            SELECT log_message('segments column already exists in message_logs table');
        END IF;
        
        -- Add message_type column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'message_logs' 
            AND column_name = 'message_type'
        ) THEN
            ALTER TABLE message_logs ADD COLUMN message_type TEXT;
            SELECT log_message('Added message_type column to message_logs table');
        ELSE
            SELECT log_message('message_type column already exists in message_logs table');
        END IF;
        
        -- Add created_at column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'message_logs' 
            AND column_name = 'created_at'
        ) THEN
            ALTER TABLE message_logs ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            SELECT log_message('Added created_at column to message_logs table');
        ELSE
            SELECT log_message('created_at column already exists in message_logs table');
        END IF;
        
        -- Add updated_at column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'message_logs' 
            AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE message_logs ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            SELECT log_message('Added updated_at column to message_logs table');
        ELSE
            SELECT log_message('updated_at column already exists in message_logs table');
        END IF;
    ELSE
        SELECT log_message('message_logs table does not exist, skipping updates');
    END IF;
END $$;

-- Log end of migration
SELECT log_message('Completed messaging system fix script');

-- Commit transaction
COMMIT;

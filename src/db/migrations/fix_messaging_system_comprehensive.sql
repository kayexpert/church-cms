-- Comprehensive Messaging System Fix
-- This migration addresses all identified issues in the messaging system

BEGIN;

-- Create a logging function for migration tracking
CREATE OR REPLACE FUNCTION log_message(message TEXT)
RETURNS VOID AS $$
BEGIN
    RAISE NOTICE '%', message;
END;
$$ LANGUAGE plpgsql;

-- 1. Fix messages table with comprehensive status support
DO $$
BEGIN
    -- Check if the messages table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
        -- Drop existing constraints
        ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;
        ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;
        
        -- Add comprehensive status constraint
        ALTER TABLE messages 
        ADD CONSTRAINT messages_status_check 
        CHECK (status IN ('active', 'inactive', 'scheduled', 'pending', 'processing', 'completed', 'error', 'failed'));
        
        -- Add comprehensive type constraint (including birthday)
        ALTER TABLE messages 
        ADD CONSTRAINT messages_type_check 
        CHECK (type IN ('quick', 'group', 'birthday'));
        
        -- Add missing columns if they don't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'messages' 
            AND column_name = 'days_before'
        ) THEN
            ALTER TABLE messages ADD COLUMN days_before INTEGER DEFAULT 0;
            SELECT log_message('Added days_before column to messages table');
        END IF;
        
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'messages' 
            AND column_name = 'error_message'
        ) THEN
            ALTER TABLE messages ADD COLUMN error_message TEXT;
            SELECT log_message('Added error_message column to messages table');
        END IF;
        
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'messages' 
            AND column_name = 'payload'
        ) THEN
            ALTER TABLE messages ADD COLUMN payload JSONB;
            SELECT log_message('Added payload column to messages table');
        END IF;
        
        SELECT log_message('Updated messages table with comprehensive constraints and columns');
    ELSE
        SELECT log_message('messages table does not exist, skipping updates');
    END IF;
END $$;

-- 2. Fix message_logs table with comprehensive status support
DO $$
BEGIN
    -- Check if the message_logs table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'message_logs') THEN
        -- Drop existing constraint
        ALTER TABLE message_logs DROP CONSTRAINT IF EXISTS message_logs_status_check;
        
        -- Add comprehensive status constraint
        ALTER TABLE message_logs 
        ADD CONSTRAINT message_logs_status_check 
        CHECK (status IN ('sent', 'failed', 'pending', 'delivered', 'rejected', 'expired', 'error', 'processing'));
        
        -- Add missing columns if they don't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'message_logs' 
            AND column_name = 'message_id_from_provider'
        ) THEN
            ALTER TABLE message_logs ADD COLUMN message_id_from_provider TEXT;
            SELECT log_message('Added message_id_from_provider column to message_logs table');
        END IF;
        
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'message_logs' 
            AND column_name = 'message_type'
        ) THEN
            ALTER TABLE message_logs ADD COLUMN message_type TEXT;
            SELECT log_message('Added message_type column to message_logs table');
        END IF;
        
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'message_logs' 
            AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE message_logs ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            SELECT log_message('Added updated_at column to message_logs table');
        END IF;
        
        SELECT log_message('Updated message_logs table with comprehensive constraints and columns');
    ELSE
        SELECT log_message('message_logs table does not exist, skipping updates');
    END IF;
END $$;

-- 3. Create indexes for better performance
DO $$
BEGIN
    -- Index for scheduled message processing
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_messages_schedule_status') THEN
        CREATE INDEX idx_messages_schedule_status ON messages(schedule_time, status) WHERE status IN ('active', 'scheduled');
        SELECT log_message('Created index for scheduled message processing');
    END IF;
    
    -- Index for birthday message processing
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_messages_birthday_type') THEN
        CREATE INDEX idx_messages_birthday_type ON messages(type, status) WHERE type = 'birthday';
        SELECT log_message('Created index for birthday message processing');
    END IF;
    
    -- Index for message logs by date
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_message_logs_sent_at') THEN
        CREATE INDEX idx_message_logs_sent_at ON message_logs(sent_at DESC);
        SELECT log_message('Created index for message logs by date');
    END IF;
    
    -- Index for message logs by status
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_message_logs_status') THEN
        CREATE INDEX idx_message_logs_status ON message_logs(status, sent_at DESC);
        SELECT log_message('Created index for message logs by status');
    END IF;
END $$;

-- 4. Create a function to clean up stuck messages
CREATE OR REPLACE FUNCTION cleanup_stuck_messages()
RETURNS INTEGER AS $$
DECLARE
    stuck_count INTEGER;
BEGIN
    -- Find messages that have been in 'processing' state for more than 1 hour
    UPDATE messages 
    SET status = 'error', 
        error_message = 'Message processing timed out - automatically reset',
        updated_at = NOW()
    WHERE status = 'processing' 
    AND updated_at < NOW() - INTERVAL '1 hour';
    
    GET DIAGNOSTICS stuck_count = ROW_COUNT;
    
    RETURN stuck_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Create a function to get next schedule time
CREATE OR REPLACE FUNCTION get_next_schedule_time(
    current_schedule TIMESTAMP WITH TIME ZONE,
    frequency_type TEXT,
    end_date_param TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    next_time TIMESTAMP WITH TIME ZONE;
BEGIN
    CASE frequency_type
        WHEN 'daily' THEN
            next_time := current_schedule + INTERVAL '1 day';
        WHEN 'weekly' THEN
            next_time := current_schedule + INTERVAL '1 week';
        WHEN 'monthly' THEN
            next_time := current_schedule + INTERVAL '1 month';
        ELSE
            -- For 'one-time' or unknown frequency, return NULL
            RETURN NULL;
    END CASE;
    
    -- Check if next time exceeds end date
    IF end_date_param IS NOT NULL AND next_time > end_date_param THEN
        RETURN NULL;
    END IF;
    
    RETURN next_time;
END;
$$ LANGUAGE plpgsql;

SELECT log_message('Comprehensive messaging system fix completed successfully');

COMMIT;

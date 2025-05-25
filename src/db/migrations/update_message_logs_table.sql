-- Update Message Logs Table Migration
-- This migration updates the message_logs table to add missing columns and fix constraints

-- Function to log migration messages
CREATE OR REPLACE FUNCTION log_message(message TEXT) RETURNS VOID AS $$
BEGIN
    RAISE NOTICE '%', message;
END;
$$ LANGUAGE plpgsql;

-- Start transaction
BEGIN;

-- Log start of migration
SELECT log_message('Starting update_message_logs_table migration...');

-- Add message_type column if it doesn't exist
DO $$
BEGIN
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
END $$;

-- Update the status check constraint to include all needed statuses
DO $$
BEGIN
    -- Drop the existing constraint
    ALTER TABLE message_logs DROP CONSTRAINT IF EXISTS message_logs_status_check;
    
    -- Add the updated constraint with all needed statuses
    ALTER TABLE message_logs 
    ADD CONSTRAINT message_logs_status_check 
    CHECK (status IN ('sent', 'failed', 'pending', 'delivered', 'rejected', 'expired'));
    
    SELECT log_message('Updated status constraint in message_logs table to include all needed statuses');
EXCEPTION WHEN OTHERS THEN
    SELECT log_message('Error updating status constraint: ' || SQLERRM);
END $$;

-- Add delivered_at column if it doesn't exist
DO $$
BEGIN
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
END $$;

-- Add delivery_status column if it doesn't exist
DO $$
BEGIN
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
END $$;

-- Add delivery_status_details column if it doesn't exist
DO $$
BEGIN
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
END $$;

-- Add cost column if it doesn't exist
DO $$
BEGIN
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
END $$;

-- Add segments column if it doesn't exist
DO $$
BEGIN
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
END $$;

-- Log end of migration
SELECT log_message('Completed update_message_logs_table migration');

-- Commit transaction
COMMIT;

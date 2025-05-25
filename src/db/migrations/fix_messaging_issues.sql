-- Fix Messaging Issues Migration
-- This migration fixes issues with the messaging system tables

-- Function to log migration messages
CREATE OR REPLACE FUNCTION log_message(message TEXT) RETURNS VOID AS $$
BEGIN
    RAISE NOTICE '%', message;
END;
$$ LANGUAGE plpgsql;

-- Start transaction
BEGIN;

-- Log start of migration
SELECT log_message('Starting fix_messaging_issues migration...');

-- 1. Fix message_logs table - add missing columns
DO $$
BEGIN
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

    -- Add cost column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'message_logs' 
        AND column_name = 'cost'
    ) THEN
        ALTER TABLE message_logs ADD COLUMN cost DECIMAL;
        SELECT log_message('Added cost column to message_logs table');
    ELSE
        SELECT log_message('cost column already exists in message_logs table');
    END IF;
    
    -- Update the status check constraint to include all needed statuses
    ALTER TABLE message_logs DROP CONSTRAINT IF EXISTS message_logs_status_check;
    
    ALTER TABLE message_logs 
    ADD CONSTRAINT message_logs_status_check 
    CHECK (status IN ('sent', 'failed', 'pending', 'delivered', 'rejected', 'expired', 'error'));
    
    SELECT log_message('Updated status constraint in message_logs table');
END $$;

-- 2. Fix messages table - update status constraint to include 'completed' status
DO $$
BEGIN
    -- Update the status check constraint to include 'completed' status
    ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;
    
    ALTER TABLE messages 
    ADD CONSTRAINT messages_status_check 
    CHECK (status IN ('active', 'inactive', 'scheduled', 'pending', 'processing', 'completed', 'error'));
    
    SELECT log_message('Updated status constraint in messages table to include completed status');
END $$;

-- 3. Create covenant_families_members table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'covenant_families_members') THEN
        CREATE TABLE covenant_families_members (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            covenant_family_id UUID NOT NULL REFERENCES covenant_families(id) ON DELETE CASCADE,
            member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(covenant_family_id, member_id)
        );
        
        SELECT log_message('Created covenant_families_members table');
        
        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS covenant_families_members_covenant_family_id_idx 
        ON covenant_families_members(covenant_family_id);
        
        CREATE INDEX IF NOT EXISTS covenant_families_members_member_id_idx 
        ON covenant_families_members(member_id);
        
        SELECT log_message('Created indexes on covenant_families_members table');
    ELSE
        SELECT log_message('covenant_families_members table already exists');
    END IF;
END $$;

-- Log end of migration
SELECT log_message('Completed fix_messaging_issues migration');

-- Commit transaction
COMMIT;

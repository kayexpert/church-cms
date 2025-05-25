-- Update Messages Table Migration
-- This migration adds the error_message field to the messages table
-- and updates the status check constraint to include new status values

-- Function to log migration messages
CREATE OR REPLACE FUNCTION log_message(message TEXT) RETURNS VOID AS $$
BEGIN
    RAISE NOTICE '%', message;
END;
$$ LANGUAGE plpgsql;

-- Start transaction
BEGIN;

-- Add error_message column to messages table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'error_message'
    ) THEN
        PERFORM log_message('Adding error_message column to messages table...');
        ALTER TABLE messages ADD COLUMN error_message TEXT;
        PERFORM log_message('error_message column added successfully');
    ELSE
        PERFORM log_message('error_message column already exists');
    END IF;
END $$;

-- Update status check constraint to include new status values
DO $$
BEGIN
    -- Drop the existing constraint
    ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;
    
    -- Add the new constraint with additional status values
    ALTER TABLE messages ADD CONSTRAINT messages_status_check 
        CHECK (status IN ('active', 'inactive', 'scheduled', 'pending', 'processing'));
    
    PERFORM log_message('Updated status check constraint to include new status values');
END $$;

-- Commit transaction
COMMIT;

-- Final verification
DO $$
BEGIN
    PERFORM log_message('Migration complete. The messages table now has:');
    PERFORM log_message('- error_message column');
    PERFORM log_message('- Updated status check constraint with values: active, inactive, scheduled, pending, processing');
END $$;

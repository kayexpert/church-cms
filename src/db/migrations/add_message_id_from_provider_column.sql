-- Add message_id_from_provider column to message_logs table
DO $$
BEGIN
    -- Check if the column already exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'message_logs' 
        AND column_name = 'message_id_from_provider'
    ) THEN
        -- Add the column
        ALTER TABLE message_logs ADD COLUMN message_id_from_provider TEXT;
        
        RAISE NOTICE 'Added message_id_from_provider column to message_logs table';
    ELSE
        RAISE NOTICE 'message_id_from_provider column already exists in message_logs table';
    END IF;
END $$;

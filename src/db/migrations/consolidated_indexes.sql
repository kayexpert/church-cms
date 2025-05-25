-- Consolidated Database Indexes and Optimizations
-- This file combines multiple index-related migrations into a single script

DO $$
DECLARE
    table_exists BOOLEAN;
    column_exists BOOLEAN;
BEGIN
    RAISE NOTICE 'Starting database optimization...';

    -- Members table indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'members') THEN
        -- Index on name fields for search
        CREATE INDEX IF NOT EXISTS members_first_name_idx ON members(first_name);
        CREATE INDEX IF NOT EXISTS members_last_name_idx ON members(last_name);
        
        -- Index on status for filtering
        CREATE INDEX IF NOT EXISTS members_status_idx ON members(status);
        
        -- Index on date_of_birth for birthday queries
        CREATE INDEX IF NOT EXISTS members_date_of_birth_idx ON members(date_of_birth);
        
        -- Index on join_date for member growth queries
        CREATE INDEX IF NOT EXISTS members_join_date_idx ON members(join_date);
        
        -- Index on covenant_family_id for family lookups
        CREATE INDEX IF NOT EXISTS members_covenant_family_id_idx ON members(covenant_family_id);
        
        RAISE NOTICE 'Created indexes on members table';
    END IF;

    -- Events table indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
        -- Index on date for event queries
        CREATE INDEX IF NOT EXISTS events_date_idx ON events(date);
        
        -- Index on status for filtering
        CREATE INDEX IF NOT EXISTS events_status_idx ON events(status);
        
        -- Index on category_id for category filtering
        CREATE INDEX IF NOT EXISTS events_category_id_idx ON events(category_id);
        
        -- Index on department_id for department filtering
        CREATE INDEX IF NOT EXISTS events_department_id_idx ON events(department_id);
        
        RAISE NOTICE 'Created indexes on events table';
    END IF;

    -- Income entries table indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'income_entries') THEN
        -- Index on date for date range queries
        CREATE INDEX IF NOT EXISTS income_entries_date_idx ON income_entries(date);
        
        -- Index on category_id for category filtering
        CREATE INDEX IF NOT EXISTS income_entries_category_id_idx ON income_entries(category_id);
        
        -- Index on account_id for account filtering
        CREATE INDEX IF NOT EXISTS income_entries_account_id_idx ON income_entries(account_id);
        
        RAISE NOTICE 'Created indexes on income_entries table';
    END IF;

    -- Expenditure entries table indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenditure_entries') THEN
        -- Index on date for date range queries
        CREATE INDEX IF NOT EXISTS expenditure_entries_date_idx ON expenditure_entries(date);
        
        -- Index on category_id for category filtering
        CREATE INDEX IF NOT EXISTS expenditure_entries_category_id_idx ON expenditure_entries(category_id);
        
        -- Index on account_id for account filtering
        CREATE INDEX IF NOT EXISTS expenditure_entries_account_id_idx ON expenditure_entries(account_id);
        
        -- Index on budget_item_id for budget filtering
        CREATE INDEX IF NOT EXISTS expenditure_entries_budget_item_id_idx ON expenditure_entries(budget_item_id);
        
        -- Index on is_reconciliation_adjustment for reconciliation filtering
        CREATE INDEX IF NOT EXISTS expenditure_entries_is_reconciliation_adjustment_idx 
            ON expenditure_entries(is_reconciliation_adjustment) 
            WHERE is_reconciliation_adjustment = TRUE;
        
        RAISE NOTICE 'Created indexes on expenditure_entries table';
    END IF;

    -- Attendance table indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance') THEN
        -- Index on date for date range queries
        CREATE INDEX IF NOT EXISTS attendance_date_idx ON attendance(date);
        
        -- Index on event_type for filtering
        CREATE INDEX IF NOT EXISTS attendance_event_type_idx ON attendance(event_type);
        
        RAISE NOTICE 'Created indexes on attendance table';
    END IF;

    -- Messages table indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
        -- Index on schedule_time for scheduled message queries
        CREATE INDEX IF NOT EXISTS messages_schedule_time_idx ON messages(schedule_time);
        
        -- Index on status for filtering
        CREATE INDEX IF NOT EXISTS messages_status_idx ON messages(status);
        
        -- Index on type for filtering
        CREATE INDEX IF NOT EXISTS messages_type_idx ON messages(type);
        
        -- Index on frequency for filtering
        CREATE INDEX IF NOT EXISTS messages_frequency_idx ON messages(frequency);
        
        RAISE NOTICE 'Created indexes on messages table';
    END IF;

    -- Message logs table indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'message_logs') THEN
        -- Index on message_id for message filtering
        CREATE INDEX IF NOT EXISTS message_logs_message_id_idx ON message_logs(message_id);
        
        -- Index on recipient_id for recipient filtering
        CREATE INDEX IF NOT EXISTS message_logs_recipient_id_idx ON message_logs(recipient_id);
        
        -- Index on status for filtering
        CREATE INDEX IF NOT EXISTS message_logs_status_idx ON message_logs(status);
        
        -- Index on sent_at for date range queries
        CREATE INDEX IF NOT EXISTS message_logs_sent_at_idx ON message_logs(sent_at);
        
        RAISE NOTICE 'Created indexes on message_logs table';
    END IF;

    -- Budget items table indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_items') THEN
        -- Index on budget_id for budget filtering
        CREATE INDEX IF NOT EXISTS budget_items_budget_id_idx ON budget_items(budget_id);
        
        -- Index on type for filtering
        CREATE INDEX IF NOT EXISTS budget_items_type_idx ON budget_items(type);
        
        -- Index on category_id for category filtering
        CREATE INDEX IF NOT EXISTS budget_items_category_id_idx ON budget_items(category_id);
        
        -- Index on account_id for account filtering
        CREATE INDEX IF NOT EXISTS budget_items_account_id_idx ON budget_items(account_id);
        
        RAISE NOTICE 'Created indexes on budget_items table';
    END IF;

    -- Run ANALYZE on key tables to update statistics
    BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'members') THEN
            ANALYZE members;
            RAISE NOTICE 'Analyzed members table';
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
            ANALYZE events;
            RAISE NOTICE 'Analyzed events table';
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance') THEN
            ANALYZE attendance;
            RAISE NOTICE 'Analyzed attendance table';
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'income_entries') THEN
            ANALYZE income_entries;
            RAISE NOTICE 'Analyzed income_entries table';
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenditure_entries') THEN
            ANALYZE expenditure_entries;
            RAISE NOTICE 'Analyzed expenditure_entries table';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error during ANALYZE: %', SQLERRM;
    END;

    RAISE NOTICE 'Database optimization completed successfully';
END $$;

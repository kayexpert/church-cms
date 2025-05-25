-- Add Missing Indexes for Frequently Used Queries
-- This script adds indexes that are missing from the consolidated_indexes.sql file
-- but are important for frequently used queries in the application

DO $$
DECLARE
    table_exists BOOLEAN;
    column_exists BOOLEAN;
    index_exists BOOLEAN;
BEGIN
    RAISE NOTICE 'Adding missing indexes for frequently used queries...';

    -- Members table - Full-text search index
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'members'
    ) INTO table_exists;

    IF table_exists THEN
        -- Check if the full-text search index exists
        SELECT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'members' AND indexname = 'idx_members_fulltext'
        ) INTO index_exists;

        IF NOT index_exists THEN
            -- Create a GIN index for full-text search on members
            BEGIN
                CREATE INDEX idx_members_fulltext ON members USING gin(
                    to_tsvector('english', 
                        coalesce(first_name, '') || ' ' || 
                        coalesce(last_name, '') || ' ' || 
                        coalesce(email, '') || ' ' || 
                        coalesce(phone, '')
                    )
                );
                RAISE NOTICE 'Created full-text search index on members table';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error creating full-text search index on members table: %', SQLERRM;
            END;
        END IF;

        -- Add index on join_date for member growth queries
        SELECT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'members' AND indexname = 'idx_members_join_date'
        ) INTO index_exists;

        IF NOT index_exists THEN
            BEGIN
                CREATE INDEX idx_members_join_date ON members(join_date);
                RAISE NOTICE 'Created index on members(join_date)';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error creating index on members(join_date): %', SQLERRM;
            END;
        END IF;
    END IF;

    -- Events table - Add index on department_id for department filtering
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'events'
    ) INTO table_exists;

    IF table_exists THEN
        -- Check if the department_id index exists
        SELECT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'events' AND indexname = 'idx_events_department_id'
        ) INTO index_exists;

        IF NOT index_exists THEN
            BEGIN
                CREATE INDEX idx_events_department_id ON events(department_id);
                RAISE NOTICE 'Created index on events(department_id)';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error creating index on events(department_id): %', SQLERRM;
            END;
        END IF;

        -- Add index on date range for event queries
        SELECT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'events' AND indexname = 'idx_events_date_range'
        ) INTO index_exists;

        IF NOT index_exists THEN
            BEGIN
                CREATE INDEX idx_events_date_range ON events(date, end_date);
                RAISE NOTICE 'Created index on events(date, end_date)';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error creating index on events(date, end_date): %', SQLERRM;
            END;
        END IF;
    END IF;

    -- Income entries - Add index on member_id for member income queries
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'income_entries'
    ) INTO table_exists;

    IF table_exists THEN
        -- Check if the column exists
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'income_entries'
            AND column_name = 'member_id'
        ) INTO column_exists;

        IF column_exists THEN
            -- Check if the index exists
            SELECT EXISTS (
                SELECT 1 FROM pg_indexes 
                WHERE tablename = 'income_entries' AND indexname = 'idx_income_entries_member_id'
            ) INTO index_exists;

            IF NOT index_exists THEN
                BEGIN
                    CREATE INDEX idx_income_entries_member_id ON income_entries(member_id);
                    RAISE NOTICE 'Created index on income_entries(member_id)';
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE 'Error creating index on income_entries(member_id): %', SQLERRM;
                END;
            END IF;
        END IF;

        -- Add composite index on date and category_id for reporting
        SELECT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'income_entries' AND indexname = 'idx_income_entries_date_category'
        ) INTO index_exists;

        IF NOT index_exists THEN
            BEGIN
                CREATE INDEX idx_income_entries_date_category ON income_entries(date, category_id);
                RAISE NOTICE 'Created composite index on income_entries(date, category_id)';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error creating composite index on income_entries(date, category_id): %', SQLERRM;
            END;
        END IF;
    END IF;

    -- Expenditure entries - Add composite index on date and category_id for reporting
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'expenditure_entries'
    ) INTO table_exists;

    IF table_exists THEN
        SELECT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'expenditure_entries' AND indexname = 'idx_expenditure_entries_date_category'
        ) INTO index_exists;

        IF NOT index_exists THEN
            BEGIN
                CREATE INDEX idx_expenditure_entries_date_category ON expenditure_entries(date, category_id);
                RAISE NOTICE 'Created composite index on expenditure_entries(date, category_id)';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error creating composite index on expenditure_entries(date, category_id): %', SQLERRM;
            END;
        END IF;
    END IF;

    -- Attendance table - Add index on date for attendance reporting
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'attendance'
    ) INTO table_exists;

    IF table_exists THEN
        -- Check if the index exists
        SELECT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'attendance' AND indexname = 'idx_attendance_date_event_type'
        ) INTO index_exists;

        IF NOT index_exists THEN
            BEGIN
                CREATE INDEX idx_attendance_date_event_type ON attendance(date, event_type);
                RAISE NOTICE 'Created composite index on attendance(date, event_type)';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error creating composite index on attendance(date, event_type): %', SQLERRM;
            END;
        END IF;
    END IF;

    -- Messages table - Add index on schedule_time and status for scheduled messages
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'messages'
    ) INTO table_exists;

    IF table_exists THEN
        -- Check if the index exists
        SELECT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'messages' AND indexname = 'idx_messages_schedule_status'
        ) INTO index_exists;

        IF NOT index_exists THEN
            BEGIN
                CREATE INDEX idx_messages_schedule_status ON messages(schedule_time, status);
                RAISE NOTICE 'Created composite index on messages(schedule_time, status)';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error creating composite index on messages(schedule_time, status): %', SQLERRM;
            END;
        END IF;
    END IF;

    RAISE NOTICE 'Missing indexes added successfully';
END $$;

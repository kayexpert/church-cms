-- Fix Liability Entries Schema Migration
-- This migration ensures the liability_entries table has the correct schema for reports

-- First, check if the table exists and has the correct columns
-- If not, create or alter it to match the expected schema

-- Create liability_entries table with the correct schema
CREATE TABLE IF NOT EXISTS liability_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  category_id UUID,
  creditor_name TEXT NOT NULL,
  details TEXT,
  total_amount DECIMAL(12, 2) NOT NULL,
  amount_paid DECIMAL(12, 2) DEFAULT 0,
  amount_remaining DECIMAL(12, 2) DEFAULT 0,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'unpaid',
  last_payment_date DATE,
  is_loan BOOLEAN DEFAULT FALSE,
  interest_rate DECIMAL(5, 2),
  loan_term_months INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist (for existing tables)
DO $$
BEGIN
  -- Add creditor_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'liability_entries' AND column_name = 'creditor_name'
  ) THEN
    ALTER TABLE liability_entries ADD COLUMN creditor_name TEXT;
    -- Update existing records to use description as creditor_name if available
    UPDATE liability_entries SET creditor_name = COALESCE(description, 'Unknown Creditor') WHERE creditor_name IS NULL;
    -- Make it NOT NULL after updating
    ALTER TABLE liability_entries ALTER COLUMN creditor_name SET NOT NULL;
  END IF;

  -- Add details column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'liability_entries' AND column_name = 'details'
  ) THEN
    ALTER TABLE liability_entries ADD COLUMN details TEXT;
  END IF;

  -- Add amount_remaining if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'liability_entries' AND column_name = 'amount_remaining'
  ) THEN
    ALTER TABLE liability_entries ADD COLUMN amount_remaining DECIMAL(12, 2) DEFAULT 0;
    -- Calculate amount_remaining for existing records
    UPDATE liability_entries 
    SET amount_remaining = total_amount - COALESCE(amount_paid, 0) 
    WHERE amount_remaining IS NULL;
  END IF;

  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'liability_entries' AND column_name = 'status'
  ) THEN
    ALTER TABLE liability_entries ADD COLUMN status TEXT DEFAULT 'unpaid';
    -- Update status based on existing data
    UPDATE liability_entries 
    SET status = CASE 
      WHEN COALESCE(amount_paid, 0) >= total_amount THEN 'paid'
      WHEN COALESCE(amount_paid, 0) > 0 THEN 'partial'
      ELSE 'unpaid'
    END
    WHERE status IS NULL;
    -- Make it NOT NULL after updating
    ALTER TABLE liability_entries ALTER COLUMN status SET NOT NULL;
  END IF;

  -- Add category_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'liability_entries' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE liability_entries ADD COLUMN category_id UUID;
  END IF;

  -- Add last_payment_date if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'liability_entries' AND column_name = 'last_payment_date'
  ) THEN
    ALTER TABLE liability_entries ADD COLUMN last_payment_date DATE;
  END IF;

  -- Add is_loan if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'liability_entries' AND column_name = 'is_loan'
  ) THEN
    ALTER TABLE liability_entries ADD COLUMN is_loan BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add interest_rate if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'liability_entries' AND column_name = 'interest_rate'
  ) THEN
    ALTER TABLE liability_entries ADD COLUMN interest_rate DECIMAL(5, 2);
  END IF;

  -- Add loan_term_months if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'liability_entries' AND column_name = 'loan_term_months'
  ) THEN
    ALTER TABLE liability_entries ADD COLUMN loan_term_months INTEGER;
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the migration
  RAISE NOTICE 'Error during liability_entries schema migration: %', SQLERRM;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_liability_entries_date ON liability_entries(date);
CREATE INDEX IF NOT EXISTS idx_liability_entries_status ON liability_entries(status);
CREATE INDEX IF NOT EXISTS idx_liability_entries_category_id ON liability_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_liability_entries_due_date ON liability_entries(due_date);

-- Create foreign key constraint for category_id if liability_categories table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'liability_categories') THEN
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'liability_entries_category_id_fkey'
    ) THEN
      ALTER TABLE liability_entries 
      ADD CONSTRAINT liability_entries_category_id_fkey 
      FOREIGN KEY (category_id) REFERENCES liability_categories(id);
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore foreign key errors
  RAISE NOTICE 'Could not create foreign key constraint: %', SQLERRM;
END $$;

-- Update amount_remaining for all existing records to ensure consistency
UPDATE liability_entries 
SET amount_remaining = total_amount - COALESCE(amount_paid, 0)
WHERE amount_remaining != (total_amount - COALESCE(amount_paid, 0));

-- Update status based on current amounts
UPDATE liability_entries 
SET status = CASE 
  WHEN amount_remaining <= 0 THEN 'paid'
  WHEN amount_paid > 0 THEN 'partial'
  ELSE 'unpaid'
END
WHERE status NOT IN ('paid', 'partial', 'unpaid') OR status IS NULL;

-- Consolidated Budget-Expenditure Integration Migration
-- This file combines multiple budget-expenditure related migrations into a single script

-- Create budgets table if it doesn't exist
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT CHECK (status IN ('active', 'inactive', 'completed')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create budget_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS budget_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expenditure')),
  category_id UUID,
  planned_amount DECIMAL(15, 2) NOT NULL,
  actual_amount DECIMAL(15, 2) DEFAULT 0,
  account_id UUID REFERENCES accounts(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add account_id column to budget_items table if it doesn't exist
-- (This is redundant with the table creation above, but included for completeness)
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id);
COMMENT ON COLUMN budget_items.account_id IS 'Reference to the source account for income budget items';

-- Create index on account_id for better performance
CREATE INDEX IF NOT EXISTS budget_items_account_id_idx ON budget_items(account_id);

-- Add budget_item_id column to expenditure_entries table if it doesn't exist
ALTER TABLE expenditure_entries ADD COLUMN IF NOT EXISTS budget_item_id UUID REFERENCES budget_items(id) ON DELETE SET NULL;
COMMENT ON COLUMN expenditure_entries.budget_item_id IS 'Reference to the budget item this expenditure is associated with';

-- Create index on budget_item_id for better performance
CREATE INDEX IF NOT EXISTS expenditure_entries_budget_item_id_idx ON expenditure_entries(budget_item_id);

-- Add is_reconciliation_adjustment column to expenditure_entries table if it doesn't exist
ALTER TABLE expenditure_entries ADD COLUMN IF NOT EXISTS is_reconciliation_adjustment BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN expenditure_entries.is_reconciliation_adjustment IS 'Indicates if this entry was created as a reconciliation adjustment';

-- Create index on is_reconciliation_adjustment for better performance
CREATE INDEX IF NOT EXISTS expenditure_entries_is_reconciliation_adjustment_idx ON expenditure_entries(is_reconciliation_adjustment);

-- Enable Row Level Security on budget tables
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for budgets
CREATE POLICY "Allow authenticated users to read budgets"
  ON budgets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert budgets"
  ON budgets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update budgets"
  ON budgets
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete budgets"
  ON budgets
  FOR DELETE
  TO authenticated
  USING (true);

-- Create RLS policies for budget_items
CREATE POLICY "Allow authenticated users to read budget_items"
  ON budget_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert budget_items"
  ON budget_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update budget_items"
  ON budget_items
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete budget_items"
  ON budget_items
  FOR DELETE
  TO authenticated
  USING (true);

-- Finance Performance Optimization: Indexes
-- This migration adds indexes to improve query performance for finance-related tables

-- Income entries indexes
CREATE INDEX IF NOT EXISTS idx_income_entries_date ON income_entries(date);
CREATE INDEX IF NOT EXISTS idx_income_entries_category_id ON income_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_income_entries_account_id ON income_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_income_entries_date_category ON income_entries(date, category_id);
CREATE INDEX IF NOT EXISTS idx_income_entries_date_account ON income_entries(date, account_id);

-- Expenditure entries indexes
CREATE INDEX IF NOT EXISTS idx_expenditure_entries_date ON expenditure_entries(date);
CREATE INDEX IF NOT EXISTS idx_expenditure_entries_category_id ON expenditure_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_expenditure_entries_account_id ON expenditure_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_expenditure_entries_date_category ON expenditure_entries(date, category_id);
CREATE INDEX IF NOT EXISTS idx_expenditure_entries_date_account ON expenditure_entries(date, account_id);

-- Liability entries indexes
CREATE INDEX IF NOT EXISTS idx_liability_entries_date ON liability_entries(date);
CREATE INDEX IF NOT EXISTS idx_liability_entries_due_date ON liability_entries(due_date);
CREATE INDEX IF NOT EXISTS idx_liability_entries_category_id ON liability_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_liability_entries_status ON liability_entries(status);

-- Budget entries indexes
CREATE INDEX IF NOT EXISTS idx_budgets_date_range ON budgets(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_budget_items_budget_id ON budget_items(budget_id);

-- Account indexes
CREATE INDEX IF NOT EXISTS idx_accounts_account_type ON accounts(account_type);

-- Bank reconciliation indexes
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_account_id ON bank_reconciliations(account_id);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_start_date ON bank_reconciliations(start_date);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_end_date ON bank_reconciliations(end_date);

-- Asset disposal indexes
CREATE INDEX IF NOT EXISTS idx_asset_disposals_asset_id ON asset_disposals(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_disposals_date ON asset_disposals(disposal_date);
CREATE INDEX IF NOT EXISTS idx_asset_disposals_account_id ON asset_disposals(account_id);

-- Add text search indexes for common search patterns
CREATE INDEX IF NOT EXISTS idx_income_entries_description_gin ON income_entries USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_expenditure_entries_description_gin ON expenditure_entries USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_liability_entries_creditor_gin ON liability_entries USING gin(to_tsvector('english', creditor_name));

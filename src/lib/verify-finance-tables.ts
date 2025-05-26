"use client";

import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

/**
 * Verify that all required finance tables exist
 * @returns Promise<{success: boolean, missingTables: string[]}>
 */
export async function verifyFinanceTables(): Promise<{
  success: boolean;
  missingTables: string[];
  error?: string;
}> {
  try {
    // List of required finance tables
    const requiredTables = [
      'accounts',
      'income_categories',
      'income_entries',
      'expenditure_categories',
      'expenditure_entries',
      'liability_categories',
      'liability_entries',
      'budgets',
      'budget_items',
      'bank_reconciliations',
      'reconciliation_items'
    ];

    const missingTables: string[] = [];

    // Check if each table exists
    for (const table of requiredTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.error(`Error checking table ${table}:`, error);
          missingTables.push(table);
        }
      } catch (error) {
        console.error(`Exception checking table ${table}:`, error);
        missingTables.push(table);
      }
    }

    return {
      success: missingTables.length === 0,
      missingTables
    };
  } catch (error) {
    console.error('Error verifying finance tables:', error);
    return {
      success: false,
      missingTables: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Create missing finance tables
 * @param missingTables List of tables to create
 * @returns Promise<{success: boolean, error?: string}>
 */
export async function createMissingFinanceTables(missingTables: string[]): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // SQL to create missing tables
    const createTableSQL = `
      -- Enable UUID extension if not already enabled
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- Create accounts table if it doesn't exist
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL UNIQUE,
        account_type TEXT NOT NULL DEFAULT 'bank',
        account_number TEXT,
        bank_name TEXT,
        balance DECIMAL(12, 2) DEFAULT 0,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create income_categories table if it doesn't exist
      CREATE TABLE IF NOT EXISTS income_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create expenditure_categories table if it doesn't exist
      CREATE TABLE IF NOT EXISTS expenditure_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create liability_categories table if it doesn't exist
      CREATE TABLE IF NOT EXISTS liability_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create liability_entries table if it doesn't exist
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

      -- Add foreign key constraint after table creation
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'liability_entries_category_id_fkey'
        ) THEN
          ALTER TABLE liability_entries
          ADD CONSTRAINT liability_entries_category_id_fkey
          FOREIGN KEY (category_id) REFERENCES liability_categories(id);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Ignore errors
      END $$;

      -- Create income_entries table if it doesn't exist
      CREATE TABLE IF NOT EXISTS income_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        date DATE NOT NULL,
        category_id UUID,
        description TEXT,
        amount DECIMAL(12, 2) NOT NULL,
        payment_method TEXT NOT NULL,
        payment_details JSONB DEFAULT '{}'::jsonb,
        account_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Add foreign key constraints after table creation
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'income_entries_category_id_fkey'
        ) THEN
          ALTER TABLE income_entries
          ADD CONSTRAINT income_entries_category_id_fkey
          FOREIGN KEY (category_id) REFERENCES income_categories(id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'income_entries_account_id_fkey'
        ) THEN
          ALTER TABLE income_entries
          ADD CONSTRAINT income_entries_account_id_fkey
          FOREIGN KEY (account_id) REFERENCES accounts(id);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Ignore errors
      END $$;

      -- Create expenditure_entries table if it doesn't exist
      CREATE TABLE IF NOT EXISTS expenditure_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        date DATE NOT NULL,
        category_id UUID,
        department_id UUID,
        description TEXT NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        recipient TEXT,
        payment_method TEXT NOT NULL,
        account_id UUID,
        liability_payment BOOLEAN DEFAULT FALSE,
        liability_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Add foreign key constraints after table creation
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'expenditure_entries_category_id_fkey'
        ) THEN
          ALTER TABLE expenditure_entries
          ADD CONSTRAINT expenditure_entries_category_id_fkey
          FOREIGN KEY (category_id) REFERENCES expenditure_categories(id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'expenditure_entries_account_id_fkey'
        ) THEN
          ALTER TABLE expenditure_entries
          ADD CONSTRAINT expenditure_entries_account_id_fkey
          FOREIGN KEY (account_id) REFERENCES accounts(id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'expenditure_entries_liability_id_fkey'
        ) THEN
          ALTER TABLE expenditure_entries
          ADD CONSTRAINT expenditure_entries_liability_id_fkey
          FOREIGN KEY (liability_id) REFERENCES liability_entries(id);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Ignore errors
      END $$;

      -- Create budgets table if it doesn't exist
      CREATE TABLE IF NOT EXISTS budgets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title TEXT NOT NULL,
        description TEXT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_amount DECIMAL(12, 2) NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create budget_items table if it doesn't exist
      CREATE TABLE IF NOT EXISTS budget_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        budget_id UUID NOT NULL,
        category_id UUID NOT NULL,
        category_type TEXT NOT NULL,
        description TEXT,
        planned_amount DECIMAL(12, 2) NOT NULL,
        actual_amount DECIMAL(12, 2) DEFAULT 0,
        variance DECIMAL(12, 2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Add foreign key constraints for budget_items
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'budget_items_budget_id_fkey'
        ) THEN
          ALTER TABLE budget_items
          ADD CONSTRAINT budget_items_budget_id_fkey
          FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Ignore errors
      END $$;

      -- Create bank_reconciliations table if it doesn't exist
      CREATE TABLE IF NOT EXISTS bank_reconciliations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        account_id UUID NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        bank_balance DECIMAL(12, 2) NOT NULL,
        book_balance DECIMAL(12, 2) NOT NULL,
        is_reconciled BOOLEAN DEFAULT FALSE,
        reconciled_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Add foreign key constraints for bank_reconciliations
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'bank_reconciliations_account_id_fkey'
        ) THEN
          ALTER TABLE bank_reconciliations
          ADD CONSTRAINT bank_reconciliations_account_id_fkey
          FOREIGN KEY (account_id) REFERENCES accounts(id);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Ignore errors
      END $$;

      -- Create reconciliation_items table if it doesn't exist
      CREATE TABLE IF NOT EXISTS reconciliation_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        reconciliation_id UUID NOT NULL,
        transaction_type TEXT NOT NULL,
        transaction_id UUID NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        date DATE NOT NULL,
        is_cleared BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Add foreign key constraints for reconciliation_items
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'reconciliation_items_reconciliation_id_fkey'
        ) THEN
          ALTER TABLE reconciliation_items
          ADD CONSTRAINT reconciliation_items_reconciliation_id_fkey
          FOREIGN KEY (reconciliation_id) REFERENCES bank_reconciliations(id) ON DELETE CASCADE;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Ignore errors
      END $$;

      -- Insert default categories if none exist
      INSERT INTO income_categories (name, description)
      SELECT 'Tithes', 'Regular tithes from members'
      WHERE NOT EXISTS (SELECT 1 FROM income_categories LIMIT 1);

      INSERT INTO income_categories (name, description)
      SELECT 'Offerings', 'General offerings'
      WHERE NOT EXISTS (SELECT 1 FROM income_categories WHERE name = 'Offerings');

      INSERT INTO income_categories (name, description)
      SELECT 'Donations', 'Donations from members and non-members'
      WHERE NOT EXISTS (SELECT 1 FROM income_categories WHERE name = 'Donations');

      INSERT INTO expenditure_categories (name, description)
      SELECT 'Utilities', 'Electricity, water, internet, etc.'
      WHERE NOT EXISTS (SELECT 1 FROM expenditure_categories LIMIT 1);

      INSERT INTO expenditure_categories (name, description)
      SELECT 'Salaries', 'Staff salaries and wages'
      WHERE NOT EXISTS (SELECT 1 FROM expenditure_categories WHERE name = 'Salaries');

      INSERT INTO expenditure_categories (name, description)
      SELECT 'Maintenance', 'Building and equipment maintenance'
      WHERE NOT EXISTS (SELECT 1 FROM expenditure_categories WHERE name = 'Maintenance');

      INSERT INTO liability_categories (name, description)
      SELECT 'Loans', 'Bank loans and other borrowed funds'
      WHERE NOT EXISTS (SELECT 1 FROM liability_categories LIMIT 1);

      INSERT INTO liability_categories (name, description)
      SELECT 'Mortgages', 'Property mortgages'
      WHERE NOT EXISTS (SELECT 1 FROM liability_categories WHERE name = 'Mortgages');

      INSERT INTO liability_categories (name, description)
      SELECT 'Vendor Payments', 'Payments due to vendors and suppliers'
      WHERE NOT EXISTS (SELECT 1 FROM liability_categories WHERE name = 'Vendor Payments');

      -- Insert a default account if none exists
      INSERT INTO accounts (name, account_type, description)
      SELECT 'Main Bank Account', 'bank', 'Primary church bank account'
      WHERE NOT EXISTS (SELECT 1 FROM accounts LIMIT 1);

      INSERT INTO accounts (name, account_type, description)
      SELECT 'Cash', 'cash', 'Cash on hand'
      WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE name = 'Cash');
    `;

    // Try to execute the SQL directly
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: createTableSQL });

      if (error) {
        console.error('Error creating tables with exec_sql:', error);

        // If the exec_sql function doesn't exist, try direct table creation
        // This is a fallback method that might work in some Supabase projects
        try {
          // Create tables one by one

          // Create income categories
          await supabase.from('income_categories').insert([
            { name: 'Tithes', description: 'Regular tithes from members' },
            { name: 'Offerings', description: 'General offerings' },
            { name: 'Donations', description: 'Donations from members and non-members' },
            { name: 'Asset Disposal', description: 'System category for income from asset disposals - auto-created' }
          ]);

          // Create expenditure categories
          await supabase.from('expenditure_categories').insert([
            { name: 'Utilities', description: 'Electricity, water, internet, etc.' },
            { name: 'Salaries', description: 'Staff salaries and wages' },
            { name: 'Maintenance', description: 'Building and equipment maintenance' }
          ]);

          // Create liability categories
          await supabase.from('liability_categories').insert([
            { name: 'Loans', description: 'Bank loans and other borrowed funds' },
            { name: 'Mortgages', description: 'Property mortgages' },
            { name: 'Vendor Payments', description: 'Payments due to vendors and suppliers' }
          ]);

          // Create accounts
          await supabase.from('accounts').insert([
            { name: 'Main Bank Account', account_type: 'bank', description: 'Primary church bank account' },
            { name: 'Cash', account_type: 'cash', description: 'Cash on hand' }
          ]);

          return { success: true };
        } catch (directError) {
          console.error('Error with direct table creation:', directError);
          return {
            success: false,
            error: 'Failed to create tables. The exec_sql function may not be available in your Supabase project. Please run the SQL script manually in the Supabase SQL Editor.'
          };
        }
      }

      return { success: true };
    } catch (execError) {
      console.error('Exception during table creation:', execError);

      return {
        success: false,
        error: 'Failed to create tables. Please run the SQL script manually in the Supabase SQL Editor.'
      };
    }
  } catch (error) {
    console.error('Error creating missing tables:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

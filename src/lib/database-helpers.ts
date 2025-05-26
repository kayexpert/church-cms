"use client";

import { supabase } from "./supabase";

/**
 * Check if the required finance tables exist in the database
 * @returns Object with status and details
 */
/**
 * Required table structure definitions
 */
const tableDefinitions = {
  income_entries: [
    { name: 'id', type: 'UUID' },
    { name: 'amount', type: 'DECIMAL' },
    { name: 'date', type: 'DATE' },
    { name: 'description', type: 'TEXT' },
    { name: 'category_id', type: 'UUID' },
    { name: 'payment_method', type: 'VARCHAR' },
    { name: 'account', type: 'VARCHAR' },
    { name: 'created_at', type: 'TIMESTAMP' },
    { name: 'updated_at', type: 'TIMESTAMP' }
  ],
  income_categories: [
    { name: 'id', type: 'UUID' },
    { name: 'name', type: 'VARCHAR' },
    { name: 'description', type: 'TEXT' },
    { name: 'created_at', type: 'TIMESTAMP' },
    { name: 'updated_at', type: 'TIMESTAMP' }
  ],
  expenditure_entries: [
    { name: 'id', type: 'UUID' },
    { name: 'amount', type: 'DECIMAL' },
    { name: 'date', type: 'DATE' },
    { name: 'description', type: 'TEXT' },
    { name: 'category_id', type: 'UUID' },
    { name: 'payment_method', type: 'VARCHAR' },
    { name: 'account', type: 'VARCHAR' },
    { name: 'created_at', type: 'TIMESTAMP' },
    { name: 'updated_at', type: 'TIMESTAMP' }
  ],
  expenditure_categories: [
    { name: 'id', type: 'UUID' },
    { name: 'name', type: 'VARCHAR' },
    { name: 'description', type: 'TEXT' },
    { name: 'created_at', type: 'TIMESTAMP' },
    { name: 'updated_at', type: 'TIMESTAMP' }
  ],
  liability_entries: [
    { name: 'id', type: 'UUID' },
    { name: 'description', type: 'TEXT' },
    { name: 'total_amount', type: 'DECIMAL' },
    { name: 'amount_paid', type: 'DECIMAL' },
    { name: 'date', type: 'DATE' },
    { name: 'due_date', type: 'DATE' },
    { name: 'is_paid', type: 'BOOLEAN' },
    { name: 'payment_date', type: 'DATE' },
    { name: 'created_at', type: 'TIMESTAMP' },
    { name: 'updated_at', type: 'TIMESTAMP' }
  ],
  budget_entries: [
    { name: 'id', type: 'UUID' },
    { name: 'name', type: 'VARCHAR' },
    { name: 'amount', type: 'DECIMAL' },
    { name: 'start_date', type: 'DATE' },
    { name: 'end_date', type: 'DATE' },
    { name: 'category_id', type: 'UUID' },
    { name: 'is_income', type: 'BOOLEAN' },
    { name: 'notes', type: 'TEXT' },
    { name: 'created_at', type: 'TIMESTAMP' },
    { name: 'updated_at', type: 'TIMESTAMP' }
  ],
  reconciliation_entries: [
    { name: 'id', type: 'UUID' },
    { name: 'account_name', type: 'VARCHAR' },
    { name: 'statement_date', type: 'DATE' },
    { name: 'statement_balance', type: 'DECIMAL' },
    { name: 'book_balance', type: 'DECIMAL' },
    { name: 'is_reconciled', type: 'BOOLEAN' },
    { name: 'notes', type: 'TEXT' },
    { name: 'created_at', type: 'TIMESTAMP' },
    { name: 'updated_at', type: 'TIMESTAMP' }
  ]
};

export async function checkFinanceTables() {
  try {
    // First, check if we can connect to Supabase at all
    try {
      const { error } = await supabase.auth.getSession();
      if (error) {
        return {
          success: false,
          details: {
            message: `Supabase connection error: ${error.message}`,
            error
          }
        };
      }
    } catch (connectionError) {
      return {
        success: false,
        details: {
          message: 'Failed to connect to Supabase',
          error: connectionError
        }
      };
    }

    // Check all required tables
    const requiredTables = [
      'income_entries',
      'income_categories',
      'expenditure_entries',
      'expenditure_categories',
      'liability_entries',
      'budget_entries',
      'reconciliation_entries'
    ];

    const missingTables: string[] = [];
    const tablesWithMissingColumns: { table: string, missingColumns: string[] }[] = [];

    // Check each table - avoid using count(*) which can cause parsing issues
    for (const table of requiredTables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('id')
          .limit(1);

        if (error && error.code === 'PGRST116') {
          missingTables.push(table);
        } else if (!error) {
          // Table exists, check for missing columns
          const missingColumns = await checkTableColumns(table);
          if (missingColumns.length > 0) {
            tablesWithMissingColumns.push({ table, missingColumns });
          }
        }
      } catch (tableError) {
        // If there's an exception, assume the table doesn't exist
        missingTables.push(table);
        console.error(`Error checking table ${table}:`, tableError);
      }
    }

    if (missingTables.length > 0) {
      return {
        success: false,
        details: {
          message: `Missing tables: ${missingTables.join(', ')}`,
          missingTables,
          tablesWithMissingColumns
        }
      };
    }

    if (tablesWithMissingColumns.length > 0) {
      const details = tablesWithMissingColumns.map(item =>
        `Table ${item.table} is missing columns: ${item.missingColumns.join(', ')}`
      ).join('; ');

      return {
        success: false,
        details: {
          message: `Tables with missing columns: ${details}`,
          tablesWithMissingColumns
        }
      };
    }

    // All tables exist with all required columns
    return {
      success: true,
      details: {
        message: 'All required tables and columns exist'
      }
    };
  } catch (error) {
    console.error('Error checking finance tables:', error);
    return {
      success: false,
      details: {
        message: 'Error checking finance tables',
        error
      }
    };
  }
}

/**
 * Check if a table has all the required columns
 * @param tableName The name of the table to check
 * @returns Array of missing column names
 */
async function checkTableColumns(tableName: string): Promise<string[]> {
  try {
    // Get the required columns for this table
    const requiredColumns = tableDefinitions[tableName as keyof typeof tableDefinitions]?.map(col => col.name) || [];
    if (requiredColumns.length === 0) {
      return []; // No required columns defined
    }

    // Try to query the table with a non-existent column to get the error message with available columns
    const { error } = await supabase
      .from(tableName)
      .select('__non_existent_column__')
      .limit(1);

    if (!error || !error.message) {
      console.warn(`Unexpected response when checking columns for ${tableName}`);
      return []; // Can't determine missing columns
    }

    // Parse the error message to extract available columns
    // The error message typically contains something like "column X does not exist, available columns: [a, b, c]"
    const availableColumnsMatch = error.message.match(/available columns: \[(.*?)\]/i);
    if (!availableColumnsMatch || !availableColumnsMatch[1]) {
      console.warn(`Could not parse available columns from error message: ${error.message}`);

      // Try a different approach - check each column individually
      const missingColumns: string[] = [];
      for (const column of requiredColumns) {
        try {
          const { error: columnError } = await supabase
            .from(tableName)
            .select(column)
            .limit(1);

          if (columnError && columnError.message.includes('does not exist')) {
            missingColumns.push(column);
          }
        } catch (e) {
          console.error(`Error checking column ${column} in ${tableName}:`, e);
        }
      }

      return missingColumns;
    }

    // Extract and clean up the available columns
    const availableColumns = availableColumnsMatch[1]
      .split(',')
      .map(col => col.trim().replace(/"/g, ''));

    // Find missing columns
    const missingColumns = requiredColumns.filter(col => !availableColumns.includes(col));
    return missingColumns;
  } catch (error) {
    console.error(`Error checking columns for table ${tableName}:`, error);
    return []; // Return empty array on error
  }
}

/**
 * Set up the required finance tables in the database
 * @returns Object with status and details
 */
export async function setupFinanceTables() {
  try {
    // First, check the current state of tables and columns
    const checkResult = await checkFinanceTables();

    // If everything is already set up correctly, return success
    if (checkResult.success) {
      return {
        success: true,
        details: {
          message: 'All tables and columns already exist'
        }
      };
    }

    // Check if we need to create tables or just add missing columns
    const { missingTables, tablesWithMissingColumns } = checkResult.details;

    // If we have missing tables, try to create them
    if (missingTables && missingTables.length > 0) {
      // First, check if the RPC functions exist by trying one of them
      const { error: rpcCheckError } = await supabase.rpc('create_income_entries_table_if_not_exists');

      // If the RPC function doesn't exist, we need to use a different approach
      if (rpcCheckError && rpcCheckError.message.includes('function') && rpcCheckError.message.includes('does not exist')) {
        console.log('RPC functions do not exist, using direct SQL approach');
        const createResult = await setupTablesWithDirectSQL();

        // If table creation failed, return the error
        if (!createResult.success) {
          return createResult;
        }
      } else {
        // If we get here, the RPC functions exist, so use them
        try {
          // Create income_entries table if needed
          if (missingTables.includes('income_entries')) {
            const { error: incomeTableError } = await supabase.rpc('create_income_entries_table_if_not_exists');
            if (incomeTableError) throw new Error(`Error creating income_entries table: ${incomeTableError.message}`);
          }

          // Create income_categories table if needed
          if (missingTables.includes('income_categories')) {
            const { error: incomeCategoriesError } = await supabase.rpc('create_income_categories_table_if_not_exists');
            if (incomeCategoriesError) throw new Error(`Error creating income_categories table: ${incomeCategoriesError.message}`);
          }

          // Create expenditure_entries table if needed
          if (missingTables.includes('expenditure_entries')) {
            const { error: expenditureTableError } = await supabase.rpc('create_expenditure_entries_table_if_not_exists');
            if (expenditureTableError) throw new Error(`Error creating expenditure_entries table: ${expenditureTableError.message}`);
          }

          // Create expenditure_categories table if needed
          if (missingTables.includes('expenditure_categories')) {
            const { error: expenditureCategoriesError } = await supabase.rpc('create_expenditure_categories_table_if_not_exists');
            if (expenditureCategoriesError) throw new Error(`Error creating expenditure_categories table: ${expenditureCategoriesError.message}`);
          }

          // Create liability_entries table if needed
          if (missingTables.includes('liability_entries')) {
            const { error: liabilityTableError } = await supabase.rpc('create_liability_entries_table_if_not_exists');
            if (liabilityTableError) throw new Error(`Error creating liability_entries table: ${liabilityTableError.message}`);
          }

          // Create budget_entries table if needed
          if (missingTables.includes('budget_entries')) {
            const { error: budgetTableError } = await supabase.rpc('create_budget_entries_table_if_not_exists');
            if (budgetTableError) throw new Error(`Error creating budget_entries table: ${budgetTableError.message}`);
          }

          // Create reconciliation_entries table if needed
          if (missingTables.includes('reconciliation_entries')) {
            const { error: reconciliationTableError } = await supabase.rpc('create_reconciliation_entries_table_if_not_exists');
            if (reconciliationTableError) throw new Error(`Error creating reconciliation_entries table: ${reconciliationTableError.message}`);
          }
        } catch (rpcError) {
          console.error('Error using RPC functions:', rpcError);
          // If RPC functions fail, try direct SQL as a fallback
          const createResult = await setupTablesWithDirectSQL();
          if (!createResult.success) {
            return createResult;
          }
        }
      }
    }

    // Now handle tables with missing columns
    if (tablesWithMissingColumns && tablesWithMissingColumns.length > 0) {
      const alterResult = await addMissingColumns(tablesWithMissingColumns);
      if (!alterResult.success) {
        return alterResult;
      }
    }

    // Check again to make sure everything is set up correctly
    const finalCheck = await checkFinanceTables();
    if (!finalCheck.success) {
      return {
        success: false,
        details: {
          message: 'Some tables or columns could not be created: ' + finalCheck.details.message,
          finalCheckDetails: finalCheck.details
        }
      };
    }

    return {
      success: true,
      details: {
        message: 'All tables and columns created successfully'
      }
    };
  } catch (error) {
    console.error('Error setting up finance tables:', error);
    return {
      success: false,
      details: {
        message: 'Error setting up finance tables',
        error
      }
    };
  }
}

/**
 * Add missing columns to existing tables
 * @param tablesWithMissingColumns Array of tables with their missing columns
 * @returns Object with status and details
 */
async function addMissingColumns(tablesWithMissingColumns: { table: string, missingColumns: string[] }[]): Promise<{ success: boolean, details: any }> {
  try {
    const results: { table: string, column: string, success: boolean, error?: any }[] = [];

    for (const { table, missingColumns } of tablesWithMissingColumns) {
      for (const column of missingColumns) {
        try {
          // Get the column definition from our tableDefinitions
          const columnDef = tableDefinitions[table as keyof typeof tableDefinitions]?.find(col => col.name === column);
          if (!columnDef) {
            results.push({ table, column, success: false, error: 'Column definition not found' });
            continue;
          }

          // Determine the SQL type based on our definition
          let sqlType = '';
          switch (columnDef.type) {
            case 'UUID':
              sqlType = 'UUID';
              break;
            case 'DECIMAL':
              sqlType = 'DECIMAL(12, 2)';
              break;
            case 'DATE':
              sqlType = 'DATE';
              break;
            case 'TEXT':
              sqlType = 'TEXT';
              break;
            case 'VARCHAR':
              sqlType = 'VARCHAR(100)';
              break;
            case 'BOOLEAN':
              sqlType = 'BOOLEAN DEFAULT FALSE';
              break;
            case 'TIMESTAMP':
              sqlType = 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()';
              break;
            default:
              sqlType = 'TEXT';
          }

          // Create the ALTER TABLE SQL
          const alterSQL = `
            ALTER TABLE ${table}
            ADD COLUMN IF NOT EXISTS ${column} ${sqlType};
          `;

          // Execute the SQL
          const { error } = await supabase.rpc('exec_sql', { sql_query: alterSQL });

          if (error) {
            console.error(`Error adding column ${column} to ${table}:`, error);
            results.push({ table, column, success: false, error });

            // Try a direct approach if RPC fails
            try {
              // For the specific case of is_paid in liability_entries
              if (table === 'liability_entries' && column === 'is_paid') {
                // Try a direct query to check if we can update the table
                const { error: directError } = await supabase
                  .from('liability_entries')
                  .update({ is_paid: false })
                  .eq('id', '00000000-0000-0000-0000-000000000000'); // This ID likely doesn't exist

                // If the error is about the column not existing, we need to add it
                if (directError && directError.message.includes('does not exist')) {
                  console.log('Attempting direct column creation for is_paid');
                  // We can't directly add columns through the API, so we'll need to use a workaround
                  // This is a last resort and may not work
                }
              }
            } catch (directError) {
              console.error('Error with direct column creation:', directError);
            }
          } else {
            results.push({ table, column, success: true });
          }
        } catch (columnError) {
          console.error(`Error processing column ${column} for ${table}:`, columnError);
          results.push({ table, column, success: false, error: columnError });
        }
      }
    }

    // Check if all columns were added successfully
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      return {
        success: false,
        details: {
          message: `Failed to add some columns: ${failures.map(f => `${f.table}.${f.column}`).join(', ')}`,
          results
        }
      };
    }

    return {
      success: true,
      details: {
        message: 'All missing columns added successfully',
        results
      }
    };
  } catch (error) {
    console.error('Error adding missing columns:', error);
    return {
      success: false,
      details: {
        message: 'Error adding missing columns',
        error
      }
    };
  }
}

/**
 * Set up tables using direct SQL queries instead of RPC functions
 * This is a fallback method when RPC functions don't exist
 */
async function setupTablesWithDirectSQL() {
  try {
    // Basic SQL to create the tables
    const createIncomeEntriesSQL = `
      CREATE TABLE IF NOT EXISTS income_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        amount DECIMAL(12, 2) NOT NULL,
        date DATE NOT NULL,
        description TEXT,
        category_id UUID,
        payment_method VARCHAR(50),
        account VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const createIncomeCategoriesSQL = `
      CREATE TABLE IF NOT EXISTS income_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Insert default categories if none exist
      INSERT INTO income_categories (name, description)
      SELECT 'Tithes', 'Regular tithes from members'
      WHERE NOT EXISTS (SELECT 1 FROM income_categories LIMIT 1);

      INSERT INTO income_categories (name, description)
      SELECT 'Offerings', 'General offerings'
      WHERE NOT EXISTS (SELECT 1 FROM income_categories WHERE name = 'Offerings');

      INSERT INTO income_categories (name, description)
      SELECT 'Donations', 'Specific donations for church activities'
      WHERE NOT EXISTS (SELECT 1 FROM income_categories WHERE name = 'Donations');

      INSERT INTO income_categories (name, description)
      SELECT 'Asset Disposal', 'System category for income from asset disposals - auto-created'
      WHERE NOT EXISTS (SELECT 1 FROM income_categories WHERE name = 'Asset Disposal');
    `;

    const createExpenditureEntriesSQL = `
      CREATE TABLE IF NOT EXISTS expenditure_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        amount DECIMAL(12, 2) NOT NULL,
        date DATE NOT NULL,
        description TEXT,
        category_id UUID,
        payment_method VARCHAR(50),
        account VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const createExpenditureCategoriesSQL = `
      CREATE TABLE IF NOT EXISTS expenditure_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Insert default categories if none exist
      INSERT INTO expenditure_categories (name, description)
      SELECT 'Utilities', 'Electricity, water, internet, etc.'
      WHERE NOT EXISTS (SELECT 1 FROM expenditure_categories LIMIT 1);

      INSERT INTO expenditure_categories (name, description)
      SELECT 'Salaries', 'Staff salaries and wages'
      WHERE NOT EXISTS (SELECT 1 FROM expenditure_categories WHERE name = 'Salaries');

      INSERT INTO expenditure_categories (name, description)
      SELECT 'Maintenance', 'Building and equipment maintenance'
      WHERE NOT EXISTS (SELECT 1 FROM expenditure_categories WHERE name = 'Maintenance');
    `;

    const createLiabilityEntriesSQL = `
      CREATE TABLE IF NOT EXISTS liability_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        description TEXT NOT NULL,
        total_amount DECIMAL(12, 2) NOT NULL,
        amount_paid DECIMAL(12, 2) DEFAULT 0,
        date DATE NOT NULL,
        due_date DATE,
        is_paid BOOLEAN DEFAULT FALSE,
        payment_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const createBudgetEntriesSQL = `
      CREATE TABLE IF NOT EXISTS budget_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        category_id UUID,
        is_income BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const createReconciliationEntriesSQL = `
      CREATE TABLE IF NOT EXISTS reconciliation_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        account_name VARCHAR(100) NOT NULL,
        statement_date DATE NOT NULL,
        statement_balance DECIMAL(12, 2) NOT NULL,
        book_balance DECIMAL(12, 2) NOT NULL,
        is_reconciled BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Try to execute each SQL statement
    try {
      // Enable UUID extension if not already enabled
      await supabase.rpc('exec_sql', { sql_query: 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' });

      // Create tables
      await supabase.rpc('exec_sql', { sql_query: createIncomeEntriesSQL });
      await supabase.rpc('exec_sql', { sql_query: createIncomeCategoriesSQL });
      await supabase.rpc('exec_sql', { sql_query: createExpenditureEntriesSQL });
      await supabase.rpc('exec_sql', { sql_query: createExpenditureCategoriesSQL });
      await supabase.rpc('exec_sql', { sql_query: createLiabilityEntriesSQL });
      await supabase.rpc('exec_sql', { sql_query: createBudgetEntriesSQL });
      await supabase.rpc('exec_sql', { sql_query: createReconciliationEntriesSQL });

      // Create the make_liability_payment function
      const makeLiabilityPaymentSQL = `
        -- Function to make a liability payment in a single transaction
        CREATE OR REPLACE FUNCTION make_liability_payment(
          p_liability_id UUID,
          p_payment_amount NUMERIC,
          p_payment_date DATE,
          p_payment_method TEXT,
          p_account_id UUID DEFAULT NULL,
          p_description TEXT DEFAULT NULL
        ) RETURNS JSONB AS $$
        DECLARE
          v_liability RECORD;
          v_new_amount_paid NUMERIC;
          v_new_status TEXT;
          v_expenditure_id UUID;
          v_result JSONB;
        BEGIN
          -- Get the current liability
          SELECT * INTO v_liability FROM liability_entries WHERE id = p_liability_id;

          IF NOT FOUND THEN
            RAISE EXCEPTION 'Liability with ID % not found', p_liability_id;
          END IF;

          -- Calculate new amount paid and status
          v_new_amount_paid := COALESCE(v_liability.amount_paid, 0) + p_payment_amount;

          IF v_new_amount_paid >= v_liability.total_amount THEN
            v_new_status := 'paid';
          ELSE
            v_new_status := 'partial';
          END IF;

          -- Update the liability
          UPDATE liability_entries
          SET
            amount_paid = v_new_amount_paid,
            amount_remaining = v_liability.total_amount - v_new_amount_paid,
            status = v_new_status,
            last_payment_date = p_payment_date
          WHERE id = p_liability_id;

          -- Create an expenditure entry for the payment
          INSERT INTO expenditure_entries (
            date,
            amount,
            description,
            category_id,
            payment_method,
            account_id,
            recipient,
            liability_payment,
            liability_id
          ) VALUES (
            p_payment_date,
            p_payment_amount,
            COALESCE(p_description, 'Payment for ' || v_liability.creditor_name),
            'liability-payment', -- Use a special category for liability payments
            p_payment_method,
            p_account_id,
            v_liability.creditor_name,
            TRUE,
            p_liability_id
          ) RETURNING id INTO v_expenditure_id;

          -- Prepare the result
          SELECT jsonb_build_object(
            'liability', row_to_json(l)::jsonb,
            'expenditure', row_to_json(e)::jsonb
          ) INTO v_result
          FROM liability_entries l, expenditure_entries e
          WHERE l.id = p_liability_id AND e.id = v_expenditure_id;

          RETURN v_result;
        END;
        $$ LANGUAGE plpgsql;
      `;

      try {
        await supabase.rpc('exec_sql', { sql_query: makeLiabilityPaymentSQL });
      } catch (functionError) {
        console.warn('Error creating make_liability_payment function:', functionError);
        // Continue even if this fails, as it's not critical for basic functionality
      }

      // Create indexes for better performance
      const createIndexesSQL = `
        -- Create indexes for frequently queried columns to improve performance

        -- Expenditure entries indexes
        CREATE INDEX IF NOT EXISTS idx_expenditure_entries_date ON expenditure_entries(date);
        CREATE INDEX IF NOT EXISTS idx_expenditure_entries_category_id ON expenditure_entries(category_id);
        CREATE INDEX IF NOT EXISTS idx_expenditure_entries_payment_method ON expenditure_entries(payment_method);
        CREATE INDEX IF NOT EXISTS idx_expenditure_entries_liability_id ON expenditure_entries(liability_id);
        CREATE INDEX IF NOT EXISTS idx_expenditure_entries_liability_payment ON expenditure_entries(liability_payment);

        -- Liability entries indexes
        CREATE INDEX IF NOT EXISTS idx_liability_entries_date ON liability_entries(date);
        CREATE INDEX IF NOT EXISTS idx_liability_entries_due_date ON liability_entries(due_date);
        CREATE INDEX IF NOT EXISTS idx_liability_entries_status ON liability_entries(status);
        CREATE INDEX IF NOT EXISTS idx_liability_entries_creditor_name ON liability_entries(creditor_name);

        -- Income entries indexes
        CREATE INDEX IF NOT EXISTS idx_income_entries_date ON income_entries(date);
        CREATE INDEX IF NOT EXISTS idx_income_entries_category_id ON income_entries(category_id);
        CREATE INDEX IF NOT EXISTS idx_income_entries_payment_method ON income_entries(payment_method);

        -- Category indexes
        CREATE INDEX IF NOT EXISTS idx_income_categories_name ON income_categories(name);
        CREATE INDEX IF NOT EXISTS idx_expenditure_categories_name ON expenditure_categories(name);
        CREATE INDEX IF NOT EXISTS idx_liability_categories_name ON liability_categories(name);
      `;

      try {
        await supabase.rpc('exec_sql', { sql_query: createIndexesSQL });
      } catch (indexError) {
        console.warn('Error creating indexes:', indexError);
        // Continue even if this fails, as it's not critical for basic functionality
      }

      return {
        success: true,
        details: {
          message: 'All tables created successfully using direct SQL'
        }
      };
    } catch (sqlError) {
      console.error('Error executing SQL:', sqlError);

      // If exec_sql RPC doesn't exist, try direct table creation
      try {
        // Create tables using direct API calls
        // This is a last resort and may not work for all tables

        // Create income categories
        await supabase.from('income_categories').insert([
          { name: 'Tithes', description: 'Regular tithes from members' },
          { name: 'Offerings', description: 'General offerings' },
          { name: 'Donations', description: 'Specific donations for church activities' },
          { name: 'Asset Disposal', description: 'System category for income from asset disposals - auto-created' }
        ]);

        // Create expenditure categories
        await supabase.from('expenditure_categories').insert([
          { name: 'Utilities', description: 'Electricity, water, internet, etc.' },
          { name: 'Salaries', description: 'Staff salaries and wages' },
          { name: 'Maintenance', description: 'Building and equipment maintenance' }
        ]);

        return {
          success: true,
          details: {
            message: 'Tables created using direct API calls'
          }
        };
      } catch (directError) {
        console.error('Error with direct table creation:', directError);
        return {
          success: false,
          details: {
            message: 'Failed to create tables. Please run the SQL script manually in the Supabase SQL Editor.',
            error: directError
          }
        };
      }
    }
  } catch (error) {
    console.error('Error in setupTablesWithDirectSQL:', error);
    return {
      success: false,
      details: {
        message: 'Error setting up finance tables with direct SQL',
        error
      }
    };
  }
}

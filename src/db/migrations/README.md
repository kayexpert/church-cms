# Database Migration Scripts

This directory contains SQL scripts to set up and maintain the database schema for the Church CMS application.

## Migration Files Overview

- `create_settings_tables.sql`: Main setup script that creates all necessary tables and policies
- `create_exec_sql_function.sql`: Creates utility functions for executing SQL queries
- `ensure_profiles_table.sql`: Sets up the profiles table and related policies
- `add_profile_image_column.sql`: Adds profile image support to the profiles table
- `optimized_indexes.sql`: Adds performance-enhancing indexes to database tables
- `analytics_tables.sql`: Creates tables for analytics functionality
- `create_events_tables.sql`: Creates tables for events and event categories
- `add_account_id_to_budget_items.sql`: Adds account_id column to budget_items table for budget-account linking
- `add_budget_item_id_to_expenditures.sql`: Adds budget_item_id column to expenditure_entries table
- `direct_migration.sql`: Combined migration script for budget-expenditure integration
- `direct_sql_editor_migration.sql`: SQL script to run directly in Supabase SQL Editor

## Setting Up the Database

To set up the database, follow these steps:

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the following scripts in order:

### 1. Create SQL Execution Functions

Run the `create_exec_sql_function.sql` script to create utility functions that allow the application to execute SQL queries.

### 2. Run Main Setup Script

Run the `create_settings_tables.sql` script to create all the necessary tables and policies.

### 3. Set Up Profiles Table

Run the `ensure_profiles_table.sql` script to create the profiles table and set up the necessary policies.

### 4. Add Profile Image Column

Run the `add_profile_image_column.sql` script to add the profile_image column to the profiles table.

### 5. Add Performance Indexes

Run the `optimized_indexes.sql` script to add performance-enhancing indexes to the database tables.

## Automated Migration

You can also use the automated migration script to apply all migrations in the correct order:

```bash
npm run migrate
```

## Budget-Expenditure Integration Migrations

To set up the database for the Budget Income → Expenditure Integration feature, you have several options:

### Option 1: Use the Migration Admin Page (Recommended)

1. Start the development server:
   ```
   npm run dev
   ```

2. Navigate to the Migration Admin Page:
   ```
   http://localhost:3000/admin/migrations
   ```

3. Click the "Run All Migrations" button in the "Run Direct SQL Migration" card.

### Option 2: Run SQL Directly in Supabase

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy the contents of `direct_sql_editor_migration.sql`
4. Paste into the SQL Editor and run the script

### Option 3: Run Individual Migrations

If you prefer to run the migrations individually, you can use the Migration Admin Page and click the individual migration buttons:

1. "Add Account ID to Budget Items"
2. "Add Budget Item ID to Expenditures"

## Troubleshooting

If you encounter any issues with the database functionality:

1. Check the browser console for specific error messages
2. Verify that all migration scripts have been applied successfully
3. Run the `QUICK_FIX.md` script if you're experiencing profile image issues
4. Make sure your Supabase project has the necessary permissions

### Troubleshooting Budget-Expenditure Integration

If you encounter issues with the budget-expenditure integration:

1. Check if the required columns exist by running this SQL in the Supabase SQL Editor:
   ```sql
   SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_name = 'budget_items' AND column_name = 'account_id'
   ) as budget_items_account_id_exists;

   SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_name = 'expenditure_entries' AND column_name = 'budget_item_id'
   ) as expenditure_entries_budget_item_id_exists;
   ```

2. If the columns don't exist, try running the direct SQL migration script
3. Check if the "Budget Allocation" expenditure category exists

# Database Management for Church CMS

This directory contains database-related code for the Church CMS application, including setup scripts, migrations, and utility functions.

## Directory Structure

- `migrations/`: Consolidated SQL migration files for setting up the database schema
- `setup-database.js`: Script to set up the initial database schema
- `migrate.ts`: Script to apply database migrations in a versioned manner

## Consolidated Migration Files

The database schema is organized into consolidated migration files for better maintainability:

1. `consolidated_core_tables.sql`: Creates all core tables (church_info, members, departments, etc.)
2. `consolidated_messaging_tables.sql`: Creates all messaging-related tables and policies
3. `consolidated_budget_expenditure.sql`: Sets up budget-expenditure integration
4. `consolidated_indexes.sql`: Adds performance-enhancing indexes to all tables

## Database Setup

Before using the application, you need to set up the database tables. You have two options:

### Option 1: Using the Setup Script (Recommended)

```bash
npm run setup-database
```

This script will automatically apply all the consolidated migration files in the correct order.

### Option 2: Manual Setup in Supabase SQL Editor

If the setup script doesn't work, you can manually set up the database tables:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the consolidated migration files in this order:
   - `consolidated_core_tables.sql`
   - `consolidated_messaging_tables.sql`
   - `consolidated_budget_expenditure.sql`
   - `consolidated_indexes.sql`

## Database Migrations

To apply database migrations after initial setup:

```bash
npm run migrate
```

This script will check which migrations have already been applied and only run the new ones.

## Main Database Tables

The Church CMS database consists of the following main tables:

### Core Tables
- `church_info`: Church information and settings
- `members`: Church members information
- `departments`: Church departments
- `certificates`: Certificates issued by the church
- `covenant_families`: Covenant families in the church
- `profiles`: User profiles for authentication

### Finance Tables
- `accounts`: Bank/cash accounts
- `income_categories`: Categories for income
- `income_entries`: Income transactions
- `expenditure_categories`: Categories for expenditure
- `expenditure_entries`: Expenditure transactions
- `liability_categories`: Categories for liabilities
- `liability_entries`: Liability records
- `budgets`: Budget records
- `budget_items`: Individual budget items
- `bank_reconciliations`: Bank reconciliation records
- `reconciliation_items`: Individual reconciliation items

### Events Tables
- `events`: Church events
- `event_categories`: Categories for events
- `attendance`: Attendance records

### Messaging Tables
- `messaging_configurations`: SMS provider configurations
- `messages`: Message templates and scheduled messages
- `message_recipients`: Recipients for messages
- `message_logs`: Message delivery logs

## Troubleshooting

If you encounter any issues with the database functionality:

1. Check the browser console for specific error messages
2. Verify that all migration scripts have been applied successfully
3. Make sure your Supabase project has the necessary permissions

### Common Issues and Solutions

#### Missing Tables or Columns

If you're experiencing issues with missing tables or columns, run the appropriate consolidated migration script.

#### Row Level Security Issues

If you're experiencing permission issues, make sure the RLS policies have been properly applied. You can check this in the Supabase dashboard under Authentication > Policies.

#### Performance Issues

If you're experiencing performance issues, make sure the `consolidated_indexes.sql` script has been run to add performance-enhancing indexes to the database tables.

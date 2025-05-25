# Settings Page

This directory contains the settings page for the Church CMS application. The settings page allows users to configure various aspects of the application, including church information, membership settings, finance settings, and database settings.

## Database Setup

Before using the settings page, you need to set up the database tables. You have two options:

### Option 1: Using the Setup Script

First, downgrade React to version 18 to avoid dependency conflicts:

```bash
npm install react@18.2.0 react-dom@18.2.0 --save --legacy-peer-deps
npm install @types/react@18 @types/react-dom@18 --save-dev --legacy-peer-deps
```

Then run the setup script:

```bash
npm run setup-database
```

### Option 2: Manual Setup in Supabase SQL Editor

If the setup script doesn't work, you can manually set up the database tables:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `src/db/migrations/fixed_setup.sql`
4. Paste it into the SQL Editor and run it

**Note:** If you encounter a syntax error like `ERROR: 42601: syntax error at or near "NOT"`, make sure you're using the `fixed_setup.sql` file which removes the `IF NOT EXISTS` clause from policy creation statements (this clause is not supported for policies in PostgreSQL).

Either method will create all the necessary tables in your Supabase database, including:

- `church_info`: Church information
- `departments`: Church departments
- `certificates`: Certificates that can be assigned to members
- `covenant_families`: Covenant families/groups
- `event_categories`: Categories for church events
- `income_categories`: Categories for income transactions
- `expenditure_categories`: Categories for expense transactions
- `liability_categories`: Categories for liabilities
- `accounts`: Bank accounts, cash accounts, and other financial accounts

## Settings Sections

The settings page is divided into the following sections:

### General Settings
- **Church Information**: Manage church details (name, address, contact info, etc.)
- **Profile**: Manage the user's profile information

### Membership Settings
- **Departments**: Manage church departments
- **Certificates**: Manage certificates that can be assigned to members
- **Groups (Covenant Families)**: Manage covenant families/groups
- **Event Categories**: Manage categories for church events

### Finance Settings
- **Income Categories**: Manage categories for income transactions
- **Expense Categories**: Manage categories for expense transactions
- **Liability Categories**: Manage categories for liabilities
- **Accounts**: Manage bank accounts, cash accounts, and other financial accounts

### Database Settings
- **Export Database**: Export all data to a JSON file
- **Import Database**: Import data from a previously exported JSON file
- **Reset Database**: Reset transactional data while keeping settings intact

## Troubleshooting

If you encounter any issues with the settings page, try the following:

### Dependency Issues

If you see errors related to React version compatibility:

```
npm error ERESOLVE could not resolve
npm error While resolving: react-day-picker@8.10.1
npm error Found: react@19.1.0
```

Fix by downgrading React:

```bash
npm install react@18.2.0 react-dom@18.2.0 --save --legacy-peer-deps
npm install @types/react@18 @types/react-dom@18 --save-dev --legacy-peer-deps
```

### Database Issues

If you see errors like "Error loading church information":

1. Make sure you have set up the database tables using one of the methods described above
2. Check your Supabase credentials in the `.env.local` file
3. Try the manual setup method using the SQL Editor in Supabase

If you encounter a SQL syntax error like `ERROR: 42601: syntax error at or near "NOT"`:

1. This is because the `IF NOT EXISTS` clause is not supported for policies in PostgreSQL
2. Use the `fixed_setup.sql` file instead of `manual_setup.sql` or `create_settings_tables.sql`
3. The fixed script removes the `IF NOT EXISTS` clause and adds `DROP POLICY IF EXISTS` statements instead

### Other Issues

1. Check the browser console for any error messages
2. Try refreshing the page
3. Clear your browser cache
4. Restart the development server with `npm run dev`

If you continue to experience issues, please contact the administrator.

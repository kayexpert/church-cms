# Expenditure Categories Migration

This migration addresses issues with budget and liability expenditure categories in the system.

## Issues Fixed

1. **Budget Categories Issue**
   - Previously, the system created a new expenditure category in the database each time a new budget was created, resulting in too many system-generated budget categories.
   - Now, all budget-related expenditure entries use a single, consistent category named "Budget Allocation" instead of creating new categories.

2. **Liability Categories Issue**
   - Similarly, liability payment expenditures now use a single category named "Liability Payment".
   - This category is registered as a system category in the expenditure categories table and cannot be deleted by users.

## Implementation Details

The following changes have been made:

1. **Code Changes**
   - Updated `identify-system-categories.ts` to recognize "Liability Payment" as a system category
   - Modified `ensure-budget-allocation-category.ts` to remove the function that creates budget-specific categories and added a function to ensure the "Liability Payment" category exists
   - Updated the budget item creation code in `src/app/api/finance/budget-item/route.ts` to always use the standard "Budget Allocation" category
   - Updated the liability payment code in `src/app/api/finance/liability-payment/route.ts` to always use the standard "Liability Payment" category
   - Updated the enhanced liability form to use the standard "Liability Payment" category

2. **Database Migration**
   - Created a SQL migration script (`consolidate_expenditure_categories.sql`) to:
     - Ensure the standard "Budget Allocation" and "Liability Payment" categories exist
     - Update all budget-related expenditure entries to use the standard "Budget Allocation" category
     - Update all liability payment entries to use the standard "Liability Payment" category
     - Remove redundant budget-specific categories

3. **Migration Script**
   - Created a TypeScript script (`run-expenditure-category-migration.ts`) to run the migration programmatically

## Running the Migration

### Option 1: Run the SQL Script Directly

You can run the SQL migration script directly in the Supabase SQL Editor:

1. Go to the Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `src/migrations/consolidate_expenditure_categories.sql`
4. Paste into the SQL Editor and run

### Option 2: Run the JavaScript Migration Script

You can run the JavaScript migration script using the following command:

```bash
# Navigate to the project root
cd church-cms

# Install dotenv if not already installed
npm install dotenv

# Run the script using Node.js
node src/scripts/run-expenditure-category-migration.js
```

Note: Make sure your `.env` file contains the following environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Option 3: Run the Batch File (Windows)

For Windows users, a batch file is provided for convenience:

1. Navigate to the project root in File Explorer
2. Double-click on `src/scripts/run-migration.bat`

Or run it from the command line:

```bash
# Navigate to the project root
cd church-cms

# Run the batch file
src\scripts\run-migration.bat
```

The batch file will automatically install dotenv if needed and run the migration script.

## Verification

After running the migration, you should verify that:

1. All budget-related expenditure entries use the "Budget Allocation" category
2. All liability payment entries use the "Liability Payment" category
3. Redundant budget-specific categories have been removed
4. New budgets and liability payments use the standard categories

You can check this by:

1. Looking at the expenditure categories in the settings page
2. Creating a new budget and verifying it uses the "Budget Allocation" category
3. Making a liability payment and verifying it uses the "Liability Payment" category

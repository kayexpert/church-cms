import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Create a Supabase client with service role key for admin operations
// This ensures we have proper permissions to access the database
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Define the schema for budget item creation
const budgetItemSchema = z.object({
  budget_id: z.string(),
  category_type: z.enum(['income', 'expenditure']),
  description: z.string().optional().nullable(),
  amount: z.number().positive(),
  account_id: z.string().optional().nullable(),
});

/**
 * POST /api/finance/budget-item
 * Create a new budget item and handle related operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    // Prepare validated data
    let validatedData;

    try {
      // Log the received body for debugging
      console.log('Received budget item data:', body);

      // Ensure amount is a number
      if (typeof body.amount === 'string') {
        body.amount = parseFloat(body.amount);
      }

      const validationResult = budgetItemSchema.safeParse(body);
      if (!validationResult.success) {
        console.error('Validation error:', validationResult.error.format());
        return NextResponse.json(
          {
            error: 'Invalid request body',
            details: validationResult.error.format(),
            receivedData: body
          },
          { status: 400 }
        );
      }

      validatedData = validationResult.data;
    } catch (validationError) {
      console.error('Error during validation:', validationError);
      return NextResponse.json(
        {
          error: 'Error validating request body',
          details: validationError instanceof Error ? validationError.message : 'Unknown validation error',
          receivedData: body
        },
        { status: 400 }
      );
    }

    const { budget_id, category_type, description, amount, account_id } = validatedData;

    // First, let's check if there are any accounts in the system
    // This is important because we need accounts for budget items
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('accounts')
      .select('id, name, balance')
      .limit(10);

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError);
      return NextResponse.json({
        error: 'Failed to fetch accounts',
        details: accountsError.message
      }, { status: 500 });
    }

    if (!accounts || accounts.length === 0) {
      console.error('No accounts found in the database');

      // If it's an income item, we need accounts
      if (category_type === 'income') {
        return NextResponse.json({
          error: 'No accounts available',
          details: 'There are no accounts in the database. Please create an account first before adding income budget items.',
          uiSyncIssue: true // Flag to indicate UI might be out of sync with database
        }, { status: 404 });
      } else {
        // For expenditure items, we can proceed without accounts
        console.log('No accounts found, but proceeding with expenditure item creation');
      }
    }

    console.log(`Found ${accounts.length} accounts in the database`);

    // Now, let's check if the specified account exists
    if (category_type === 'income' && account_id) {
      // If we have accounts to check against
      if (accounts && accounts.length > 0) {
        const accountExists = accounts.some(a => a.id === account_id);
        if (!accountExists) {
          console.error('Specified account not found:', account_id);
          return NextResponse.json({
            error: 'Account not found',
            details: `The specified account (${account_id}) was not found. Please select one of the available accounts.`,
            availableAccounts: accounts.map(a => ({ id: a.id, name: a.name })),
            uiSyncIssue: true // Flag to indicate UI might be out of sync with database
          }, { status: 404 });
        }
      } else {
        // This should not happen due to the previous check, but just in case
        console.error('No accounts available to validate against');
        return NextResponse.json({
          error: 'No accounts available',
          details: 'There are no accounts in the database. Please create an account first before adding income budget items.',
          uiSyncIssue: true // Flag to indicate UI might be out of sync with database
        }, { status: 404 });
      }
    }

    // For budget items, we'll use a hardcoded category ID to bypass the category requirement
    // This is a workaround since we can't create categories due to RLS policies
    let category_id;

    // First, try to find any existing category
    try {
      const tableName = category_type === 'income' ? 'income_categories' : 'expenditure_categories';

      // Try to find any category
      console.log(`Looking for any ${category_type} category`);
      const { data: categories, error: findError } = await supabaseAdmin
        .from(tableName)
        .select('id')
        .limit(10); // Get up to 10 categories to increase our chances

      if (!findError && categories && categories.length > 0) {
        // Use the first category we find
        category_id = categories[0].id;
        console.log(`Using existing ${category_type} category: ${category_id}`);
      } else {
        // If no categories exist, we need to inform the user
        console.error(`No ${category_type} categories found and cannot create one due to permissions`);

        // Instead of using a hardcoded ID, let's return a clear error message
        return NextResponse.json({
          error: 'No categories available',
          details: `There are no ${category_type} categories in the database. Please create at least one ${category_type} category first.`
        }, { status: 404 });
      }
    } catch (error) {
      console.error('Error handling category:', error);
      return NextResponse.json({
        error: 'Failed to handle category requirement',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

    // 1. Create the budget item
    const budgetItemData = {
      budget_id,
      category_type,
      category_id, // Add category_id since the database requires it
      description,
      planned_amount: amount,
      actual_amount: 0, // Start with 0 actual amount
      account_id: category_type === 'income' ? account_id : null, // Only store account_id for income items
    };

    const { data: budgetItem, error: budgetItemError } = await supabaseAdmin
      .from('budget_items')
      .insert(budgetItemData)
      .select()
      .single();

    if (budgetItemError) {
      console.error('Error creating budget item:', budgetItemError);
      return NextResponse.json(
        { error: 'Failed to create budget item', details: budgetItemError.message },
        { status: 500 }
      );
    }

    // 2. If it's an income item with an account, check account balance and create an expenditure entry
    if (category_type === 'income' && account_id) {
      // We already validated the account exists at the beginning
      // Get the account details
      const account = accounts.find(a => a.id === account_id);

      if (!account) {
        // This should never happen since we already checked, but just in case
        console.error('Account not found in the accounts list:', account_id);
        return NextResponse.json({
          error: 'Account not found',
          details: `The account (${account_id}) was not found. Please select one of the available accounts.`,
          availableAccounts: accounts.map(a => ({ id: a.id, name: a.name })),
          budgetItem // Still return the created budget item
        }, { status: 404 });
      }

      // Calculate current balance
      const { data: transactions, error: txError } = await supabaseAdmin
        .from('account_transactions')
        .select('*')
        .eq('account_id', account_id);

      if (txError) {
        console.error('Error fetching account transactions:', txError);
        // Continue anyway, but log the error
      }

      // Use a simple balance calculation for validation
      const calculatedBalance = (account.balance || 0);

      // Check if account has sufficient balance
      if (calculatedBalance < amount) {
        return NextResponse.json({
          error: 'Insufficient account balance',
          details: `The account "${account.name}" has a balance of ${calculatedBalance.toFixed(2)}, which is less than the requested amount of ${amount.toFixed(2)}.`,
          account: {
            id: account.id,
            name: account.name,
            balance: calculatedBalance
          },
          requestedAmount: amount
        }, { status: 400 });
      }

      // Get the budget details for reference
      const { data: budget, error: budgetError } = await supabaseAdmin
        .from('budgets')
        .select('title')
        .eq('id', budget_id)
        .single();

      if (budgetError) {
        console.error('Error fetching budget details:', budgetError);
        // Continue anyway, we'll use a generic description
      }

      // Create an expenditure entry
      try {
        // Get a category for the expenditure entry
        let categoryId;

        // Always use the standard "Budget Allocation" category
        console.log('Looking for standard Budget Allocation category');

        // Check if the standard Budget Allocation category exists
        const { data: genericCategory, error: genericError } = await supabaseAdmin
          .from('expenditure_categories')
          .select('id')
          .eq('name', 'Budget Allocation')
          .maybeSingle();

        if (!genericError && genericCategory?.id) {
          // Use the standard Budget Allocation category
          categoryId = genericCategory.id;
          console.log(`Using standard Budget Allocation category: ${genericCategory.id}`);
        } else {
          // If standard category doesn't exist, create it
          console.log('Creating standard Budget Allocation category');
          const { data: newGenericCategory, error: createGenericError } = await supabaseAdmin
            .from('expenditure_categories')
            .insert({
              name: 'Budget Allocation',
              description: 'System category for budget allocations',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (createGenericError) {
            console.error('Error creating Budget Allocation category:', createGenericError);
            // Fall back to any expenditure category
            const { data: fallbackCategories, error: fallbackError } = await supabaseAdmin
              .from('expenditure_categories')
              .select('id')
              .limit(1);

            if (fallbackError || !fallbackCategories || fallbackCategories.length === 0) {
              console.error('Error fetching fallback category:', fallbackError);
              throw new Error('Could not find or create a category for the expenditure entry');
            }

            categoryId = fallbackCategories[0].id;
            console.log(`Using fallback category: ${fallbackCategories[0].id}`);
          } else {
            // Use the newly created Budget Allocation category
            categoryId = newGenericCategory.id;
            console.log(`Created and using Budget Allocation category: ${newGenericCategory.id}`);
          }
        }

        const expenditureData = {
          date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
          category_id: categoryId,
          description: `Budget allocation: ${budget?.title || budget_id}${description ? ` - ${description}` : ''}`,
          amount: amount,
          recipient: 'Budget Allocation', // Keep this consistent with the category
          payment_method: 'transfer',
          account_id: account_id,
          liability_payment: false,
          liability_id: null,
          budget_item_id: budgetItem.id, // Link to the budget item
        };

        console.log('Creating expenditure entry with data:', expenditureData);

        const { data: expenditure, error: expenditureError } = await supabaseAdmin
          .from('expenditure_entries')
          .insert(expenditureData)
          .select()
          .single();

        if (expenditureError) {
          console.error('Error creating expenditure entry:', expenditureError);
          // We don't want to fail the whole operation if just the expenditure creation fails
          return NextResponse.json({
            success: true,
            warning: 'Budget item created but failed to create expenditure entry',
            budgetItem,
            details: expenditureError.message
          }, { status: 207 }); // 207 Multi-Status
        }

        console.log('Successfully created expenditure entry:', expenditure.id);

        // Return success with both created items
        return NextResponse.json({
          success: true,
          message: 'Budget item and expenditure entry created successfully',
          budgetItem,
          expenditure,
          account: {
            id: account.id,
            name: account.name,
            previousBalance: account.balance || 0,
            newBalance: (account.balance || 0) - amount
          }
        });
      } catch (expenditureError) {
        console.error('Exception creating expenditure entry:', expenditureError);
        // We don't want to fail the whole operation if just the expenditure creation fails
        return NextResponse.json({
          success: true,
          warning: 'Budget item created but failed to create expenditure entry due to an exception',
          budgetItem,
          details: expenditureError instanceof Error ? expenditureError.message : 'Unknown error'
        }, { status: 207 }); // 207 Multi-Status
      }
    }

    // If it's not an income item or doesn't have an account, just return the budget item
    return NextResponse.json({
      success: true,
      message: 'Budget item created successfully',
      budgetItem
    });

  } catch (error) {
    console.error('Error in budget item creation:', error);
    return NextResponse.json({
      error: 'Failed to process budget item',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}





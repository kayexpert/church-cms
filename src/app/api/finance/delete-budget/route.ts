import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Define the schema for budget deletion
const deleteBudgetSchema = z.object({
  budget_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    // Create a Supabase client with service role key for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Parse and validate the request body
    const body = await request.json();
    const validationResult = deleteBudgetSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { budget_id } = validationResult.data;

    // 1. Get all budget items for this budget
    const { data: budgetItems, error: budgetItemsError } = await supabaseAdmin
      .from('budget_items')
      .select('id, account_id')
      .eq('budget_id', budget_id);

    if (budgetItemsError) {
      console.error('Error fetching budget items:', budgetItemsError);
      return NextResponse.json(
        { error: 'Failed to fetch budget items', details: budgetItemsError.message },
        { status: 500 }
      );
    }

    // Track affected accounts for recalculation
    const affectedAccounts = new Set<string>();

    // 2. For each budget item, find and process related expenditure entries
    for (const budgetItem of budgetItems) {
      // If the budget item has an account, add it to affected accounts
      if (budgetItem.account_id) {
        affectedAccounts.add(budgetItem.account_id);
      }

      // Find expenditure entries linked to this budget item
      const { data: expenditureEntries, error: expenditureError } = await supabaseAdmin
        .from('expenditure_entries')
        .select('id, account_id')
        .eq('budget_item_id', budgetItem.id);

      if (expenditureError) {
        console.error(`Error fetching expenditure entries for budget item ${budgetItem.id}:`, expenditureError);
        continue; // Continue with other budget items
      }

      // Process each expenditure entry
      for (const entry of expenditureEntries || []) {
        // If the expenditure entry has an account, add it to affected accounts
        if (entry.account_id) {
          affectedAccounts.add(entry.account_id);
        }

        // Delete the expenditure entry
        const { error: deleteExpError } = await supabaseAdmin
          .from('expenditure_entries')
          .delete()
          .eq('id', entry.id);

        if (deleteExpError) {
          console.error(`Error deleting expenditure entry ${entry.id}:`, deleteExpError);
          // Continue with other entries
        }
      }
    }

    // 3. Delete all budget items for this budget
    const { error: deleteBudgetItemsError } = await supabaseAdmin
      .from('budget_items')
      .delete()
      .eq('budget_id', budget_id);

    if (deleteBudgetItemsError) {
      console.error('Error deleting budget items:', deleteBudgetItemsError);
      return NextResponse.json(
        { error: 'Failed to delete budget items', details: deleteBudgetItemsError.message },
        { status: 500 }
      );
    }

    // 4. Delete the budget
    const { error: deleteBudgetError } = await supabaseAdmin
      .from('budgets')
      .delete()
      .eq('id', budget_id);

    if (deleteBudgetError) {
      console.error('Error deleting budget:', deleteBudgetError);
      return NextResponse.json(
        { error: 'Failed to delete budget', details: deleteBudgetError.message },
        { status: 500 }
      );
    }

    // 5. Recalculate balances for all affected accounts
    for (const accountId of affectedAccounts) {
      try {
        await supabaseAdmin.rpc('recalculate_account_balance', {
          account_id: accountId
        });
      } catch (error) {
        console.error(`Error recalculating balance for account ${accountId}:`, error);
        // Continue with other accounts
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Budget and all related items deleted successfully',
      affectedAccounts: Array.from(affectedAccounts)
    });

  } catch (error) {
    console.error('Error in delete-budget API:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete budget',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

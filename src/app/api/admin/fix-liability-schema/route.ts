import { NextResponse } from "next/server";
import { fixLiabilitySchema, testLiabilitySchema } from "@/lib/fix-liability-schema";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/admin/fix-liability-schema
 * Fix the liability_entries table schema for reports functionality
 */
export async function POST() {
  try {
    console.log('Starting liability schema fix via API...');

    // First test the current schema
    const testResult = await testLiabilitySchema();
    console.log('Pre-migration test result:', testResult);

    // Execute the schema fix
    const fixResult = await fixLiabilitySchema();

    if (!fixResult.success) {
      return NextResponse.json({
        success: false,
        error: fixResult.message,
        preTestResult: testResult
      }, { status: 500 });
    }

    // Create missing liability categories
    console.log('Creating missing liability categories...');
    const { data: existingCategories } = await supabase
      .from('liability_categories')
      .select('*');

    console.log('Existing categories:', existingCategories);

    if (!existingCategories || existingCategories.length === 0) {
      const defaultCategories = [
        {
          id: 'cba552c6-5692-4ef1-9fbf-6654f05321b4',
          name: 'Loans',
          description: 'Bank loans and other borrowed funds'
        },
        {
          id: 'c60f649b-1590-47c2-b2d2-22227655ca25',
          name: 'Vendor Payments',
          description: 'Payments due to vendors and suppliers'
        },
        {
          name: 'Mortgages',
          description: 'Property mortgages and real estate loans'
        }
      ];

      const { data: createdCategories, error: createError } = await supabase
        .from('liability_categories')
        .insert(defaultCategories)
        .select();

      console.log('Created categories:', { createdCategories, createError });
    }

    // Test the schema again after the fix
    const postTestResult = await testLiabilitySchema();
    console.log('Post-migration test result:', postTestResult);

    return NextResponse.json({
      success: true,
      message: 'Liability schema has been fixed successfully',
      preTestResult: testResult,
      postTestResult: postTestResult,
      fixResult: fixResult
    });

  } catch (error) {
    console.error('Error in liability schema fix API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

/**
 * GET /api/admin/fix-liability-schema
 * Test the current liability schema without making changes
 */
export async function GET() {
  try {
    const testResult = await testLiabilitySchema();

    return NextResponse.json({
      success: true,
      message: 'Liability schema test completed',
      testResult: testResult,
      requiredColumns: [
        'id', 'date', 'creditor_name', 'details', 'total_amount',
        'amount_paid', 'amount_remaining', 'status', 'category_id',
        'due_date', 'last_payment_date', 'is_loan', 'created_at', 'updated_at'
      ]
    });

  } catch (error) {
    console.error('Error in liability schema test API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

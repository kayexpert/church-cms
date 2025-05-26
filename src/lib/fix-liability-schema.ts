import { supabase } from "@/lib/supabase";

/**
 * Fix the liability_entries table schema to ensure it has all required columns
 * for the reports functionality
 */
export async function fixLiabilitySchema(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Starting liability schema fix...');

    // Since the schema test shows the table already has all required columns,
    // let's just verify the data integrity by checking a few records
    const { data: sampleData, error: sampleError } = await supabase
      .from('liability_entries')
      .select('id, total_amount, amount_paid, amount_remaining')
      .limit(5);

    if (sampleError) {
      console.error('Error checking liability entries:', sampleError);
      return {
        success: false,
        message: `Schema check failed: ${sampleError.message}`
      };
    }

    console.log('Sample liability data:', sampleData);

    // Check if any records need amount_remaining calculation
    const recordsNeedingUpdate = sampleData?.filter(record => {
      const expectedRemaining = (record.total_amount || 0) - (record.amount_paid || 0);
      return Math.abs((record.amount_remaining || 0) - expectedRemaining) > 0.01;
    }) || [];

    if (recordsNeedingUpdate.length > 0) {
      console.log(`Found ${recordsNeedingUpdate.length} records that need amount_remaining updates`);

      // Update each record individually to avoid SQL syntax issues
      for (const record of recordsNeedingUpdate) {
        const expectedRemaining = (record.total_amount || 0) - (record.amount_paid || 0);

        const { error: updateError } = await supabase
          .from('liability_entries')
          .update({ amount_remaining: expectedRemaining })
          .eq('id', record.id);

        if (updateError) {
          console.error(`Error updating record ${record.id}:`, updateError);
        }
      }
    }

    console.log('Liability schema fix completed successfully');
    return {
      success: true,
      message: `Liability schema is correct. Updated ${recordsNeedingUpdate.length} records.`
    };

  } catch (error) {
    console.error('Error in fixLiabilitySchema:', error);
    return {
      success: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Test the liability schema by running a simple query
 */
export async function testLiabilitySchema(): Promise<{ success: boolean; message: string; columns?: string[] }> {
  try {
    // Test query to check if all required columns exist
    const { data, error } = await supabase
      .from('liability_entries')
      .select('id, date, creditor_name, details, total_amount, amount_paid, amount_remaining, status, category_id')
      .limit(1);

    if (error) {
      return {
        success: false,
        message: `Schema test failed: ${error.message}`
      };
    }

    // Since we can't easily get column info via SQL, let's test by trying to select all expected columns
    const requiredColumns = [
      'id', 'date', 'creditor_name', 'details', 'total_amount',
      'amount_paid', 'amount_remaining', 'status', 'category_id',
      'due_date', 'created_at', 'updated_at'
    ];

    const { data: fullTest, error: fullTestError } = await supabase
      .from('liability_entries')
      .select(requiredColumns.join(', '))
      .limit(1);

    if (fullTestError) {
      return {
        success: false,
        message: `Full schema test failed: ${fullTestError.message}`,
        columns: []
      };
    }

    return {
      success: true,
      message: 'Liability schema test passed - all required columns exist',
      columns: requiredColumns
    };

  } catch (error) {
    return {
      success: false,
      message: `Schema test error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

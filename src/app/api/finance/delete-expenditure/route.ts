import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    console.log('Delete expenditure API called');

    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('Request body:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body format' },
        { status: 400 }
      );
    }

    const { expenditureId } = body;

    // Validate required fields
    if (!expenditureId) {
      console.error('Missing expenditureId');
      return NextResponse.json(
        { error: 'Missing expenditureId' },
        { status: 400 }
      );
    }

    console.log('Fetching expenditure data for ID:', expenditureId);

    // 1. Get the expenditure entry
    const { data: expenditureData, error: fetchError } = await supabase
      .from('expenditure_entries')
      .select('*')
      .eq('id', expenditureId)
      .single();

    if (fetchError) {
      console.error('Error fetching expenditure:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch expenditure', details: fetchError },
        { status: 500 }
      );
    }

    if (!expenditureData) {
      console.error('Expenditure not found for ID:', expenditureId);
      return NextResponse.json(
        { error: 'Expenditure not found' },
        { status: 404 }
      );
    }

    console.log('Expenditure data found:', expenditureData);

    // 2. If this is a liability payment, update the liability
    let liabilityUpdated = false;
    let liabilityData = null;

    if (expenditureData.liability_payment && expenditureData.liability_id) {
      console.log('This is a liability payment. Updating liability:', expenditureData.liability_id);

      // Get the current liability
      const { data: liability, error: liabilityError } = await supabase
        .from('liability_entries')
        .select('*')
        .eq('id', expenditureData.liability_id)
        .single();

      if (liabilityError) {
        console.error('Error fetching liability:', liabilityError);
        return NextResponse.json(
          { error: 'Failed to fetch liability', details: liabilityError },
          { status: 500 }
        );
      }

      liabilityData = liability;

      if (liabilityData) {
        console.log('Current liability data:', liabilityData);

        // Validate liability data has the required fields
        if (!liabilityData.amount_paid && liabilityData.amount_paid !== 0) {
          return NextResponse.json(
            { error: 'Liability data is missing amount_paid field' },
            { status: 500 }
          );
        }

        if (!liabilityData.total_amount && liabilityData.total_amount !== 0) {
          return NextResponse.json(
            { error: 'Liability data is missing total_amount field' },
            { status: 500 }
          );
        }

        // Calculate new amount paid
        const newAmountPaid = Math.max(0, liabilityData.amount_paid - expenditureData.amount);
        const newStatus = newAmountPaid === 0 ? 'unpaid' :
                         newAmountPaid < liabilityData.total_amount ? 'partial' : 'paid';

        console.log('Updating liability with new values:', {
          amount_paid: newAmountPaid,
          amount_remaining: liabilityData.total_amount - newAmountPaid,
          status: newStatus
        });

        // Update the liability
        const { error: updateError } = await supabase
          .from('liability_entries')
          .update({
            amount_paid: newAmountPaid,
            amount_remaining: liabilityData.total_amount - newAmountPaid,
            status: newStatus
            // Removed last_payment_date as it doesn't exist in the table
          })
          .eq('id', expenditureData.liability_id);

        if (updateError) {
          console.error('Error updating liability:', updateError);

          // Improved error response with more detailed information
          const errorDetails = {
            message: updateError.message || 'No error message provided',
            code: updateError.code || 'unknown',
            details: updateError.details || 'No details available',
            hint: updateError.hint || 'No hint available'
          };

          return NextResponse.json(
            {
              error: 'Failed to update liability',
              details: errorDetails,
              originalError: updateError
            },
            { status: 500 }
          );
        }

        liabilityUpdated = true;
        console.log('Liability updated successfully');
      }
    }

    // 3. Delete the expenditure entry
    console.log('Deleting expenditure entry:', expenditureId);

    const { error: deleteError } = await supabase
      .from('expenditure_entries')
      .delete()
      .eq('id', expenditureId);

    if (deleteError) {
      console.error('Error deleting expenditure entry:', deleteError);

      // If we updated the liability but failed to delete the expenditure,
      // we need to roll back the liability update
      if (liabilityUpdated && liabilityData) {
        console.log('Rolling back liability update due to expenditure deletion failure');

        await supabase
          .from('liability_entries')
          .update({
            amount_paid: liabilityData.amount_paid,
            amount_remaining: liabilityData.amount_remaining,
            status: liabilityData.status
            // Removed last_payment_date as it doesn't exist in the table
          })
          .eq('id', expenditureData.liability_id);
      }

      return NextResponse.json(
        { error: 'Failed to delete expenditure', details: deleteError },
        { status: 500 }
      );
    }

    console.log('Expenditure entry deleted successfully');

    // 4. Return success response
    return NextResponse.json({
      success: true,
      message: 'Expenditure entry deleted successfully',
      liabilityUpdated: liabilityUpdated
    });

  } catch (error) {
    console.error('Unexpected error in delete expenditure API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: JSON.stringify(error) },
      { status: 500 }
    );
  }
}

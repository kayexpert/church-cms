import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

export async function POST(request: Request) {
  try {
    console.log('Liability payment API called');

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

    const {
      liabilityId,
      paymentAmount,
      paymentDate,
      expenditureData
    } = body;

    // Log detailed information about the request
    console.log('Request details:', {
      liabilityId: liabilityId,
      paymentAmount: paymentAmount,
      paymentDate: paymentDate,
      expenditureData: expenditureData,
      requestHeaders: Object.fromEntries(request.headers),
      requestMethod: request.method,
      requestURL: request.url
    });

    // Validate required fields
    if (!liabilityId) {
      console.error('Missing liabilityId');
      return NextResponse.json(
        { error: 'Missing liabilityId' },
        { status: 400 }
      );
    }

    if (!paymentAmount) {
      console.error('Missing paymentAmount');
      return NextResponse.json(
        { error: 'Missing paymentAmount' },
        { status: 400 }
      );
    }

    if (!paymentDate) {
      console.error('Missing paymentDate');
      return NextResponse.json(
        { error: 'Missing paymentDate' },
        { status: 400 }
      );
    }

    if (!expenditureData) {
      console.error('Missing expenditureData');
      return NextResponse.json(
        { error: 'Missing expenditureData' },
        { status: 400 }
      );
    }

    console.log('Fetching liability data for ID:', liabilityId);

    // 1. Get the current liability entry
    const { data: liabilityData, error: fetchError } = await supabase
      .from('liability_entries')
      .select('*')
      .eq('id', liabilityId)
      .single();

    if (fetchError) {
      console.error('Error fetching liability:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch liability', details: fetchError },
        { status: 500 }
      );
    }

    if (!liabilityData) {
      console.error('Liability not found for ID:', liabilityId);
      return NextResponse.json(
        { error: 'Liability not found' },
        { status: 404 }
      );
    }

    console.log('Liability data found:', liabilityData);

    // 2. Calculate new values
    const currentAmountPaid = parseFloat(liabilityData.amount_paid) || 0;
    const totalAmount = parseFloat(liabilityData.total_amount) || 0;
    const paymentAmountValue = parseFloat(paymentAmount);

    const newAmountPaid = currentAmountPaid + paymentAmountValue;
    const newAmountRemaining = Math.max(0, totalAmount - newAmountPaid);
    const newStatus = newAmountPaid >= totalAmount ? 'paid' : 'partial';
    const formattedDate = format(new Date(paymentDate), 'yyyy-MM-dd');

    console.log('Calculated new values:', {
      currentAmountPaid,
      totalAmount,
      paymentAmountValue,
      newAmountPaid,
      newAmountRemaining,
      newStatus,
      formattedDate
    });

    // 3. Update the liability entry - SKIP exec_sql and use direct update
    console.log('Updating liability with direct update');
    const { data: updateData, error: updateError } = await supabase
      .from('liability_entries')
      .update({
        amount_paid: newAmountPaid,
        amount_remaining: newAmountRemaining,
        status: newStatus
        // Removed last_payment_date field since it doesn't exist
      })
      .eq('id', liabilityId)
      .select();

    if (updateError) {
      console.error('Error updating liability:', updateError);
      return NextResponse.json(
        { error: 'Failed to update liability', details: updateError },
        { status: 500 }
      );
    }

    console.log('Liability updated successfully:', updateData);

    // Always use the standard "Liability Payment" category
    let categoryId;

    console.log('Looking for standard Liability Payment category');

    // Check if the standard Liability Payment category exists
    const { data: liabilityCategory, error: categoryError } = await supabase
      .from('expenditure_categories')
      .select('id')
      .eq('name', 'Liability Payment')
      .maybeSingle();

    if (!categoryError && liabilityCategory?.id) {
      // Use the standard Liability Payment category
      categoryId = liabilityCategory.id;
      console.log(`Using standard Liability Payment category: ${liabilityCategory.id}`);
    } else {
      // If standard category doesn't exist, create it
      console.log('Creating standard Liability Payment category');
      const { data: newCategory, error: createError } = await supabase
        .from('expenditure_categories')
        .insert({
          name: 'Liability Payment',
          description: 'System category for liability payments',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating Liability Payment category:', createError);

        // Fall back to any expenditure category as a last resort
        const { data: fallbackCategories, error: fallbackError } = await supabase
          .from('expenditure_categories')
          .select('id')
          .limit(1);

        if (fallbackError || !fallbackCategories || fallbackCategories.length === 0) {
          console.error('Error fetching fallback category:', fallbackError);
          return NextResponse.json(
            { error: 'Could not find or create a category for the expenditure entry', details: createError },
            { status: 500 }
          );
        }

        categoryId = fallbackCategories[0].id;
        console.log(`Using fallback category: ${fallbackCategories[0].id}`);
      } else {
        // Use the newly created Liability Payment category
        categoryId = newCategory.id;
        console.log(`Created and using Liability Payment category: ${newCategory.id}`);
      }
    }

    // 4. Create the expenditure entry
    // Sanitize the expenditure data to ensure it has the correct format
    const sanitizedExpenditureData = {
      // Only include fields that we know are valid for the expenditure_entries table
      description: expenditureData.description || 'Liability Payment',
      recipient: expenditureData.recipient || 'Liability Payment',
      payment_method: expenditureData.payment_method || 'cash',
      account_id: expenditureData.account_id || null,
      // Exclude any other fields that might cause issues
    };

    const expenditurePayload = {
      ...sanitizedExpenditureData,
      category_id: categoryId, // Use the valid category ID
      date: formattedDate,
      amount: paymentAmountValue,
      liability_payment: true,
      liability_id: liabilityId
    };

    console.log('Creating expenditure entry with sanitized data:', expenditurePayload);

    try {
      const { data: expenditureResult, error: expenditureError } = await supabase
        .from('expenditure_entries')
        .insert(expenditurePayload)
        .select();

      if (expenditureError) {
        console.error('Error creating expenditure entry:', expenditureError);
        throw expenditureError;
      }

      return NextResponse.json({
        success: true,
        message: 'Liability payment processed successfully',
        liabilityUpdated: true,
        expenditureCreated: true,
        expenditure: expenditureResult
      });
    } catch (expenditureError: any) {
      console.error('Error creating expenditure entry:', expenditureError);

      // Try a more minimal approach
      console.log('Trying minimal expenditure data...');
      const minimalPayload = {
        category_id: categoryId,
        date: formattedDate,
        amount: paymentAmountValue,
        description: 'Liability Payment',
        recipient: 'Liability Payment',
        payment_method: 'cash',
        liability_payment: true,
        liability_id: liabilityId
      };

      try {
        const { data: minimalResult, error: minimalError } = await supabase
          .from('expenditure_entries')
          .insert(minimalPayload)
          .select();

        if (minimalError) {
          console.error('Minimal expenditure creation also failed:', minimalError);

          // Even though the liability was updated, we should inform the client about the expenditure error
          return NextResponse.json(
            {
              warning: 'Liability was updated but expenditure entry creation failed',
              liabilityUpdated: true,
              expenditureCreated: false,
              details: minimalError
            },
            { status: 207 } // 207 Multi-Status
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Liability payment processed successfully with minimal data',
          liabilityUpdated: true,
          expenditureCreated: true,
          expenditure: minimalResult
        });
      } catch (minimalError) {
        console.error('Minimal expenditure creation also failed:', minimalError);

        // Even though the liability was updated, we should inform the client about the expenditure error
        return NextResponse.json(
          {
            warning: 'Liability was updated but expenditure entry creation failed',
            liabilityUpdated: true,
            expenditureCreated: false,
            details: minimalError
          },
          { status: 207 } // 207 Multi-Status
        );
      }
    }

    // This code is now handled in the try/catch block above

  } catch (error) {
    console.error('Unexpected error in liability payment API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: JSON.stringify(error) },
      { status: 500 }
    );
  }
}

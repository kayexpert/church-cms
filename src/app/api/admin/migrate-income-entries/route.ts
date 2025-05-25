import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    console.log('Starting migration of income entries...');

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all income entries that have "Liability ID:" in the description
    // First try with a direct query
    let incomeEntries;
    try {
      const { data, error: fetchError } = await supabase
        .from('income_entries')
        .select('*')
        .ilike('description', '%Liability ID:%');

      if (fetchError) {
        console.error('Error fetching income entries:', fetchError);
        return NextResponse.json({ error: 'Failed to fetch income entries' }, { status: 500 });
      }

      incomeEntries = data;
    } catch (error) {
      console.error('Error in first query attempt:', error);

      // If the first query fails, try a more specific approach
      try {
        const { data, error: fetchError } = await supabase
          .from('income_entries')
          .select('*')
          .filter('description', 'ilike', '%Loan from%')
          .filter('description', 'ilike', '%Liability ID:%');

        if (fetchError) {
          console.error('Error in second query attempt:', fetchError);
          return NextResponse.json({ error: 'Failed to fetch income entries in both attempts' }, { status: 500 });
        }

        incomeEntries = data;
      } catch (secondError) {
        console.error('Error in second query attempt:', secondError);
        return NextResponse.json({ error: 'All query attempts failed' }, { status: 500 });
      }
    }

    // Check if we have any entries to process
    if (!incomeEntries || incomeEntries.length === 0) {
      return NextResponse.json({ message: 'No entries to migrate' });
    }

    console.log(`Found ${incomeEntries.length} income entries with liability IDs in descriptions`);

    // Process each entry
    const results = [];
    for (const entry of incomeEntries) {
      try {
        // Extract the liability ID from the description
        const match = entry.description.match(/Liability ID: ([a-f0-9-]+)/i);
        if (!match || !match[1]) {
          results.push({ id: entry.id, status: 'skipped', reason: 'No liability ID found in description' });
          continue;
        }

        const liabilityId = match[1];

        // Create new description without the liability ID
        const newDescription = entry.description.replace(/ \(Liability ID: [a-f0-9-]+\)/i, '');

        // Prepare payment_details with the liability ID
        let paymentDetails = entry.payment_details || {};
        if (typeof paymentDetails === 'string') {
          try {
            paymentDetails = JSON.parse(paymentDetails);
          } catch (e) {
            paymentDetails = {};
          }
        }

        // Add liability information to payment_details
        paymentDetails = {
          ...paymentDetails,
          source: 'liability',
          liability_id: liabilityId
        };

        // Update the entry
        const { error: updateError } = await supabase
          .from('income_entries')
          .update({
            description: newDescription,
            payment_details: paymentDetails
          })
          .eq('id', entry.id);

        if (updateError) {
          results.push({ id: entry.id, status: 'error', error: updateError.message });
        } else {
          results.push({ id: entry.id, status: 'success', oldDescription: entry.description, newDescription });
        }
      } catch (entryError) {
        results.push({
          id: entry.id,
          status: 'error',
          error: entryError instanceof Error ? entryError.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: 'Migration completed',
      totalProcessed: incomeEntries.length,
      results
    });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Disable body size limit for this route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

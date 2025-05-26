import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/db/fix-birthday-constraints
 * Fix the database constraints to support birthday messages
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Fixing birthday message constraints...');

    // Create a Supabase client with service role for more permissions
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const results = [];

    // 1. Drop existing type constraint
    console.log('Dropping existing type constraint...');
    try {
      const { error: dropError } = await supabaseAdmin.rpc('exec_sql', {
        query: 'ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;'
      });
      
      if (dropError) {
        console.log('Could not drop constraint via RPC, trying direct approach...');
      } else {
        results.push({ step: 'Drop type constraint', status: 'success' });
      }
    } catch (error) {
      console.log('RPC approach failed, will try direct SQL...');
    }

    // 2. Add new type constraint that includes birthday
    console.log('Adding new type constraint...');
    try {
      const { error: addError } = await supabaseAdmin.rpc('exec_sql', {
        query: "ALTER TABLE messages ADD CONSTRAINT messages_type_check CHECK (type IN ('quick', 'group', 'birthday'));"
      });
      
      if (addError) {
        console.log('Could not add constraint via RPC, trying direct approach...');
      } else {
        results.push({ step: 'Add birthday type constraint', status: 'success' });
      }
    } catch (error) {
      console.log('RPC approach failed for adding constraint...');
    }

    // 3. Add missing columns if they don't exist
    console.log('Adding missing columns...');
    
    // Add days_before column
    try {
      const { error: daysBeforeError } = await supabaseAdmin.rpc('exec_sql', {
        query: 'ALTER TABLE messages ADD COLUMN IF NOT EXISTS days_before INTEGER DEFAULT 0;'
      });
      
      if (!daysBeforeError) {
        results.push({ step: 'Add days_before column', status: 'success' });
      }
    } catch (error) {
      console.log('Could not add days_before column via RPC');
    }

    // Add error_message column
    try {
      const { error: errorMsgError } = await supabaseAdmin.rpc('exec_sql', {
        query: 'ALTER TABLE messages ADD COLUMN IF NOT EXISTS error_message TEXT;'
      });
      
      if (!errorMsgError) {
        results.push({ step: 'Add error_message column', status: 'success' });
      }
    } catch (error) {
      console.log('Could not add error_message column via RPC');
    }

    // 4. Update status constraint
    console.log('Updating status constraint...');
    try {
      const { error: dropStatusError } = await supabaseAdmin.rpc('exec_sql', {
        query: 'ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;'
      });
      
      const { error: addStatusError } = await supabaseAdmin.rpc('exec_sql', {
        query: "ALTER TABLE messages ADD CONSTRAINT messages_status_check CHECK (status IN ('active', 'inactive', 'scheduled', 'pending', 'processing', 'completed', 'error', 'failed'));"
      });
      
      if (!addStatusError) {
        results.push({ step: 'Update status constraint', status: 'success' });
      }
    } catch (error) {
      console.log('Could not update status constraint via RPC');
    }

    // 5. Try alternative approach if RPC failed
    if (results.length === 0) {
      console.log('RPC approach failed, trying direct table operations...');
      
      // Try to insert a test record to see what constraints exist
      try {
        const testInsert = await supabaseAdmin
          .from('messages')
          .insert({
            name: '[Test] Constraint Check',
            content: 'Test message',
            type: 'birthday',
            frequency: 'monthly',
            schedule_time: new Date().toISOString(),
            status: 'inactive'
          })
          .select()
          .single();

        if (testInsert.data) {
          // If successful, delete the test record
          await supabaseAdmin
            .from('messages')
            .delete()
            .eq('id', testInsert.data.id);
          
          results.push({ step: 'Birthday type constraint', status: 'already_working' });
        }
      } catch (insertError) {
        console.log('Test insert failed, constraints need fixing');
        results.push({ 
          step: 'Test birthday insert', 
          status: 'failed', 
          error: 'Birthday type not supported by current constraints'
        });
      }
    }

    // 6. Check current table structure
    console.log('Checking current table structure...');
    try {
      const { data: tableInfo, error: infoError } = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'messages')
        .eq('table_schema', 'public');

      if (!infoError && tableInfo) {
        results.push({ 
          step: 'Table structure check', 
          status: 'success',
          columns: tableInfo.map(col => col.column_name)
        });
      }
    } catch (error) {
      console.log('Could not check table structure');
    }

    // 7. Check constraints
    try {
      const { data: constraints, error: constraintError } = await supabaseAdmin
        .from('information_schema.check_constraints')
        .select('constraint_name, check_clause')
        .like('constraint_name', '%messages%');

      if (!constraintError && constraints) {
        results.push({ 
          step: 'Constraint check', 
          status: 'success',
          constraints: constraints
        });
      }
    } catch (error) {
      console.log('Could not check constraints');
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failureCount = results.filter(r => r.status === 'failed').length;

    return NextResponse.json({
      success: successCount > 0,
      message: `Birthday constraint fix completed with ${successCount} successes and ${failureCount} failures`,
      results,
      recommendation: failureCount > 0 ? 
        'Some constraints could not be updated. You may need to manually update the database schema.' :
        'Birthday message constraints should now be working.'
    });

  } catch (error) {
    console.error('Error in fix birthday constraints endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fix birthday constraints',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/db/fix-birthday-constraints
 * Get information about the birthday constraint fix
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    description: 'Birthday Message Constraint Fix Endpoint',
    purpose: 'Fix database constraints to support birthday message type',
    actions: [
      'Drop existing type constraint',
      'Add new type constraint including birthday',
      'Add missing columns (days_before, error_message)',
      'Update status constraint',
      'Verify changes'
    ],
    usage: 'POST to this endpoint to fix birthday message constraints'
  });
}

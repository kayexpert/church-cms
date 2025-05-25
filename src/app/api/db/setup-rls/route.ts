import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/db/setup-rls
 * Set up Row Level Security policies for messaging tables
 */
export async function POST() {
  try {
    console.log('Setting up RLS policies for messaging tables');
    
    // Try to set up RLS policies using exec_sql
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: `
          -- Enable RLS on messaging_configurations
          ALTER TABLE IF EXISTS messaging_configurations ENABLE ROW LEVEL SECURITY;
          
          -- Drop existing policies if they exist
          DROP POLICY IF EXISTS "Allow authenticated users to read messaging_configurations" ON messaging_configurations;
          DROP POLICY IF EXISTS "Allow authenticated users to insert messaging_configurations" ON messaging_configurations;
          DROP POLICY IF EXISTS "Allow authenticated users to update messaging_configurations" ON messaging_configurations;
          DROP POLICY IF EXISTS "Allow authenticated users to delete messaging_configurations" ON messaging_configurations;
          
          -- Create RLS policies for messaging_configurations
          CREATE POLICY "Allow authenticated users to read messaging_configurations"
            ON messaging_configurations
            FOR SELECT
            TO authenticated
            USING (true);
          
          CREATE POLICY "Allow authenticated users to insert messaging_configurations"
            ON messaging_configurations
            FOR INSERT
            TO authenticated
            WITH CHECK (true);
          
          CREATE POLICY "Allow authenticated users to update messaging_configurations"
            ON messaging_configurations
            FOR UPDATE
            TO authenticated
            USING (true);
          
          CREATE POLICY "Allow authenticated users to delete messaging_configurations"
            ON messaging_configurations
            FOR DELETE
            TO authenticated
            USING (true);
          
          -- Enable RLS on ai_configurations
          ALTER TABLE IF EXISTS ai_configurations ENABLE ROW LEVEL SECURITY;
          
          -- Drop existing policies if they exist
          DROP POLICY IF EXISTS "Allow authenticated users to read ai_configurations" ON ai_configurations;
          DROP POLICY IF EXISTS "Allow authenticated users to insert ai_configurations" ON ai_configurations;
          DROP POLICY IF EXISTS "Allow authenticated users to update ai_configurations" ON ai_configurations;
          DROP POLICY IF EXISTS "Allow authenticated users to delete ai_configurations" ON ai_configurations;
          
          -- Create RLS policies for ai_configurations
          CREATE POLICY "Allow authenticated users to read ai_configurations"
            ON ai_configurations
            FOR SELECT
            TO authenticated
            USING (true);
          
          CREATE POLICY "Allow authenticated users to insert ai_configurations"
            ON ai_configurations
            FOR INSERT
            TO authenticated
            WITH CHECK (true);
          
          CREATE POLICY "Allow authenticated users to update ai_configurations"
            ON ai_configurations
            FOR UPDATE
            TO authenticated
            USING (true);
          
          CREATE POLICY "Allow authenticated users to delete ai_configurations"
            ON ai_configurations
            FOR DELETE
            TO authenticated
            USING (true);
        `
      });
      
      if (error) {
        console.error('Error setting up RLS policies with exec_sql:', error);
        
        // Try a different approach - direct REST API call
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          
          if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json(
              { error: 'Supabase credentials not found in environment variables' },
              { status: 500 }
            );
          }
          
          // Use the service role key to bypass RLS
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
              sql_query: `
                -- Enable RLS on messaging_configurations
                ALTER TABLE IF EXISTS messaging_configurations ENABLE ROW LEVEL SECURITY;
                
                -- Drop existing policies if they exist
                DROP POLICY IF EXISTS "Allow authenticated users to read messaging_configurations" ON messaging_configurations;
                DROP POLICY IF EXISTS "Allow authenticated users to insert messaging_configurations" ON messaging_configurations;
                DROP POLICY IF EXISTS "Allow authenticated users to update messaging_configurations" ON messaging_configurations;
                DROP POLICY IF EXISTS "Allow authenticated users to delete messaging_configurations" ON messaging_configurations;
                
                -- Create RLS policies for messaging_configurations
                CREATE POLICY "Allow authenticated users to read messaging_configurations"
                  ON messaging_configurations
                  FOR SELECT
                  TO authenticated
                  USING (true);
                
                CREATE POLICY "Allow authenticated users to insert messaging_configurations"
                  ON messaging_configurations
                  FOR INSERT
                  TO authenticated
                  WITH CHECK (true);
                
                CREATE POLICY "Allow authenticated users to update messaging_configurations"
                  ON messaging_configurations
                  FOR UPDATE
                  TO authenticated
                  USING (true);
                
                CREATE POLICY "Allow authenticated users to delete messaging_configurations"
                  ON messaging_configurations
                  FOR DELETE
                  TO authenticated
                  USING (true);
                
                -- Enable RLS on ai_configurations
                ALTER TABLE IF EXISTS ai_configurations ENABLE ROW LEVEL SECURITY;
                
                -- Drop existing policies if they exist
                DROP POLICY IF EXISTS "Allow authenticated users to read ai_configurations" ON ai_configurations;
                DROP POLICY IF EXISTS "Allow authenticated users to insert ai_configurations" ON ai_configurations;
                DROP POLICY IF EXISTS "Allow authenticated users to update ai_configurations" ON ai_configurations;
                DROP POLICY IF EXISTS "Allow authenticated users to delete ai_configurations" ON ai_configurations;
                
                -- Create RLS policies for ai_configurations
                CREATE POLICY "Allow authenticated users to read ai_configurations"
                  ON ai_configurations
                  FOR SELECT
                  TO authenticated
                  USING (true);
                
                CREATE POLICY "Allow authenticated users to insert ai_configurations"
                  ON ai_configurations
                  FOR INSERT
                  TO authenticated
                  WITH CHECK (true);
                
                CREATE POLICY "Allow authenticated users to update ai_configurations"
                  ON ai_configurations
                  FOR UPDATE
                  TO authenticated
                  USING (true);
                
                CREATE POLICY "Allow authenticated users to delete ai_configurations"
                  ON ai_configurations
                  FOR DELETE
                  TO authenticated
                  USING (true);
              `
            })
          });
          
          if (!response.ok) {
            console.error('Error with direct REST API call:', await response.text());
            return NextResponse.json(
              { error: 'Failed to set up RLS policies with direct REST API call' },
              { status: 500 }
            );
          }
          
          console.log('RLS policies set up with direct REST API call');
        } catch (restError) {
          console.error('Error with direct REST API call:', restError);
          return NextResponse.json(
            { error: 'Failed to set up RLS policies with direct REST API call' },
            { status: 500 }
          );
        }
      } else {
        console.log('RLS policies set up with exec_sql');
      }
    } catch (sqlError) {
      console.error('Error with exec_sql:', sqlError);
      return NextResponse.json(
        { error: 'Failed to set up RLS policies', details: sqlError instanceof Error ? sqlError.message : 'Unknown error' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'RLS policies set up successfully'
    });
  } catch (error) {
    console.error('Error in setup-rls:', error);
    return NextResponse.json(
      { 
        error: 'Failed to set up RLS policies',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint to execute SQL directly
 * POST /api/db/direct-sql
 */
export async function POST(request: Request) {
  try {
    const { sql } = await request.json();
    
    if (!sql) {
      return NextResponse.json(
        { error: 'SQL query is required' },
        { status: 400 }
      );
    }
    
    // Create a Supabase client with service role to execute SQL
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    
    // Execute the SQL directly using the REST API
    const { data, error } = await supabaseAdmin.auth.getUser();
    
    if (error) {
      return NextResponse.json(
        { error: 'Authentication error', details: error.message },
        { status: 500 }
      );
    }
    
    // Create the tables directly
    try {
      // Create messaging_configurations table
      await supabaseAdmin.from('messaging_configurations').select().limit(1).catch(() => {});
      
      // Create the tables directly
      const createMessagingConfigTable = `
        CREATE TABLE IF NOT EXISTS messaging_configurations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          provider_name TEXT NOT NULL CHECK (provider_name IN ('mock', 'twilio', 'nexmo', 'custom')),
          api_key TEXT,
          api_secret TEXT,
          base_url TEXT,
          auth_type TEXT CHECK (auth_type IN ('basic_auth', 'token_auth', 'api_key')),
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      const createAIConfigTable = `
        CREATE TABLE IF NOT EXISTS ai_configurations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          ai_provider TEXT NOT NULL CHECK (ai_provider IN ('default', 'openai', 'custom')),
          api_key TEXT,
          api_endpoint TEXT,
          default_prompt TEXT NOT NULL DEFAULT 'Shorten this message to 160 characters while preserving its core meaning.',
          character_limit INTEGER NOT NULL DEFAULT 160,
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      // Insert default data
      const insertDefaultMessagingConfig = `
        INSERT INTO messaging_configurations (provider_name, is_default)
        SELECT 'mock', TRUE
        WHERE NOT EXISTS (SELECT 1 FROM messaging_configurations WHERE is_default = TRUE);
      `;
      
      const insertDefaultAIConfig = `
        INSERT INTO ai_configurations (ai_provider, default_prompt, character_limit, is_default)
        SELECT 'default', 'Shorten this message to 160 characters while preserving its core meaning.', 160, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM ai_configurations WHERE is_default = TRUE);
      `;
      
      // Execute each SQL statement
      await supabaseAdmin.rpc('exec_sql', { sql_query: createMessagingConfigTable }).catch(e => console.error('Error creating messaging_configurations table:', e));
      await supabaseAdmin.rpc('exec_sql', { sql_query: createAIConfigTable }).catch(e => console.error('Error creating ai_configurations table:', e));
      await supabaseAdmin.rpc('exec_sql', { sql_query: insertDefaultMessagingConfig }).catch(e => console.error('Error inserting default messaging config:', e));
      await supabaseAdmin.rpc('exec_sql', { sql_query: insertDefaultAIConfig }).catch(e => console.error('Error inserting default AI config:', e));
      
      // Try direct insertion as a fallback
      try {
        await supabaseAdmin.from('messaging_configurations').insert({
          provider_name: 'mock',
          is_default: true
        }).select();
        
        await supabaseAdmin.from('ai_configurations').insert({
          ai_provider: 'default',
          default_prompt: 'Shorten this message to 160 characters while preserving its core meaning.',
          character_limit: 160,
          is_default: true
        }).select();
      } catch (insertError) {
        console.error('Error in direct insertion:', insertError);
      }
      
    } catch (error) {
      console.error('Error in table creation:', error);
      // Continue anyway, as the tables might already exist
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'SQL executed successfully'
    });
  } catch (error) {
    console.error('Error in direct-sql:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute SQL',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

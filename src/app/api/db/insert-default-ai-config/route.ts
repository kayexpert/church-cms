import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/db/insert-default-ai-config
 * Insert a default AI configuration using direct SQL
 */
export async function POST() {
  try {
    console.log('Inserting default AI configuration');
    
    // First, check if a default AI configuration already exists
    try {
      const { data, error } = await supabase
        .from('ai_configurations')
        .select('id')
        .eq('is_default', true)
        .maybeSingle();
      
      if (!error && data) {
        console.log('Default AI configuration already exists');
        return NextResponse.json({
          success: true,
          message: 'Default AI configuration already exists',
          data
        });
      }
    } catch (checkError) {
      console.error('Error checking for default AI configuration:', checkError);
    }
    
    // Try to insert a default AI configuration using direct SQL
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: `
          INSERT INTO ai_configurations (
            ai_provider, api_key, api_endpoint, default_prompt, character_limit, is_default
          ) 
          SELECT 
            'default', '', '', 'Shorten this message to 160 characters while preserving its core meaning.', 160, TRUE
          WHERE 
            NOT EXISTS (SELECT 1 FROM ai_configurations WHERE is_default = TRUE);
        `
      });
      
      if (error) {
        console.error('Error inserting default AI configuration with exec_sql:', error);
        
        // Try a different approach - direct insertion
        try {
          const { data, error: insertError } = await supabase
            .from('ai_configurations')
            .insert({
              ai_provider: 'default',
              api_key: '',
              api_endpoint: '',
              default_prompt: 'Shorten this message to 160 characters while preserving its core meaning.',
              character_limit: 160,
              is_default: true
            })
            .select()
            .single();
          
          if (insertError) {
            console.error('Error inserting default AI configuration with direct insertion:', insertError);
            
            // Try a different SQL approach
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
                },
                body: JSON.stringify({
                  sql_query: `
                    INSERT INTO ai_configurations (
                      ai_provider, api_key, api_endpoint, default_prompt, character_limit, is_default
                    ) 
                    SELECT 
                      'default', '', '', 'Shorten this message to 160 characters while preserving its core meaning.', 160, TRUE
                    WHERE 
                      NOT EXISTS (SELECT 1 FROM ai_configurations WHERE is_default = TRUE);
                  `
                })
              });
              
              if (!response.ok) {
                console.error('Error with REST API call:', await response.text());
                return NextResponse.json(
                  { error: 'Failed to insert default AI configuration', details: 'All approaches failed' },
                  { status: 500 }
                );
              }
              
              console.log('Default AI configuration inserted with REST API call');
              return NextResponse.json({
                success: true,
                message: 'Default AI configuration inserted with REST API call'
              });
            } catch (restError) {
              console.error('Error with REST API call:', restError);
              return NextResponse.json(
                { error: 'Failed to insert default AI configuration', details: 'All approaches failed' },
                { status: 500 }
              );
            }
          }
          
          console.log('Default AI configuration inserted with direct insertion');
          return NextResponse.json({
            success: true,
            message: 'Default AI configuration inserted with direct insertion',
            data
          });
        } catch (insertError) {
          console.error('Error with direct insertion:', insertError);
          return NextResponse.json(
            { error: 'Failed to insert default AI configuration', details: 'All approaches failed' },
            { status: 500 }
          );
        }
      }
      
      console.log('Default AI configuration inserted with exec_sql');
      return NextResponse.json({
        success: true,
        message: 'Default AI configuration inserted with exec_sql'
      });
    } catch (sqlError) {
      console.error('Error with exec_sql:', sqlError);
      return NextResponse.json(
        { error: 'Failed to insert default AI configuration', details: sqlError instanceof Error ? sqlError.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in insert-default-ai-config:', error);
    return NextResponse.json(
      { 
        error: 'Failed to insert default AI configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

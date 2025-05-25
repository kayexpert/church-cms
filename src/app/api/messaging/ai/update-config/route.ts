import { NextRequest, NextResponse } from 'next/server';
import { supabaseApi } from '@/lib/supabase-api';
import { z } from 'zod';

// Schema for update config request
const updateConfigSchema = z.object({
  api_key: z.string().min(1, "API key is required"),
  ai_provider: z.enum(['default', 'openai', 'custom']).default('openai'),
  api_endpoint: z.string().optional(),
  default_prompt: z.string().optional(),
});

/**
 * POST /api/messaging/ai/update-config
 * Updates the AI configuration with the provided API key and settings
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('Error parsing request body:', e);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate request body
    const validationResult = updateConfigSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { api_key, ai_provider, api_endpoint, default_prompt } = validationResult.data;

    // Default prompt for rephrasing if not provided
    const finalPrompt = default_prompt ||
      "You are an expert at rephrasing text messages. Take the user's message and rephrase it to be clear, concise, and engaging while preserving the original meaning. The output must be under 160 characters. Don't just shorten the message - rewrite it completely while keeping the core message intact.";

    // Check if a default configuration exists
    const { data: existingConfig, error: fetchError } = await supabaseApi
      .from('ai_configurations')
      .select('*')
      .eq('is_default', true)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching AI configuration:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch AI configuration' },
        { status: 500 }
      );
    }

    let result;

    if (existingConfig) {
      // Update existing configuration
      const { data, error } = await supabaseApi
        .from('ai_configurations')
        .update({
          ai_provider,
          api_key,
          api_endpoint: api_endpoint || null,
          default_prompt: finalPrompt
        })
        .eq('id', existingConfig.id)
        .select();

      if (error) {
        console.error('Error updating AI configuration:', error);
        return NextResponse.json(
          { error: 'Failed to update AI configuration' },
          { status: 500 }
        );
      }

      result = data;
    } else {
      // Create new configuration
      const { data, error } = await supabaseApi
        .from('ai_configurations')
        .insert({
          ai_provider,
          api_key,
          api_endpoint: api_endpoint || null,
          default_prompt: finalPrompt,
          is_default: true,
          character_limit: 160
        })
        .select();

      if (error) {
        console.error('Error creating AI configuration:', error);
        return NextResponse.json(
          { error: 'Failed to create AI configuration' },
          { status: 500 }
        );
      }

      result = data;
    }

    // Return success without exposing the API key
    return NextResponse.json({
      success: true,
      message: 'AI configuration updated successfully',
      data: {
        ai_provider: result[0].ai_provider,
        is_default: result[0].is_default,
        character_limit: result[0].character_limit
      }
    });
  } catch (error) {
    console.error('Error in POST /api/messaging/ai/update-config:', error);
    return NextResponse.json(
      { error: 'Failed to update AI configuration' },
      { status: 500 }
    );
  }
}

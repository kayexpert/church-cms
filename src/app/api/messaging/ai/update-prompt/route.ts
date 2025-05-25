import { NextRequest, NextResponse } from 'next/server';
import { supabaseApi } from '@/lib/supabase-api';

/**
 * POST /api/messaging/ai/update-prompt
 * Updates the default AI prompt to focus on rephrasing rather than just shortening
 */
export async function POST(request: NextRequest) {
  try {
    // New prompt that focuses on rephrasing
    const newPrompt = "You are an expert at rephrasing text messages. Take the user's message and rephrase it to be clear, concise, and engaging while preserving the original meaning. The output must be under 160 characters. Don't just shorten the message - rewrite it completely while keeping the core message intact.";

    // Update the default prompt in the database
    const { data, error } = await supabaseApi
      .from('ai_configurations')
      .update({
        default_prompt: newPrompt
      })
      .eq('is_default', true);

    if (error) {
      console.error('Error updating AI prompt:', error);
      return NextResponse.json(
        { error: 'Failed to update AI prompt' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'AI prompt updated successfully'
    });
  } catch (error) {
    console.error('Error in POST /api/messaging/ai/update-prompt:', error);
    return NextResponse.json(
      { error: 'Failed to update AI prompt' },
      { status: 500 }
    );
  }
}

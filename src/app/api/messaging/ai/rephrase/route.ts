import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseApi } from '@/lib/supabase-api';

// Schema for rephrase request
const rephraseRequestSchema = z.object({
  message: z.string().min(1, "Message is required"),
});

/**
 * POST /api/messaging/ai/rephrase
 * Endpoint for rephrasing messages using OpenAI
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
    const validationResult = rephraseRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { message } = validationResult.data;
    const characterLimit = 160;

    // If message is already within limit, return as is
    if (message.length <= characterLimit) {
      return NextResponse.json({ message });
    }

    // Get AI configuration from database
    const { data: aiConfig, error: configError } = await supabaseApi
      .from('ai_configurations')
      .select('*')
      .eq('is_default', true)
      .single();

    if (configError) {
      console.error('Error fetching AI configuration:', configError);
      throw new Error('Failed to fetch AI configuration');
    }

    // Check if OpenAI API key is configured
    if (aiConfig.ai_provider === 'openai' && aiConfig.api_key) {
      try {
        // Log the API call for debugging
        console.log('Calling OpenAI API with prompt:', aiConfig.default_prompt);

        // Call OpenAI API to rephrase the message
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiConfig.api_key}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: aiConfig.default_prompt || 'Rephrase this message to be concise while preserving its core meaning. The output must be under 160 characters.'
              },
              {
                role: 'user',
                content: message
              }
            ],
            max_tokens: 100,
            temperature: 0.7
          })
        });

        // Log the raw response for debugging
        const responseText = await response.text();
        console.log('OpenAI API raw response:', responseText);

        // Parse the response
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Error parsing OpenAI response:', parseError);
          throw new Error(`Failed to parse OpenAI response: ${responseText}`);
        }

        if (!response.ok) {
          console.error('OpenAI API error:', data);
          throw new Error(data.error?.message || 'OpenAI API error');
        }

        let rephrased = data.choices?.[0]?.message?.content?.trim();

        // Log the rephrased message
        console.log('Rephrased message:', rephrased);

        if (!rephrased) {
          console.error('No content in OpenAI response:', data);
          throw new Error('No content in OpenAI response');
        }

        // Ensure the rephrased message is within the character limit
        if (rephrased && rephrased.length > characterLimit) {
          rephrased = rephrased.substring(0, characterLimit - 3) + '...';
        }

        return NextResponse.json({ message: rephrased });
      } catch (error) {
        console.error('Error calling OpenAI API:', error);
        throw error;
      }
    } else if (aiConfig.ai_provider === 'custom' && aiConfig.api_endpoint && aiConfig.api_key) {
      // Handle custom AI provider
      try {
        const response = await fetch(aiConfig.api_endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiConfig.api_key}`
          },
          body: JSON.stringify({
            prompt: aiConfig.default_prompt || 'Rephrase this message to be concise while preserving its core meaning. The output must be under 160 characters.',
            input: message,
            max_length: characterLimit
          })
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('Custom AI API error:', data);
          throw new Error('Custom AI API error');
        }

        return NextResponse.json({ message: data.output || data.result || data.text });
      } catch (error) {
        console.error('Error calling custom AI API:', error);
        throw error;
      }
    }

    // If no AI provider is configured or if it's set to 'default', fall back to the fallback endpoint
    throw new Error('No AI provider configured');
  } catch (error) {
    console.error('Error in POST /api/messaging/ai/rephrase:', error);

    // Forward to the fallback endpoint
    try {
      // We can't reuse the original request body because it's already been consumed
      // So we need to use the message we extracted earlier
      const fallbackResponse = await fetch(`${request.nextUrl.origin}/api/messaging/ai/shorten-fallback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });

      const fallbackData = await fallbackResponse.json();
      return NextResponse.json(fallbackData);
    } catch (fallbackError) {
      console.error('Error forwarding to fallback endpoint:', fallbackError);

      // Last resort fallback - just truncate the message
      if (message && message.length > characterLimit) {
        const truncated = message.substring(0, characterLimit - 3) + '...';
        return NextResponse.json({ message: truncated });
      }

      return NextResponse.json(
        { error: 'Failed to process message' },
        { status: 500 }
      );
    }
  }
}

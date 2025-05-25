import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for shorten request
const shortenRequestSchema = z.object({
  message: z.string().min(1, "Message is required"),
});

/**
 * POST /api/messaging/ai/shorten-fallback
 * Fallback endpoint for shortening messages when the main endpoint fails
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
    const validationResult = shortenRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { message } = validationResult.data;

    // More intelligent fallback implementation
    const characterLimit = 160;
    let processedMessage = message;

    if (message.length <= characterLimit) {
      // If already within limit, return as is
      return NextResponse.json({ message: processedMessage });
    }

    // Try to create a more intelligent summary
    try {
      // Extract sentences
      const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);

      // If we have multiple sentences, try to extract the most important ones
      if (sentences.length > 1) {
        // For short messages with 2-3 sentences, try to keep first and last
        if (sentences.length <= 3) {
          const firstSentence = sentences[0].trim();
          const lastSentence = sentences[sentences.length - 1].trim();

          // If first and last sentences together are short enough, use them
          if (firstSentence.length + lastSentence.length + 5 <= characterLimit) {
            processedMessage = `${firstSentence}. ${lastSentence}`;
            return NextResponse.json({ message: processedMessage });
          }

          // Otherwise just use the first sentence if it fits
          if (firstSentence.length + 3 <= characterLimit) {
            processedMessage = firstSentence;
            return NextResponse.json({ message: processedMessage });
          }
        }

        // For longer messages, try to extract key information
        // Remove less important words
        const stopWords = ['the', 'and', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        const words = message.toLowerCase().split(/\s+/);

        // Get the main subject (first few words of first sentence)
        const subject = sentences[0].split(' ').slice(0, 3).join(' ');

        // Remove common words and create a shorter version
        let shortened = message.split(' ')
          .filter(word => !stopWords.includes(word.toLowerCase()))
          .join(' ');

        // If still too long, remove adverbs and adjectives
        if (shortened.length > characterLimit) {
          shortened = shortened.replace(/\b(very|really|extremely|quite|rather|actually|basically)\b/gi, '');
          shortened = shortened.replace(/\s+/g, ' ').trim();
        }

        // If still too long, do word-based truncation
        if (shortened.length > characterLimit) {
          const words = shortened.split(' ');
          let finalText = '';
          let currentLength = 0;

          for (const word of words) {
            if (currentLength + word.length + 1 <= characterLimit - 3) {
              finalText += (currentLength > 0 ? ' ' : '') + word;
              currentLength += (currentLength > 0 ? 1 : 0) + word.length;
            } else {
              break;
            }
          }

          processedMessage = finalText + '...';
        } else {
          processedMessage = shortened;
        }
      } else {
        // For single sentences, do word-based truncation
        const words = message.split(' ');
        let shortenedText = '';
        let currentLength = 0;

        for (const word of words) {
          if (currentLength + word.length + 1 <= characterLimit - 3) {
            shortenedText += (currentLength > 0 ? ' ' : '') + word;
            currentLength += (currentLength > 0 ? 1 : 0) + word.length;
          } else {
            break;
          }
        }

        processedMessage = shortenedText + '...';
      }
    } catch (error) {
      console.error('Error in fallback summarization:', error);
      // If all else fails, do simple truncation
      processedMessage = message.substring(0, characterLimit - 3) + '...';
    }

    // Return the shortened message
    return NextResponse.json({ message: processedMessage });
  } catch (error) {
    console.error('Error in POST /api/messaging/ai/shorten-fallback:', error);

    // Last resort fallback - just truncate the message
    try {
      const { message } = await request.json();
      if (message && typeof message === 'string') {
        const truncated = message.length > 157
          ? message.substring(0, 157) + '...'
          : message;
        return NextResponse.json({ message: truncated });
      }
    } catch (e) {
      // If all else fails, return an error
      return NextResponse.json(
        { error: 'Failed to process message' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

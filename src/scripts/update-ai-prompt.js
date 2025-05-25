/**
 * Script to update the AI prompt in the database
 * Run this script with: node src/scripts/update-ai-prompt.js
 */

async function updateAIPrompt() {
  try {
    // Get the base URL from environment or use localhost
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    console.log('Updating AI prompt...');
    
    // Call the update prompt endpoint
    const response = await fetch(`${baseUrl}/api/messaging/ai/update-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update AI prompt');
    }
    
    console.log('Success:', data.message);
  } catch (error) {
    console.error('Error updating AI prompt:', error);
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  updateAIPrompt();
}

module.exports = { updateAIPrompt };

/**
 * Birthday Message Scheduler
 *
 * This module provides functions to start and stop a scheduler that processes
 * birthday messages daily.
 */

let birthdaySchedulerInterval: NodeJS.Timeout | null = null;

/**
 * Start the birthday message scheduler
 * This will check for birthdays and send messages once per day
 */
export function startBirthdayMessageScheduler(): void {
  if (birthdaySchedulerInterval) {
    console.log('Birthday message scheduler is already running');
    return;
  }

  console.log('Starting birthday message scheduler');

  // Only set up the interval, don't process messages immediately
  // This prevents messages from being sent when a user navigates to the page
  birthdaySchedulerInterval = setInterval(() => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      console.log('Birthday message scheduler interval triggered');
      checkLastProcessingTime();
    }
  }, 60 * 60 * 1000); // Check every hour instead of processing

  console.log('Birthday message scheduler started (monitoring only)');
}

/**
 * Stop the birthday message scheduler
 */
export function stopBirthdayMessageScheduler(): void {
  if (!birthdaySchedulerInterval) {
    console.log('Birthday message scheduler is not running');
    return;
  }

  console.log('Stopping birthday message scheduler');
  clearInterval(birthdaySchedulerInterval);
  birthdaySchedulerInterval = null;
  console.log('Birthday message scheduler stopped');
}

/**
 * Process birthday messages for the current date
 */
/**
 * Check when birthday messages were last processed and only process them
 * if it's been more than 20 hours since the last processing
 */
async function checkLastProcessingTime(): Promise<void> {
  try {
    // Get the last processing time from localStorage
    const lastProcessingTime = localStorage.getItem('lastBirthdayMessageProcessingTime');
    const now = Date.now();

    // If we've never processed messages or it's been more than 20 hours
    if (!lastProcessingTime || (now - parseInt(lastProcessingTime)) > 20 * 60 * 60 * 1000) {
      console.log('It has been more than 20 hours since the last birthday message processing');
      console.log('Checking if we need to process birthday messages today');

      // Check if we've already processed messages today
      const today = new Date().toISOString().split('T')[0];
      const lastProcessingDate = localStorage.getItem('lastBirthdayMessageProcessingDate');

      if (lastProcessingDate === today) {
        console.log('Birthday messages have already been processed today. Skipping.');
        return;
      }

      // Call the status check endpoint to see if we need to process messages
      const statusResponse = await fetch('/api/messaging/birthday-status', {
        method: 'GET',
      });

      if (!statusResponse.ok) {
        console.error('Error checking birthday message status:', statusResponse.statusText);
        return;
      }

      const statusData = await statusResponse.json();

      if (statusData.needsProcessing) {
        console.log('Birthday messages need processing. Calling the processing endpoint...');
        await processBirthdayMessages();

        // Update the last processing time and date
        localStorage.setItem('lastBirthdayMessageProcessingTime', now.toString());
        localStorage.setItem('lastBirthdayMessageProcessingDate', today);
      } else {
        console.log('No birthday messages need processing today.');
        // Still update the last check time
        localStorage.setItem('lastBirthdayMessageProcessingTime', now.toString());
      }
    } else {
      console.log('Birthday messages were processed recently. Skipping check.');
    }
  } catch (error) {
    console.error('Error checking last birthday message processing time:', error);
  }
}

/**
 * Process birthday messages for the current date
 * This function should only be called by the cron job or the checkLastProcessingTime function
 */
async function processBirthdayMessages(): Promise<void> {
  try {
    console.log('Processing birthday messages for today');

    // Call the API endpoint to process birthday messages
    const response = await fetch('/api/messaging/process-birthday-messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: new Date().toISOString()
      }),
    });

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      console.error('Response status:', response.status, response.statusText);
      try {
        const text = await response.text();
        console.error('Response text:', text);
      } catch (textError) {
        console.error('Error getting response text:', textError);
      }
      return;
    }

    if (!response.ok) {
      console.error('Error processing birthday messages:', data);
      return;
    }

    console.log('Birthday message processing results:', data.results);

    // Log the results
    const { processed, sent, failed, skipped } = data.results;
    console.log(`Processed ${processed} birthday messages: ${sent} sent, ${failed} failed, ${skipped} skipped`);
  } catch (error) {
    console.error('Error in processBirthdayMessages:', error);
  }
}

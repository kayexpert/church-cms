# Server-Side Message Scheduler

This document explains how the server-side message scheduler works and how to set it up.

## Overview

The server-side scheduler is a robust solution for processing scheduled and frequency-based messages in the Church CMS. It ensures that messages are sent reliably, even when no clients are connected to the application.

The scheduler consists of:

1. **API Endpoints**: Serverless functions that process scheduled and birthday messages
2. **Cron Jobs**: Scheduled tasks that trigger the API endpoints at regular intervals
3. **Database Tables**: Tables to store messages, recipients, and logs

## How It Works

1. **Message Creation**:
   - When a user creates a message with a future schedule time, it's stored in the database with a status of 'scheduled'
   - For recurring messages (daily, weekly, monthly), the frequency is stored in the message record

2. **Message Processing**:
   - The cron job triggers the API endpoint at regular intervals (every 5 minutes for scheduled messages, once a day for birthday messages)
   - The API endpoint fetches messages that are ready to be sent (schedule_time <= current time)
   - For each message, it:
     - Changes the status to 'processing'
     - Fetches the recipients
     - Sends the message to each recipient using the Wigal SMS API
     - Logs the results
     - For recurring messages, calculates the next schedule time and updates the message

3. **Birthday Messages**:
   - A separate endpoint processes birthday messages
   - It finds members whose birthdays match the current date (or future date based on days_before)
   - Sends personalized birthday messages to those members

## Setup Instructions

### 1. Database Setup

Run the following migrations to set up the required database tables:

```bash
# Run the migration to update the messages table
node run-migration.js

# Run the migration to create the message_logs table
# (Update the script to use the create_message_logs_table.sql file)
```

### 2. Environment Variables

Make sure the following environment variables are set in your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
CRON_SECRET_KEY=your-cron-secret-key
```

### 3. Vercel Cron Setup

If you're deploying to Vercel, follow these steps to set up the cron jobs:

1. The project already includes both `cron.json` and `vercel.json` files with the cron job configurations
2. In your Vercel project settings, go to the "Cron Jobs" section
3. Vercel will automatically detect the cron jobs from these configuration files
4. Make sure the `CRON_SECRET_KEY` environment variable is set in your Vercel project settings
5. The cron jobs will run automatically according to the schedule:
   - `process-scheduled-messages`: Every 5 minutes
   - `process-birthday-messages`: Once a day at midnight

### 4. Testing Locally

To test the cron endpoints locally:

1. Start your Next.js development server:
   ```bash
   npm run dev
   ```

2. Use a tool like curl or Postman to send a POST request to the endpoints:
   ```bash
   # Test scheduled messages endpoint
   curl -X POST http://localhost:3000/api/cron/process-scheduled-messages \
     -H "Authorization: Bearer your-cron-secret-key"

   # Test birthday messages endpoint
   curl -X POST http://localhost:3000/api/cron/process-birthday-messages \
     -H "Authorization: Bearer your-cron-secret-key"
   ```

3. Check the console logs for detailed information about the processing

## Monitoring and Troubleshooting

### Logs

The scheduler logs detailed information about message processing. You can view these logs in:

1. Vercel logs (if deployed to Vercel)
2. The `message_logs` table in the database

### Common Issues

1. **Messages not being sent**:
   - Check that the cron jobs are running (Vercel Cron Jobs dashboard)
   - Check the logs for errors
   - Verify that the SMS configuration is correct
   - Ensure the `CRON_SECRET_KEY` environment variable is set correctly
   - Check that messages have the correct status ('active' or 'scheduled')

2. **Duplicate messages**:
   - This shouldn't happen with the current implementation, as messages are marked as 'processing' before sending
   - The system also uses the `hasMessageBeenSent` and `markMessageAsSent` functions to prevent duplicates
   - If it does happen, check for concurrent executions of the cron job

3. **Error handling**:
   - Failed messages are logged with error details in the `message_logs` table
   - The message status is updated to 'inactive' with an error_message
   - Check the server logs for detailed error information

4. **Client-side vs. Server-side scheduling**:
   - The system now uses server-side scheduling via cron jobs, which is more reliable
   - The client-side scheduler (in the browser) is still used as a fallback
   - For best results, ensure both are working correctly

## Customization

### Cron Schedule

You can customize the cron schedule in the `cron.json` file:

- `process-scheduled-messages`: Currently runs every 5 minutes (`*/5 * * * *`)
- `process-birthday-messages`: Currently runs once a day at 8 AM (`0 8 * * *`)

### Batch Size

You can adjust the batch size in the API endpoints to control how many messages are processed in each run.

## Conclusion

The server-side scheduler provides a reliable solution for sending scheduled and frequency-based messages. It follows best practices for error handling, logging, and security, ensuring that your messages are delivered reliably and on time.

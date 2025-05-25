# Scheduled Messages System

This document explains how the scheduled messages system works and how to set it up properly.

## Overview

The scheduled messages system allows you to create messages that will be sent at a specific time in the future, or on a recurring schedule (daily, weekly, monthly). The system works independently of user navigation, meaning messages will be sent even when no users are actively using the application.

## How It Works

1. **Message Creation**: When a message is created with a future schedule time, it is stored in the database with a status of `scheduled`.

2. **Cron Job**: A server-side cron job runs every 5 minutes to check for messages that are due to be sent.

3. **Message Processing**: When the cron job finds messages that are ready to be sent, it:
   - Marks them as `processing`
   - Sends the messages to the recipients
   - Updates their status to `completed` (for one-time messages) or calculates the next schedule time (for recurring messages)

4. **Message Logs**: Each message sent creates a log entry in the database, which can be viewed in the message history.

## Setup Instructions

### 1. Environment Variables

Make sure the following environment variables are set in your Vercel project:

```
CRON_SECRET_KEY=your-secure-random-string
```

This key is used to authenticate the cron job requests. Generate a secure random string (at least 32 characters) and keep it secret.

### 2. Vercel Cron Job Setup

The project includes a `vercel.json` file that defines the cron jobs. To enable them:

1. Deploy your project to Vercel
2. Go to your Vercel project settings
3. Navigate to the "Cron Jobs" section
4. Ensure the cron jobs are enabled
5. Make sure the `CRON_SECRET_KEY` environment variable is set

The cron jobs are configured to run:
- Once daily at 8:00 AM UTC for scheduled messages (`/api/cron/process-scheduled-messages`) - compatible with Vercel Hobby plan
- Once daily at 9:00 AM UTC for birthday messages (`/api/cron/process-birthday-messages`)

**Note**: Vercel Hobby accounts are limited to daily cron jobs. The system processes all messages scheduled in the last 24 hours during each daily run.

### 3. Testing

You can test the scheduled messages system using the "Process Scheduled Messages" button on the messaging page. This will manually trigger the cron job to process any scheduled messages that are due.

## Troubleshooting

### Messages Not Being Sent

If scheduled messages are not being sent automatically, check the following:

1. **Vercel Cron Jobs**: Make sure the cron jobs are enabled in your Vercel project settings.

2. **Environment Variables**: Verify that the `CRON_SECRET_KEY` is set correctly.

3. **Message Status**: Check the status of your messages in the database. They should be `scheduled` or `active` to be processed.

4. **Schedule Time**: Ensure the schedule time is in the past (for messages that should be sent now) or in the future (for messages to be sent later).

5. **Logs**: Check the Vercel function logs for any errors in the cron job execution.

### Manual Testing

You can manually test the cron job by clicking the "Process Scheduled Messages" button on the messaging page. This will trigger the cron job to run immediately.

## Technical Details

### Endpoints

- `/api/cron/process-scheduled-messages`: The main cron job endpoint that processes scheduled messages
- `/api/messaging/trigger-cron`: A helper endpoint to manually trigger the cron job (used by the UI button)

### Database Tables

- `messages`: Stores the message content, schedule time, and status
- `message_recipients`: Links messages to their recipients
- `message_logs`: Records each message sent, including success/failure status

### Message Statuses

- `scheduled`: Message is scheduled to be sent in the future
- `active`: Message is active and ready to be sent
- `processing`: Message is currently being processed
- `completed`: Message has been sent (for one-time messages)
- `error`: An error occurred while processing the message

## Best Practices

1. **Schedule Time**: Set the schedule time in UTC to avoid timezone issues.

2. **Recurring Messages**: For recurring messages, set an end date to prevent them from running indefinitely.

3. **Testing**: Always test your scheduled messages before deploying to production.

4. **Monitoring**: Regularly check the message logs to ensure messages are being sent as expected.

5. **Security**: Keep your `CRON_SECRET_KEY` secure and never expose it in client-side code.

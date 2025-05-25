# Vercel Hobby Plan Compatibility Notes

## Cron Job Limitations

### **Issue**
Vercel Hobby accounts are limited to **daily cron jobs only**. The original configuration used `*/5 * * * *` (every 5 minutes) which is not supported on the Hobby plan.

### **Solution Applied**
Updated cron schedules to run once daily:

- **Scheduled Messages**: `0 8 * * *` (8:00 AM UTC daily)
- **Birthday Messages**: `0 9 * * *` (9:00 AM UTC daily)

### **How It Works**
1. **Daily Processing**: The system now processes all messages scheduled in the last 24 hours during each daily run
2. **Batch Processing**: Increased batch size from 50 to 100 messages per run
3. **Manual Trigger**: Users can manually trigger processing using the "Run Cron Job" button in the messaging interface

## Configuration Files Updated

### `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/process-scheduled-messages?token=${CRON_SECRET_KEY}",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/process-birthday-messages?token=${CRON_SECRET_KEY}",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**Note**: Vercel cron jobs don't support custom headers, so authentication is handled via query parameters.

### `cron.json`
```json
{
  "version": 1,
  "jobs": [
    {
      "name": "process-scheduled-messages",
      "schedule": "0 8 * * *",
      "path": "/api/cron/process-scheduled-messages",
      "headers": {
        "Authorization": "Bearer ${CRON_SECRET_KEY}"
      }
    },
    {
      "name": "process-birthday-messages",
      "schedule": "0 9 * * *",
      "path": "/api/cron/process-birthday-messages",
      "headers": {
        "Authorization": "Bearer ${CRON_SECRET_KEY}"
      }
    }
  ]
}
```

## Code Changes

### Enhanced Message Processing
- Modified query to look for messages scheduled in the last 24 hours
- Increased batch size for daily processing
- Added better logging for daily processing windows

### Authentication Updates
- Updated cron endpoints to support both header-based and query parameter authentication
- Vercel cron jobs use query parameters since custom headers are not supported
- Manual triggers still use Authorization headers for security

### Updated Documentation
- `SCHEDULER-README.md`
- `SCHEDULED-MESSAGES-README.md`
- `src/lib/config.ts`
- Component tooltips and help text

## User Experience

### **For Users**
- Messages are still processed reliably, just once daily instead of every 5 minutes
- Manual trigger button available for immediate processing
- Clear documentation about processing schedule

### **For Administrators**
- Reduced server load with daily processing
- Compatible with Vercel Hobby plan (free tier)
- Option to upgrade to Vercel Pro for more frequent processing if needed

## Upgrade Path

### **To Enable More Frequent Processing**
1. Upgrade to Vercel Pro plan
2. Update cron schedules in `vercel.json` and `cron.json`
3. Optionally reduce batch size and processing window

### **Example Pro Plan Schedule**
```json
{
  "schedule": "*/15 * * * *"  // Every 15 minutes
}
```

## Testing

### **Manual Testing**
Use the "Run Cron Job" button in the messaging interface to test processing immediately.

### **Scheduled Testing**
Messages scheduled for the current day will be processed during the next daily run at 8:00 AM UTC.

## Monitoring

### **Logs**
Check Vercel function logs to monitor daily processing:
- Processing start time
- Number of messages found
- Processing results
- Any errors or issues

### **Message Status**
Monitor message status in the messaging interface:
- `scheduled` → `processing` → `sent`/`failed`
- Check message logs for detailed delivery status

---

**Note**: This configuration ensures full compatibility with Vercel's Hobby plan while maintaining all messaging functionality. Users can always manually trigger processing for immediate needs.

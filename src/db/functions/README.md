# Database Functions

This directory contains SQL functions that can be applied to the Supabase database to optimize queries and improve performance.

## Function Files Overview

- `member-functions.sql`: Functions for member-related queries and statistics
- `database_health_functions.sql`: Functions for monitoring database health and performance
- `event-functions.sql`: Functions for event-related queries and statistics

## How to Apply SQL Functions

1. Navigate to the Supabase dashboard for your project
2. Go to the SQL Editor
3. Copy the contents of the SQL files in the `functions` directory
4. Paste the SQL into the editor and run the queries

## Available Functions

### Member Functions (`member-functions.sql`)

- `check_function_exists(function_name text)`: Utility function to check if another function exists
- `get_upcoming_birthdays(days_ahead integer)`: Returns members with birthdays in the next X days
- `get_gender_distribution()`: Returns the count of members by gender
- `get_department_distribution()`: Returns the count of members by department
- `get_status_distribution()`: Returns the count of members by status (active/inactive)
- `get_member_stats()`: Returns key member statistics (total, active, inactive, new this month)
- `get_member_growth()`: Returns member growth data for the last 6 months
- `get_birthdays_this_month()`: Returns the count of members with birthdays in the current month
- `get_attendance_trend()`: Returns attendance rate trend data for the last 6 months
- `get_filtered_members(status_filter, search_term, page_number, items_per_page)`: Returns filtered and paginated members

### Database Health Functions (`database_health_functions.sql`)

- `check_function_exists(function_name text)`: Utility function to check if another function exists
- `get_connection_stats()`: Returns statistics about database connections
- `get_database_size()`: Returns the size of the database
- `get_slow_queries()`: Returns information about slow queries
- `get_index_usage_stats()`: Returns statistics about index usage
- `get_cache_hit_ratio()`: Returns the cache hit ratio

### Event Functions (`event-functions.sql`)

- `check_function_exists(function_name text)`: Utility function to check if another function exists
- `get_upcoming_events(days_ahead integer)`: Returns events with dates in the next X days
- `get_event_stats()`: Returns key event statistics (total, upcoming, ongoing, completed, cancelled)
- `get_events_by_category()`: Returns the count of events by category
- `get_filtered_events(...)`: Returns filtered and paginated events

## Benefits

These SQL functions move computation to the database server, which:

1. Reduces the amount of data transferred over the network
2. Improves query performance by leveraging database indexes
3. Reduces client-side processing
4. Simplifies client code by encapsulating complex logic in the database

## Implementation Status

The application code is designed to gracefully fall back to client-side processing if these functions are not yet available in the database. This ensures the application works correctly even if the SQL functions haven't been applied yet.

## Checking Function Existence

To check if a function exists in your database, you can run:

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_type = 'FUNCTION'
AND routine_schema = 'public'
AND routine_name = 'get_upcoming_birthdays';
```

Replace `'get_upcoming_birthdays'` with the name of the function you want to check.

## Troubleshooting

If you encounter issues with database functions:

1. Verify that the functions have been successfully created in the database
2. Check for any error messages in the browser console
3. Try running the function directly in the Supabase SQL Editor to see if it works
4. Make sure your Supabase project has the necessary permissions

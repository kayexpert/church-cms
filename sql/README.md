# SQL Functions for Church CMS

This directory contains SQL functions that need to be executed in your Supabase database to enable certain optimized features in the application.

## Implementation Instructions

### 1. Get Upcoming Birthdays Function

The `get_upcoming_birthdays.sql` file contains a function that efficiently calculates upcoming birthdays within a specified number of days. This function handles year boundaries correctly and returns days until birthday for sorting.

To implement this function:

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `get_upcoming_birthdays.sql`
4. Paste it into a new SQL query
5. Execute the query

Example usage after implementation:

```sql
-- Get all birthdays in the next 30 days
SELECT * FROM get_upcoming_birthdays(30);

-- Get all birthdays in the next 7 days
SELECT * FROM get_upcoming_birthdays(7);
```

The function returns the following columns:
- `id`: Member ID
- `first_name`: Member's first name
- `last_name`: Member's last name
- `date_of_birth`: Member's date of birth
- `profile_image`: URL to member's profile image
- `status`: Member's status (active/inactive)
- `days_until`: Number of days until the member's next birthday

## Benefits of SQL Functions

Using SQL functions provides several advantages:

1. **Performance**: Calculations are performed at the database level, reducing data transfer and client-side processing
2. **Consistency**: Business logic is centralized in the database, ensuring consistent results
3. **Reduced Network Traffic**: Only the necessary data is returned to the client
4. **Simplified Client Code**: Complex logic is abstracted away from the client

## Fallback Mechanism

The application includes client-side fallback mechanisms if these SQL functions are not available. However, for optimal performance, it's recommended to implement these functions in your Supabase database.

# Utility Libraries

This directory contains utility functions and libraries used throughout the application.

## Overview

- **auth-utils.ts**: Authentication utility functions
- **config.ts**: Application configuration
- **date-utils.ts**: Date formatting and manipulation utilities
- **db-utils.ts**: Database utility functions
- **fonts.ts**: Font configuration
- **image-utils.ts**: Image optimization utilities
- **supabase.ts**: Supabase client for browser
- **supabase-server.ts**: Supabase client for server components
- **utils.ts**: General utility functions

## Key Utilities

### Date Utilities

The `date-utils.ts` file provides a comprehensive set of functions for working with dates:

- **parseDate**: Parse a date string safely into a Date object with caching
- **formatDate**: Format a date string to dd-MMM-yy format
- **formatDateLong**: Format a date string to a more readable format (dd MMMM yyyy)
- **calculateAge**: Calculate age from a date string
- **formatBirthdayDate**: Format a date for display in the birthday section (dd-MMM)
- **isCurrentMonth**: Check if a date is within the current month
- **getNextOccurrence**: Get the next occurrence of a date (useful for birthdays)
- **formatRelativeDate**: Format a relative date (e.g., "2 days ago", "in 3 days")

### Image Utilities

The `image-utils.ts` file provides functions for optimizing images:

- **resizeAndOptimizeImage**: Resize and optimize an image before upload
- **getBestSupportedImageFormat**: Get the appropriate image format based on browser support

### Database Utilities

The `db-utils.ts` file provides functions for working with the database:

- **checkFunctionExists**: Check if a database function exists
- **markFunctionExists**: Mark a function as existing or not in localStorage
- **clearFunctionExistsCache**: Clear the function existence cache

## Best Practices

1. **Keep utilities pure**: Utility functions should be pure functions without side effects.
2. **Add proper documentation**: Document all utility functions with JSDoc comments.
3. **Add proper error handling**: Handle errors gracefully in utility functions.
4. **Use TypeScript**: Use TypeScript for type safety and better IDE support.
5. **Write tests**: Write tests for utility functions to ensure they work as expected.
6. **Optimize for performance**: Optimize utility functions for performance, especially those used frequently.
7. **Use caching**: Use caching for expensive operations, like date parsing.
8. **Avoid duplication**: Don't duplicate functionality across different utility files.

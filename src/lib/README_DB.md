# Database Utilities and Maintenance

This document provides information about the database utilities and maintenance scripts available in the Church CMS application.

## Database Utilities

The `db.ts` file provides a comprehensive set of database utilities for interacting with the Supabase database. It consolidates functionality from multiple files into a single, easy-to-use module.

### Key Features

- **Enhanced Database Operations**: Execute database operations with retry logic and error handling
- **Query Caching**: Cache query results to reduce database load
- **Database Health Monitoring**: Check database health and performance
- **Function Existence Checking**: Check if database functions exist before calling them
- **Batch Operations**: Execute multiple database operations in a single batch
- **Performance Monitoring**: Track database performance metrics

### Usage Examples

#### Basic Query Execution

```typescript
import { executeDbOperation } from '@/lib/db';

// Execute a database query with retry logic and error handling
const result = await executeDbOperation(() => 
  supabase.from('members').select('*')
);

if (result.error) {
  console.error('Error fetching members:', result.error);
} else {
  console.log('Members:', result.data);
}
```

#### Cached Queries

```typescript
import { cachedQuery } from '@/lib/db';

// Execute a database query with caching
const result = await cachedQuery(
  'members-active',
  () => supabase.from('members').select('*').eq('status', 'active'),
  60 * 1000 // Cache for 1 minute
);

if (result.error) {
  console.error('Error fetching active members:', result.error);
} else {
  console.log('Active members:', result.data);
}
```

#### Database Health Check

```typescript
import { checkDatabaseHealth } from '@/lib/db';

// Check database health
const health = await checkDatabaseHealth();

if (health.healthy) {
  console.log(`Database is healthy (response time: ${health.responseTime}ms)`);
} else {
  console.error(`Database is unhealthy: ${health.error}`);
}
```

#### Batch Operations

```typescript
import { batchOperations } from '@/lib/db';

// Execute multiple database operations in a single batch
const results = await batchOperations([
  () => supabase.from('members').select('count').single(),
  () => supabase.from('events').select('count').single(),
  () => supabase.from('income_entries').select('count').single()
]);

console.log('Members count:', results[0].data?.count);
console.log('Events count:', results[1].data?.count);
console.log('Income entries count:', results[2].data?.count);
```

#### Function Existence Checking

```typescript
import { checkFunctionExists } from '@/lib/db';

// Check if a database function exists
const exists = await checkFunctionExists('get_member_stats');

if (exists) {
  // Call the function
  const { data, error } = await supabase.rpc('get_member_stats');
  // ...
} else {
  // Fall back to client-side implementation
  // ...
}
```

#### Direct SQL Execution

```typescript
import { executeSql } from '@/lib/db';

// Execute a SQL query directly
const result = await executeSql(`
  CREATE INDEX IF NOT EXISTS idx_members_name ON members(first_name, last_name);
`);

if (result.success) {
  console.log('Index created successfully');
} else {
  console.error('Error creating index:', result.error);
}
```

## Database Maintenance

The Church CMS application includes scripts for database maintenance and optimization.

### Maintenance Script

The maintenance script (`src/db/run-maintenance.js`) performs the following tasks:

- Updates table statistics for better query planning
- Cleans up dead tuples
- Reindexes important tables
- Logs database size and statistics
- Identifies slow queries
- Checks for unused indexes
- Identifies potential missing indexes

To run the maintenance script:

```bash
npm run db:maintenance
```

It's recommended to run this script weekly to keep the database healthy.

### Missing Indexes Script

The missing indexes script (`src/db/add-missing-indexes.js`) adds indexes that are important for frequently used queries but might be missing from the consolidated indexes file.

To add missing indexes:

```bash
npm run db:add-indexes
```

This script only needs to be run once, or when new indexes are added to the script.

## Best Practices

1. **Use the Database Utilities**: Always use the database utilities from `db.ts` instead of calling Supabase directly. This ensures consistent error handling and retry logic.

2. **Cache Frequently Used Queries**: Use the `cachedQuery` function for queries that are called frequently and don't need real-time data.

3. **Batch Related Queries**: Use the `batchOperations` function to execute multiple related queries in a single batch.

4. **Run Regular Maintenance**: Schedule the maintenance script to run weekly to keep the database healthy.

5. **Monitor Database Health**: Use the `checkDatabaseHealth` function to monitor database health and performance.

6. **Check Function Existence**: Always check if a database function exists before calling it, and provide a client-side fallback if it doesn't.

7. **Add Indexes for Frequently Used Queries**: Add indexes for frequently used queries to improve performance.

## Troubleshooting

If you encounter database-related issues:

1. **Check Database Health**: Use the `checkDatabaseHealth` function to check if the database is healthy.

2. **Check Error Messages**: Look at the error messages returned by the database utilities for clues about what went wrong.

3. **Run Maintenance**: Run the maintenance script to clean up the database and update statistics.

4. **Add Missing Indexes**: Run the missing indexes script to add indexes for frequently used queries.

5. **Check Performance Metrics**: Use the `getPerformanceMetrics` function to check database performance metrics.

6. **Clear Caches**: Use the `clearQueryCache` and `clearFunctionExistsCache` functions to clear caches if you suspect caching issues.

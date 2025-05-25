-- Database Maintenance Script
-- Run this weekly to keep your database healthy

-- Create a maintenance_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on type and created_at for better query performance
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_type ON maintenance_logs(type);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_created_at ON maintenance_logs(created_at);

-- Function to run maintenance tasks
DO $$
DECLARE
  db_size TEXT;
  db_size_bytes BIGINT;
  table_stats JSONB;
  slow_queries JSONB;
  index_stats JSONB;
  cache_hit_ratio NUMERIC;
BEGIN
  RAISE NOTICE 'Starting database maintenance...';
  
  -- Update table statistics for better query planning
  ANALYZE;
  RAISE NOTICE 'Updated table statistics';
  
  -- Clean up dead tuples
  VACUUM;
  RAISE NOTICE 'Vacuumed database';
  
  -- Get database size
  SELECT pg_size_pretty(pg_database_size(current_database())) INTO db_size;
  SELECT pg_database_size(current_database()) INTO db_size_bytes;
  RAISE NOTICE 'Database size: %', db_size;
  
  -- Get table statistics
  SELECT json_agg(stats)
  FROM (
    SELECT
      table_name,
      pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS size,
      pg_total_relation_size(quote_ident(table_name)) AS size_bytes,
      (SELECT reltuples FROM pg_class WHERE relname = table_name) AS estimated_row_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC
    LIMIT 10
  ) stats INTO table_stats;
  
  -- Get slow query statistics if pg_stat_statements is available
  BEGIN
    SELECT json_agg(sq)
    FROM (
      SELECT
        substring(query, 1, 200) AS query,
        calls,
        total_exec_time / calls AS avg_time,
        rows / calls AS avg_rows
      FROM pg_stat_statements
      WHERE mean_exec_time > 100 -- milliseconds
      ORDER BY mean_exec_time DESC
      LIMIT 10
    ) sq INTO slow_queries;
  EXCEPTION WHEN OTHERS THEN
    slow_queries := '[]'::jsonb;
    RAISE NOTICE 'pg_stat_statements extension not available';
  END;
  
  -- Get index usage statistics
  SELECT json_agg(idx)
  FROM (
    SELECT
      schemaname || '.' || relname AS table,
      indexrelname AS index,
      idx_scan AS scans,
      idx_tup_read AS tuples_read,
      idx_tup_fetch AS tuples_fetched,
      pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
    FROM pg_stat_user_indexes
    ORDER BY idx_scan DESC
    LIMIT 10
  ) idx INTO index_stats;
  
  -- Get cache hit ratio
  SELECT
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100
  FROM pg_statio_user_tables
  INTO cache_hit_ratio;
  
  -- Log maintenance results
  INSERT INTO maintenance_logs (type, data)
  VALUES (
    'maintenance',
    jsonb_build_object(
      'timestamp', now(),
      'database_size', db_size,
      'database_size_bytes', db_size_bytes,
      'table_stats', table_stats,
      'slow_queries', slow_queries,
      'index_stats', index_stats,
      'cache_hit_ratio', cache_hit_ratio
    )
  );
  
  -- Reindex important tables to improve performance
  -- Only reindex if they exist
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'members') THEN
    REINDEX TABLE members;
    RAISE NOTICE 'Reindexed members table';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
    REINDEX TABLE events;
    RAISE NOTICE 'Reindexed events table';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'income_entries') THEN
    REINDEX TABLE income_entries;
    RAISE NOTICE 'Reindexed income_entries table';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenditure_entries') THEN
    REINDEX TABLE expenditure_entries;
    RAISE NOTICE 'Reindexed expenditure_entries table';
  END IF;
  
  -- Reset slow query statistics if pg_stat_statements is available
  BEGIN
    SELECT pg_stat_statements_reset();
    RAISE NOTICE 'Reset slow query statistics';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not reset slow query statistics';
  END;
  
  -- Check for unused indexes
  RAISE NOTICE 'Checking for unused indexes...';
  FOR r IN (
    SELECT
      schemaname || '.' || relname AS table,
      indexrelname AS index,
      idx_scan AS scans,
      pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
      pg_relation_size(indexrelid) AS index_size_bytes
    FROM pg_stat_user_indexes
    WHERE idx_scan = 0
    AND indexrelname NOT LIKE 'pg_%'
    AND indexrelname NOT LIKE '%_pkey'
    ORDER BY pg_relation_size(indexrelid) DESC
    LIMIT 5
  ) LOOP
    RAISE NOTICE 'Unused index: % on % (size: %)', r.index, r.table, r.index_size;
  END LOOP;
  
  -- Check for missing indexes (tables with high sequential scans)
  RAISE NOTICE 'Checking for potential missing indexes...';
  FOR r IN (
    SELECT
      schemaname || '.' || relname AS table,
      seq_scan AS sequential_scans,
      seq_tup_read AS tuples_read,
      n_live_tup AS total_rows,
      pg_size_pretty(pg_relation_size(relid)) AS table_size
    FROM pg_stat_user_tables
    WHERE seq_scan > 1000
    AND n_live_tup > 10000
    AND seq_scan > idx_scan
    ORDER BY seq_scan DESC
    LIMIT 5
  ) LOOP
    RAISE NOTICE 'Potential missing index: % (% sequential scans, % rows)', r.table, r.sequential_scans, r.total_rows;
  END LOOP;
  
  RAISE NOTICE 'Database maintenance completed successfully';
END $$;

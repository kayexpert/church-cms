-- Database Health Monitoring Functions
-- These functions provide detailed information about database health and performance
-- Run this script in the Supabase SQL Editor

-- Function to check if another function exists
CREATE OR REPLACE FUNCTION check_function_exists(function_name text)
RETURNS boolean AS $$
DECLARE
  function_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = function_name
  ) INTO function_exists;
  
  RETURN function_exists;
END;
$$ LANGUAGE plpgsql;

-- Function to get connection statistics
CREATE OR REPLACE FUNCTION get_connection_stats()
RETURNS json AS $$
DECLARE
  current_connections integer;
  max_connections integer;
BEGIN
  -- Get current connection count
  SELECT count(*) INTO current_connections FROM pg_stat_activity;
  
  -- Get max connections setting
  SELECT setting::integer INTO max_connections FROM pg_settings WHERE name = 'max_connections';
  
  RETURN json_build_object(
    'current_connections', current_connections,
    'max_connections', max_connections
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get database size
CREATE OR REPLACE FUNCTION get_database_size()
RETURNS json AS $$
DECLARE
  db_size text;
BEGIN
  -- Get database size in a human-readable format
  SELECT pg_size_pretty(pg_database_size(current_database())) INTO db_size;
  
  RETURN json_build_object('size', db_size);
END;
$$ LANGUAGE plpgsql;

-- Function to get slow queries (requires pg_stat_statements extension)
CREATE OR REPLACE FUNCTION get_slow_queries()
RETURNS json AS $$
DECLARE
  has_extension boolean;
  result json;
BEGIN
  -- Check if pg_stat_statements extension is available
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
  ) INTO has_extension;
  
  IF has_extension THEN
    -- Get top 5 slowest queries
    SELECT json_agg(q) INTO result
    FROM (
      SELECT 
        substring(query, 1, 200) as query,
        mean_exec_time,
        calls
      FROM pg_stat_statements
      WHERE mean_exec_time > 50 -- milliseconds
      ORDER BY mean_exec_time DESC
      LIMIT 5
    ) q;
    
    RETURN result;
  ELSE
    -- Return empty array if extension is not available
    RETURN '[]'::json;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get index usage statistics
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS json AS $$
DECLARE
  idx_scan bigint;
  seq_scan bigint;
  idx_usage_percent numeric;
BEGIN
  -- Get index and sequential scan counts
  SELECT 
    sum(idx_scan) as idx_scan,
    sum(seq_scan) as seq_scan
  INTO idx_scan, seq_scan
  FROM pg_stat_user_tables;
  
  -- Calculate index usage percentage
  IF (idx_scan + seq_scan) > 0 THEN
    idx_usage_percent := (idx_scan::numeric / (idx_scan + seq_scan)::numeric) * 100;
  ELSE
    idx_usage_percent := 0;
  END IF;
  
  RETURN json_build_object('index_usage_percent', idx_usage_percent);
END;
$$ LANGUAGE plpgsql;

-- Function to get cache hit ratio
CREATE OR REPLACE FUNCTION get_cache_hit_ratio()
RETURNS json AS $$
DECLARE
  hit_count bigint;
  read_count bigint;
  cache_hit_ratio numeric;
BEGIN
  -- Get cache hit and read counts
  SELECT 
    sum(heap_blks_hit) as hit_count,
    sum(heap_blks_read) as read_count
  INTO hit_count, read_count
  FROM pg_statio_user_tables;
  
  -- Calculate cache hit ratio
  IF (hit_count + read_count) > 0 THEN
    cache_hit_ratio := (hit_count::numeric / (hit_count + read_count)::numeric) * 100;
  ELSE
    cache_hit_ratio := 0;
  END IF;
  
  RETURN json_build_object('cache_hit_ratio', cache_hit_ratio);
END;
$$ LANGUAGE plpgsql;

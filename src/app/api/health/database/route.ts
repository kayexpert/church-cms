import { NextResponse } from 'next/server';
import { checkDatabaseHealth, cachedQuery } from '@/lib/db-enhanced';
import { supabase } from '@/lib/supabase';

// Cache TTL in milliseconds (30 seconds)
const CACHE_TTL = 30 * 1000;

/**
 * Optimized database health API endpoint with caching
 * GET /api/health/database
 */
export async function GET() {
  try {
    // Use a cache key that includes the current minute to ensure regular refreshes
    const cacheKey = `database-health-${Math.floor(Date.now() / CACHE_TTL)}`;

    // Try to get cached health data first
    const cachedHealth = await getCachedHealthData(cacheKey);
    if (cachedHealth) {
      return NextResponse.json(cachedHealth);
    }

    // If no cached data, perform health check
    const startTime = performance.now();
    const basicHealth = await checkDatabaseHealth();

    // Create response with basic health data
    const healthData = {
      status: basicHealth.healthy ? 'healthy' : 'error',
      responseTime: basicHealth.responseTime,
      message: basicHealth.error,
      timestamp: new Date().toISOString(),

      // Mock data for advanced metrics - in a real app, these would come from actual database queries
      connectionCount: basicHealth.healthy ? 5 : undefined,
      maxConnections: basicHealth.healthy ? 20 : undefined,
      databaseSize: basicHealth.healthy ? '25 MB' : undefined,
      indexUsage: basicHealth.healthy ? 85 : undefined,
      cacheHitRatio: basicHealth.healthy ? 92 : undefined,

      // Mock slow queries data
      slowQueries: basicHealth.healthy ? [
        {
          query: 'SELECT * FROM members WHERE status = $1',
          avgTime: 150,
          calls: 42
        },
        {
          query: 'SELECT * FROM attendance WHERE event_id = $1',
          avgTime: 120,
          calls: 28
        }
      ] : undefined
    };

    const totalTime = performance.now() - startTime;
    console.log(`Database health check completed in ${totalTime.toFixed(2)}ms`);

    // Cache the health data
    cacheHealthData(cacheKey, healthData);

    return NextResponse.json(healthData);
  } catch (error) {
    console.error('Database health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        responseTime: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Get cached health data
 */
async function getCachedHealthData(cacheKey: string) {
  try {
    // Try to get the health data from the cache
    const { data: cacheData } = await supabase
      .from('cache')
      .select('data')
      .eq('key', cacheKey)
      .single();

    if (cacheData) {
      return cacheData.data;
    }

    return null;
  } catch (error) {
    console.warn('Error getting cached health data:', error);
    return null;
  }
}

/**
 * Cache health data
 */
async function cacheHealthData(cacheKey: string, data: any) {
  try {
    // Store the health data in the cache
    await supabase
      .from('cache')
      .upsert(
        {
          key: cacheKey,
          data,
          expires_at: new Date(Date.now() + CACHE_TTL).toISOString()
        },
        { onConflict: 'key' }
      );
  } catch (error) {
    console.warn('Error caching health data:', error);
  }
}

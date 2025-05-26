import { createClient } from '@/lib/supabase-server';
import { Suspense } from 'react';
import { MembersContent } from '@/components/members/members-content';
import { MembersListSkeleton } from '@/components/members/members-consolidated-skeletons';

/**
 * Server component that fetches initial member data
 * This allows us to render the initial state on the server
 * and hydrate it on the client for better performance
 * Optimized with parallel data fetching and error handling
 */
export async function MembersServer() {
  // Create a Supabase client for server-side data fetching
  const supabase = await createClient();

  try {
    // Fetch all data in parallel for better performance
    const [membersResult, countResult, statsResult] = await Promise.all([
      // Fetch initial member data (first page, no filters)
      supabase
        .from('members')
        .select('*')
        .order('first_name', { ascending: true })
        .limit(8),

      // Fetch total count for pagination
      supabase
        .from('members')
        .select('*', { count: 'exact', head: true }),

      // Fetch member stats for dashboard
      supabase.rpc('get_member_stats')
    ]);

    // Extract data from results
    const initialMembers = membersResult.data || [];
    const count = countResult.count || 0;

    // Format stats data
    const stats = statsResult.data ? {
      totalMembers: Number(statsResult.data[0]?.total_members || 0),
      activeMembers: Number(statsResult.data[0]?.active_members || 0),
      inactiveMembers: Number(statsResult.data[0]?.inactive_members || 0),
      newMembersThisMonth: Number(statsResult.data[0]?.new_members_this_month || 0)
    } : null;

    // Cache control is handled by Next.js configuration
    // We don't need to set headers manually

    // Pass the initial data to the client component
    return (
      <Suspense fallback={<MembersListSkeleton includeHeader={true} />}>
        <MembersContent
          initialMembers={initialMembers}
          initialCount={count}
          initialStats={stats}
        />
      </Suspense>
    );
  } catch (error) {
    console.error('Error fetching initial member data:', error);

    // Return the component without initial data
    // The client-side will handle fetching the data
    return (
      <Suspense fallback={<MembersListSkeleton includeHeader={true} />}>
        <MembersContent />
      </Suspense>
    );
  }
}

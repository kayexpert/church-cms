import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/groups/[id]/members
 * Get all members in a group
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Get the group ID from the URL params
    // In NextJS App Router, we need to await params to ensure they're properly resolved
    const { id } = await context.params;
    const groupId = id;

    console.log(`Get members for group ${groupId} endpoint called`);

    if (!groupId) {
      return NextResponse.json({
        success: false,
        error: 'Group ID is required'
      }, { status: 400 });
    }

    // Create a Supabase client with service role for more permissions
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // First, check if the group exists
    const { data: group, error: groupError } = await supabaseAdmin
      .from('covenant_families')
      .select('id, name')
      .eq('id', groupId)
      .single();

    if (groupError) {
      console.error(`Error checking if group ${groupId} exists:`, groupError);
      return NextResponse.json({
        success: false,
        error: 'Failed to check if group exists',
        details: groupError.message
      }, { status: 500 });
    }

    if (!group) {
      console.error(`Group ${groupId} not found`);
      return NextResponse.json({
        success: false,
        error: 'Group not found',
        details: `Group with ID ${groupId} does not exist`
      }, { status: 404 });
    }

    // Let's examine the structure of the members table first
    console.log('Examining the structure of the members table...');

    // First, let's get a sample member to see its structure
    const { data: sampleMembers, error: sampleError } = await supabaseAdmin
      .from('members')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('Error getting sample member:', sampleError);
      return NextResponse.json({
        success: false,
        error: 'Failed to get sample member',
        details: sampleError.message
      }, { status: 500 });
    }

    if (sampleMembers && sampleMembers.length > 0) {
      console.log('Sample member structure:', Object.keys(sampleMembers[0]).join(', '));
    } else {
      console.log('No members found in the database');
    }

    // Let's also check the structure of the covenant_families table
    const { data: sampleGroups, error: sampleGroupError } = await supabaseAdmin
      .from('covenant_families')
      .select('*')
      .limit(1);

    if (sampleGroupError) {
      console.error('Error getting sample group:', sampleGroupError);
      return NextResponse.json({
        success: false,
        error: 'Failed to get sample group',
        details: sampleGroupError.message
      }, { status: 500 });
    }

    if (sampleGroups && sampleGroups.length > 0) {
      console.log('Sample group structure:', Object.keys(sampleGroups[0]).join(', '));
    } else {
      console.log('No groups found in the database');
    }

    // Get all members from the members table
    const { data: allMembers, error: allMembersError } = await supabaseAdmin
      .from('members')
      .select('id, first_name, last_name, primary_phone_number, status, covenant_family_id')
      .eq('status', 'active') // Only get active members
      .not('primary_phone_number', 'is', null) // Only get members with phone numbers
      .order('first_name');

    if (allMembersError) {
      console.error('Error getting all members:', allMembersError);
      return NextResponse.json({
        success: false,
        error: 'Failed to get members',
        details: allMembersError.message
      }, { status: 500 });
    }

    console.log(`Retrieved ${allMembers?.length || 0} total members from the database`);

    // Filter members by covenant_family_id
    let members = allMembers?.filter(m => m.covenant_family_id === groupId) || [];

    // We don't need to check for membersError since we're using filter on allMembers

    // Log the members we found
    console.log(`Found ${members.length} members in group ${groupId}`);

    if (members.length === 0) {
      // If we didn't find any members using our filter, let's try a different approach
      // Maybe there's a junction table that connects members to groups
      console.log('No members found with direct group association, checking for junction tables...');

      // Let's try to find tables that might be junction tables
      // Use our new API endpoint to get tables
      const tablesResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/database/tables`);

      if (!tablesResponse.ok) {
        console.error('Error getting tables from API:', tablesResponse.statusText);
      } else {
        const tablesData = await tablesResponse.json();

        if (tablesData.success && tablesData.tables) {
          const tables = tablesData.tables;
          console.log('Available tables:', tables);

          // Look for tables that might be junction tables
          const possibleJunctionTables = tables.filter((table: string) =>
            table.includes('member') ||
            table.includes('group') ||
            table.includes('covenant') ||
            table.includes('family')
          );

          console.log('Possible junction tables:', possibleJunctionTables);

          // For demonstration, let's just return an empty list with a message
          return NextResponse.json({
            success: true,
            data: [],
            group: {
              id: group.id,
              name: group.name
            },
            stats: {
              totalMembers: 0,
              activeMembers: 0,
              membersWithPhone: 0
            },
            message: 'No members found in this group. This could be because the group is empty or because we could not determine how members are associated with groups.'
          });
        }
      }

      // If we still couldn't find any members, return a 404
      return NextResponse.json({
        success: false,
        error: 'No members found',
        details: `Group with ID ${groupId} has no members`
      }, { status: 404 });
    }

    // We've already filtered for active members with phone numbers in the query
    // But let's double-check to ensure data integrity
    const validMembers = members ? members.filter(m =>
      m &&
      m.status === 'active' &&
      m.primary_phone_number &&
      m.primary_phone_number.trim() !== ''
    ) : [];

    return NextResponse.json({
      success: true,
      data: validMembers,
      group: {
        id: group.id,
        name: group.name
      },
      stats: {
        totalMembers: members ? members.length : 0,
        validMembers: validMembers.length,
        percentValid: members && members.length > 0
          ? Math.round((validMembers.length / members.length) * 100)
          : 0
      }
    });
  } catch (error) {
    console.error('Error in get group members endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get group members',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

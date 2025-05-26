import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/test/check-member-birthdays
 * Test endpoint to check member birthday data and debug the birthday logic
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Checking member birthday data...');

    // Get today's date
    const today = new Date();
    const targetMonthDay = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

    console.log(`Looking for members with birthdays on: ${targetMonthDay}`);

    // First, get ALL members to see what we have
    const { data: allMembers, error: allMembersError } = await supabaseAdmin
      .from('members')
      .select('id, first_name, last_name, date_of_birth, status, primary_phone_number')
      .order('first_name');

    if (allMembersError) {
      console.error('Error fetching all members:', allMembersError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch members',
        details: allMembersError
      }, { status: 500 });
    }

    console.log(`Total members in database: ${allMembers?.length || 0}`);

    // Filter active members with birth dates
    const activeMembers = allMembers?.filter(member =>
      member.status === 'active' && member.date_of_birth
    ) || [];

    console.log(`Active members with birth dates: ${activeMembers.length}`);

    // Check for members with birthdays today
    const membersWithBirthdayToday = activeMembers.filter(member => {
      if (!member.date_of_birth) return false;

      // Parse date safely to avoid timezone issues
      const dateStr = member.date_of_birth;
      let birthDate: Date;

      if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // For YYYY-MM-DD format, create date in local timezone
        const [year, month, day] = dateStr.split('-').map(Number);
        birthDate = new Date(year, month - 1, day); // month is 0-indexed
      } else {
        // For other formats, use regular Date constructor
        birthDate = new Date(dateStr);
      }

      const birthMonthDay = `${(birthDate.getMonth() + 1).toString().padStart(2, '0')}-${birthDate.getDate().toString().padStart(2, '0')}`;

      console.log(`Member ${member.first_name} ${member.last_name}: birth date = ${dateStr}, parsed date = ${birthDate.toISOString()}, formatted = ${birthMonthDay}, matches today = ${birthMonthDay === targetMonthDay}`);

      return birthMonthDay === targetMonthDay;
    });

    console.log(`Members with birthdays today: ${membersWithBirthdayToday.length}`);

    // Also check for Kelvin Obodai specifically
    const kelvinMember = allMembers?.find(member =>
      member.first_name?.toLowerCase().includes('kelvin') ||
      member.last_name?.toLowerCase().includes('obodai')
    );

    let kelvinDetails = null;
    if (kelvinMember) {
      let birthDate: Date | null = null;
      let birthMonthDay: string | null = null;

      if (kelvinMember.date_of_birth) {
        const dateStr = kelvinMember.date_of_birth;
        if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // For YYYY-MM-DD format, create date in local timezone
          const [year, month, day] = dateStr.split('-').map(Number);
          birthDate = new Date(year, month - 1, day); // month is 0-indexed
        } else {
          // For other formats, use regular Date constructor
          birthDate = new Date(dateStr);
        }
        birthMonthDay = `${(birthDate.getMonth() + 1).toString().padStart(2, '0')}-${birthDate.getDate().toString().padStart(2, '0')}`;
      }

      kelvinDetails = {
        id: kelvinMember.id,
        name: `${kelvinMember.first_name} ${kelvinMember.last_name}`,
        date_of_birth: kelvinMember.date_of_birth,
        formatted_birth_date: birthMonthDay,
        status: kelvinMember.status,
        phone: kelvinMember.primary_phone_number,
        matches_today: birthMonthDay === targetMonthDay
      };

      console.log('Kelvin Obodai details:', kelvinDetails);
    } else {
      console.log('Kelvin Obodai not found in database');
    }

    return NextResponse.json({
      success: true,
      targetDate: targetMonthDay,
      totalMembers: allMembers?.length || 0,
      activeMembersWithBirthDates: activeMembers.length,
      membersWithBirthdayToday: membersWithBirthdayToday.length,
      kelvinDetails,
      birthdayMembers: membersWithBirthdayToday.map(member => ({
        id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        date_of_birth: member.date_of_birth,
        status: member.status,
        phone: member.primary_phone_number
      })),
      // Include some sample members for debugging
      sampleMembers: allMembers?.slice(0, 5).map(member => ({
        id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        date_of_birth: member.date_of_birth,
        status: member.status,
        phone: member.primary_phone_number
      })) || []
    });

  } catch (error) {
    console.error('Error checking member birthdays:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check member birthdays',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

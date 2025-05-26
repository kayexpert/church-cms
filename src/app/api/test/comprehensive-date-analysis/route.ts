import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseDate, toISODateString, formatDate, formatDatabaseDate } from '@/lib/date-utils';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/test/comprehensive-date-analysis
 * Comprehensive analysis of date handling across the entire application
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Starting comprehensive date analysis...');

    const analysis = {
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      issues: [] as string[],
      warnings: [] as string[],
      summary: {} as any,
      testResults: {} as any
    };

    // Test 1: Member date_of_birth analysis
    console.log('Analyzing member date_of_birth fields...');
    const { data: members, error: membersError } = await supabaseAdmin
      .from('members')
      .select('id, first_name, last_name, date_of_birth, membership_date, baptism_date')
      .limit(10);

    if (membersError) {
      analysis.issues.push(`Failed to fetch members: ${membersError.message}`);
    } else {
      const memberDateAnalysis = {
        totalMembers: members?.length || 0,
        membersWithBirthDates: 0,
        membersWithMembershipDates: 0,
        membersWithBaptismDates: 0,
        dateFormatIssues: [] as any[],
        timezoneTestResults: [] as any[]
      };

      members?.forEach(member => {
        if (member.date_of_birth) {
          memberDateAnalysis.membersWithBirthDates++;
          
          // Test timezone consistency
          const originalDate = member.date_of_birth;
          const parsedDate = parseDate(originalDate);
          const formattedDate = toISODateString(parsedDate);
          const displayDate = formatDate(originalDate);
          const dbFormattedDate = formatDatabaseDate(originalDate);

          const testResult = {
            memberId: member.id,
            memberName: `${member.first_name} ${member.last_name}`,
            originalDate,
            parsedDate: parsedDate?.toISOString(),
            formattedDate,
            displayDate,
            dbFormattedDate,
            isConsistent: originalDate === formattedDate
          };

          memberDateAnalysis.timezoneTestResults.push(testResult);

          if (originalDate !== formattedDate) {
            memberDateAnalysis.dateFormatIssues.push({
              memberId: member.id,
              memberName: `${member.first_name} ${member.last_name}`,
              issue: 'Date format inconsistency',
              original: originalDate,
              formatted: formattedDate
            });
          }
        }

        if (member.membership_date) memberDateAnalysis.membersWithMembershipDates++;
        if (member.baptism_date) memberDateAnalysis.membersWithBaptismDates++;
      });

      analysis.testResults.memberDates = memberDateAnalysis;
    }

    // Test 2: Finance date analysis
    console.log('Analyzing finance date fields...');
    try {
      const { data: incomeEntries, error: incomeError } = await supabaseAdmin
        .from('income_entries')
        .select('id, date, amount, description')
        .limit(5);

      const { data: expenditureEntries, error: expenditureError } = await supabaseAdmin
        .from('expenditure_entries')
        .select('id, date, amount, description')
        .limit(5);

      const financeAnalysis = {
        incomeEntries: incomeEntries?.length || 0,
        expenditureEntries: expenditureEntries?.length || 0,
        dateConsistencyTests: [] as any[]
      };

      // Test income date consistency
      incomeEntries?.forEach(entry => {
        const originalDate = entry.date;
        const parsedDate = parseDate(originalDate);
        const formattedDate = toISODateString(parsedDate);

        financeAnalysis.dateConsistencyTests.push({
          type: 'income',
          id: entry.id,
          originalDate,
          parsedDate: parsedDate?.toISOString(),
          formattedDate,
          isConsistent: originalDate === formattedDate
        });
      });

      // Test expenditure date consistency
      expenditureEntries?.forEach(entry => {
        const originalDate = entry.date;
        const parsedDate = parseDate(originalDate);
        const formattedDate = toISODateString(parsedDate);

        financeAnalysis.dateConsistencyTests.push({
          type: 'expenditure',
          id: entry.id,
          originalDate,
          parsedDate: parsedDate?.toISOString(),
          formattedDate,
          isConsistent: originalDate === formattedDate
        });
      });

      analysis.testResults.financeDates = financeAnalysis;
    } catch (error) {
      analysis.warnings.push(`Finance date analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test 3: Event date analysis
    console.log('Analyzing event date fields...');
    try {
      const { data: events, error: eventsError } = await supabaseAdmin
        .from('events')
        .select('id, title, date, end_date')
        .limit(5);

      const eventAnalysis = {
        totalEvents: events?.length || 0,
        dateConsistencyTests: [] as any[]
      };

      events?.forEach(event => {
        const originalDate = event.date;
        const originalEndDate = event.end_date;
        const parsedDate = parseDate(originalDate);
        const parsedEndDate = parseDate(originalEndDate);
        const formattedDate = toISODateString(parsedDate);
        const formattedEndDate = toISODateString(parsedEndDate);

        eventAnalysis.dateConsistencyTests.push({
          id: event.id,
          title: event.title,
          originalDate,
          originalEndDate,
          formattedDate,
          formattedEndDate,
          isDateConsistent: originalDate === formattedDate,
          isEndDateConsistent: !originalEndDate || originalEndDate === formattedEndDate
        });
      });

      analysis.testResults.eventDates = eventAnalysis;
    } catch (error) {
      analysis.warnings.push(`Event date analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test 4: Message scheduling date analysis
    console.log('Analyzing message scheduling dates...');
    try {
      const { data: messages, error: messagesError } = await supabaseAdmin
        .from('messages')
        .select('id, name, schedule_time, end_date, created_at')
        .limit(5);

      const messageAnalysis = {
        totalMessages: messages?.length || 0,
        dateConsistencyTests: [] as any[]
      };

      messages?.forEach(message => {
        const scheduleTime = message.schedule_time;
        const endDate = message.end_date;
        const createdAt = message.created_at;

        messageAnalysis.dateConsistencyTests.push({
          id: message.id,
          name: message.name,
          scheduleTime,
          endDate,
          createdAt,
          scheduleTimeType: typeof scheduleTime,
          endDateType: typeof endDate,
          createdAtType: typeof createdAt
        });
      });

      analysis.testResults.messageDates = messageAnalysis;
    } catch (error) {
      analysis.warnings.push(`Message date analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test 5: Date utility function tests
    console.log('Testing date utility functions...');
    const testDates = [
      '2025-05-26',
      '1977-05-26',
      '2004-05-15',
      '1996-05-14'
    ];

    const utilityTests = testDates.map(dateStr => {
      const parsedDate = parseDate(dateStr);
      const formattedDate = toISODateString(parsedDate);
      const displayDate = formatDate(dateStr);
      const dbFormattedDate = formatDatabaseDate(dateStr);

      return {
        input: dateStr,
        parsedDate: parsedDate?.toISOString(),
        formattedDate,
        displayDate,
        dbFormattedDate,
        isConsistent: dateStr === formattedDate,
        parsedCorrectly: parsedDate !== undefined
      };
    });

    analysis.testResults.utilityFunctions = utilityTests;

    // Generate summary
    const totalIssues = analysis.issues.length;
    const totalWarnings = analysis.warnings.length;
    const memberDateIssues = analysis.testResults.memberDates?.dateFormatIssues?.length || 0;

    analysis.summary = {
      totalIssues,
      totalWarnings,
      memberDateIssues,
      overallStatus: totalIssues === 0 && memberDateIssues === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION',
      recommendations: []
    };

    if (memberDateIssues > 0) {
      analysis.summary.recommendations.push('Fix member date format inconsistencies');
    }

    if (totalIssues > 0) {
      analysis.summary.recommendations.push('Address database access issues');
    }

    console.log('Date analysis completed');

    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Error in comprehensive date analysis:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform comprehensive date analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

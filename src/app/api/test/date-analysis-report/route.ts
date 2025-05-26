import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/test/date-analysis-report
 * Get a formatted report of the date analysis
 */
export async function GET(request: NextRequest) {
  try {
    // Call the comprehensive analysis endpoint
    const baseUrl = new URL(request.url).origin;
    const response = await fetch(`${baseUrl}/api/test/comprehensive-date-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.analysis;

    // Generate a formatted report
    const report = {
      title: "Comprehensive Date Analysis Report",
      timestamp: analysis.timestamp,
      timezone: analysis.timezone,
      overallStatus: analysis.summary.overallStatus,
      
      summary: {
        totalIssues: analysis.summary.totalIssues,
        totalWarnings: analysis.summary.totalWarnings,
        memberDateIssues: analysis.summary.memberDateIssues,
        recommendations: analysis.summary.recommendations
      },

      memberAnalysis: {
        totalMembers: analysis.testResults.memberDates?.totalMembers || 0,
        membersWithBirthDates: analysis.testResults.memberDates?.membersWithBirthDates || 0,
        membersWithMembershipDates: analysis.testResults.memberDates?.membersWithMembershipDates || 0,
        membersWithBaptismDates: analysis.testResults.memberDates?.membersWithBaptismDates || 0,
        dateFormatIssues: analysis.testResults.memberDates?.dateFormatIssues || [],
        timezoneTestResults: analysis.testResults.memberDates?.timezoneTestResults || []
      },

      financeAnalysis: analysis.testResults.financeDates || null,
      eventAnalysis: analysis.testResults.eventDates || null,
      messageAnalysis: analysis.testResults.messageDates || null,
      utilityFunctionTests: analysis.testResults.utilityFunctions || [],

      issues: analysis.issues,
      warnings: analysis.warnings,

      detailedFindings: {
        dateConsistencyIssues: [],
        timezoneIssues: [],
        formatIssues: [],
        recommendations: []
      }
    };

    // Analyze the results for detailed findings
    if (analysis.testResults.memberDates?.timezoneTestResults) {
      analysis.testResults.memberDates.timezoneTestResults.forEach((result: any) => {
        if (!result.isConsistent) {
          report.detailedFindings.dateConsistencyIssues.push({
            type: 'member_date_of_birth',
            memberId: result.memberId,
            memberName: result.memberName,
            originalDate: result.originalDate,
            formattedDate: result.formattedDate,
            issue: 'Date format inconsistency between database and application'
          });
        }
      });
    }

    // Check utility function tests
    if (analysis.testResults.utilityFunctions) {
      analysis.testResults.utilityFunctions.forEach((test: any) => {
        if (!test.isConsistent) {
          report.detailedFindings.formatIssues.push({
            type: 'utility_function',
            input: test.input,
            formattedDate: test.formattedDate,
            issue: 'Date utility function not returning consistent format'
          });
        }
      });
    }

    // Generate recommendations based on findings
    if (report.detailedFindings.dateConsistencyIssues.length > 0) {
      report.detailedFindings.recommendations.push({
        priority: 'HIGH',
        category: 'Date Consistency',
        description: 'Fix date format inconsistencies in member records',
        action: 'Update date parsing logic to ensure consistent timezone handling'
      });
    }

    if (report.detailedFindings.formatIssues.length > 0) {
      report.detailedFindings.recommendations.push({
        priority: 'MEDIUM',
        category: 'Utility Functions',
        description: 'Standardize date utility functions',
        action: 'Review and update date utility functions for consistent behavior'
      });
    }

    // Add general recommendations
    report.detailedFindings.recommendations.push({
      priority: 'LOW',
      category: 'Best Practices',
      description: 'Implement timezone-aware date handling',
      action: 'Use timezone-safe date parsing throughout the application'
    });

    return NextResponse.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Error generating date analysis report:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate date analysis report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

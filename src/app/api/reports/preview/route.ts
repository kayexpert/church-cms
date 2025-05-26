import { NextRequest, NextResponse } from "next/server";
import {
  getActiveMembersReport,
  getInactiveMembersReport,
  getAttendanceReport,
  getAbsenteeismReport,
  getIncomeReport,
  getExpenditureReport,
  getLiabilitiesReport,
  getAssetsReport,
  getAnnualFinancialReport,
  type ReportFilters
} from "@/services/reports-service";

export interface ReportPreviewFilters extends ReportFilters {
  year?: number;
  page?: number;
  limit?: number;
}

/**
 * POST /api/reports/preview
 * Generate preview data for reports
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportType, filters } = body;

    if (!reportType) {
      return NextResponse.json(
        { success: false, error: "Report type is required" },
        { status: 400 }
      );
    }

    console.log(`Generating preview for report type: ${reportType}`, filters);

    // Extract pagination parameters
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    let result;
    let reportData;

    switch (reportType) {
      case 'active-members':
        result = await getActiveMembersReport(filters);
        if (result.error) throw result.error;
        const totalActiveMembers = result.data?.length || 0;
        const paginatedActiveData = result.data?.slice(offset, offset + limit) || [];
        reportData = {
          reportType: 'Active Members Report',
          totalRecords: totalActiveMembers,
          summary: `List of all active members in the church${filters.startDate ? ` (filtered by join date)` : ''}`,
          data: paginatedActiveData,
          columns: ['Name', 'Email', 'Phone', 'Join Date', 'Departments'],
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalActiveMembers / limit),
            itemsPerPage: limit,
            hasNextPage: offset + limit < totalActiveMembers,
            hasPrevPage: page > 1
          }
        };
        break;

      case 'inactive-members':
        result = await getInactiveMembersReport(filters);
        if (result.error) throw result.error;
        const totalInactiveMembers = result.data?.length || 0;
        const paginatedInactiveData = result.data?.slice(offset, offset + limit) || [];
        reportData = {
          reportType: 'Inactive Members Report',
          totalRecords: totalInactiveMembers,
          summary: `List of all inactive members in the church${filters.startDate ? ` (filtered by join date)` : ''}`,
          data: paginatedInactiveData,
          columns: ['Name', 'Email', 'Phone', 'Join Date', 'Departments'],
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalInactiveMembers / limit),
            itemsPerPage: limit,
            hasNextPage: offset + limit < totalInactiveMembers,
            hasPrevPage: page > 1
          }
        };
        break;

      case 'attendance-summary':
        result = await getAttendanceReport(filters);
        if (result.error) throw result.error;
        const totalAttendanceRecords = result.data?.length || 0;
        const paginatedAttendanceData = result.data?.slice(offset, offset + limit) || [];
        reportData = {
          reportType: 'Attendance Summary',
          totalRecords: totalAttendanceRecords,
          summary: `Attendance summary for the selected period`,
          data: paginatedAttendanceData,
          columns: ['Member', 'Total Attendance', 'Attendance Rate', 'Last Attended'],
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalAttendanceRecords / limit),
            itemsPerPage: limit,
            hasNextPage: offset + limit < totalAttendanceRecords,
            hasPrevPage: page > 1
          }
        };
        break;

      case 'absenteeism-report':
        result = await getAbsenteeismReport(filters);
        if (result.error) throw result.error;
        const totalAbsenteeismRecords = result.data?.length || 0;
        const paginatedAbsenteeismData = result.data?.slice(offset, offset + limit) || [];
        reportData = {
          reportType: 'Absenteeism Report',
          totalRecords: totalAbsenteeismRecords,
          summary: `Members with low attendance rates`,
          data: paginatedAbsenteeismData,
          columns: ['Member', 'Total Attendance', 'Attendance Rate', 'Last Attended'],
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalAbsenteeismRecords / limit),
            itemsPerPage: limit,
            hasNextPage: offset + limit < totalAbsenteeismRecords,
            hasPrevPage: page > 1
          }
        };
        break;

      case 'income-report':
        result = await getIncomeReport(filters);
        if (result.error) throw result.error;
        const totalIncomeRecords = result.data?.length || 0;
        const paginatedIncomeData = result.data?.slice(offset, offset + limit) || [];
        const totalIncome = result.data?.reduce((sum, item) => sum + item.amount, 0) || 0;
        reportData = {
          reportType: 'Income Report',
          totalRecords: totalIncomeRecords,
          summary: `Total income: $${totalIncome.toLocaleString()}`,
          data: paginatedIncomeData,
          columns: ['Date', 'Description', 'Category', 'Amount'],
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalIncomeRecords / limit),
            itemsPerPage: limit,
            hasNextPage: offset + limit < totalIncomeRecords,
            hasPrevPage: page > 1
          }
        };
        break;

      case 'expenditure-report':
        result = await getExpenditureReport(filters);
        if (result.error) throw result.error;
        const totalExpenditureRecords = result.data?.length || 0;
        const paginatedExpenditureData = result.data?.slice(offset, offset + limit) || [];
        const totalExpenditure = result.data?.reduce((sum, item) => sum + item.amount, 0) || 0;
        reportData = {
          reportType: 'Expenditure Report',
          totalRecords: totalExpenditureRecords,
          summary: `Total expenditure: $${totalExpenditure.toLocaleString()}`,
          data: paginatedExpenditureData,
          columns: ['Date', 'Description', 'Category', 'Amount'],
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalExpenditureRecords / limit),
            itemsPerPage: limit,
            hasNextPage: offset + limit < totalExpenditureRecords,
            hasPrevPage: page > 1
          }
        };
        break;

      case 'liabilities-report':
        result = await getLiabilitiesReport(filters);
        if (result.error) throw result.error;
        const totalLiabilitiesRecords = result.data?.length || 0;
        const paginatedLiabilitiesData = result.data?.slice(offset, offset + limit) || [];
        const totalLiabilities = result.data?.reduce((sum, item) => sum + item.amount_remaining, 0) || 0;
        reportData = {
          reportType: 'Liabilities Report',
          totalRecords: totalLiabilitiesRecords,
          summary: `Total outstanding liabilities: $${totalLiabilities.toLocaleString()}`,
          data: paginatedLiabilitiesData,
          columns: ['Date', 'Creditor', 'Category', 'Total Amount', 'Amount Remaining', 'Status'],
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalLiabilitiesRecords / limit),
            itemsPerPage: limit,
            hasNextPage: offset + limit < totalLiabilitiesRecords,
            hasPrevPage: page > 1
          }
        };
        break;

      case 'assets-report':
        result = await getAssetsReport(filters);
        if (result.error) throw result.error;
        const totalAssetsRecords = result.data?.length || 0;
        const paginatedAssetsData = result.data?.slice(offset, offset + limit) || [];
        const totalAssets = result.data?.reduce((sum, item) => sum + item.amount, 0) || 0;
        reportData = {
          reportType: 'Assets Report',
          totalRecords: totalAssetsRecords,
          summary: `Total assets value: $${totalAssets.toLocaleString()}`,
          data: paginatedAssetsData,
          columns: ['Date', 'Description', 'Category', 'Amount'],
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalAssetsRecords / limit),
            itemsPerPage: limit,
            hasNextPage: offset + limit < totalAssetsRecords,
            hasPrevPage: page > 1
          }
        };
        break;

      case 'annual-financial-report':
        if (!filters.year) {
          return NextResponse.json(
            { success: false, error: "Year is required for annual financial report" },
            { status: 400 }
          );
        }
        result = await getAnnualFinancialReport(filters.year);
        if (result.error) throw result.error;
        const summary = result.data?.summary;
        reportData = {
          reportType: 'Annual Financial Report',
          totalRecords: 1,
          summary: `Annual summary for ${filters.year}: Income $${summary?.totalIncome?.toLocaleString() || 0}, Expenses $${summary?.totalExpenditure?.toLocaleString() || 0}`,
          data: summary ? [summary] : [],
          columns: ['Total Income', 'Total Expenditure', 'Net Income', 'Total Assets', 'Total Liabilities']
        };
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown report type: ${reportType}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...reportData,
        filters,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating report preview:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report preview'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reports/preview
 * Get information about the preview endpoint
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    description: 'Report Preview API Endpoint',
    supportedReports: [
      'active-members',
      'inactive-members',
      'attendance-summary',
      'absenteeism-report',
      'income-report',
      'expenditure-report',
      'liabilities-report',
      'assets-report',
      'annual-financial-report'
    ],
    usage: 'POST with { reportType, filters } to generate preview data'
  });
}

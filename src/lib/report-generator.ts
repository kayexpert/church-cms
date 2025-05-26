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
import { generateTablePDF, formatDateForPDF, formatCurrencyForPDF } from "@/lib/pdf-utils";

export interface ReportGenerationFilters extends ReportFilters {
  year?: number;
}

/**
 * Generate and download a report based on type and filters
 */
export async function generateReport(
  reportType: string,
  filters: ReportGenerationFilters
): Promise<void> {
  switch (reportType) {
    case 'active-members':
      await generateActiveMembersReport(filters);
      break;
    case 'inactive-members':
      await generateInactiveMembersReport(filters);
      break;
    case 'attendance-summary':
      await generateAttendanceReport(filters);
      break;
    case 'absenteeism-report':
      await generateAbsenteeismReport(filters);
      break;
    case 'income-report':
      await generateIncomeReport(filters);
      break;
    case 'expenditure-report':
      await generateExpenditureReport(filters);
      break;
    case 'liabilities-report':
      await generateLiabilitiesReport(filters);
      break;
    case 'assets-report':
      await generateAssetsReport(filters);
      break;
    case 'annual-financial-report':
      await generateAnnualFinancialReport(filters);
      break;
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}

async function generateActiveMembersReport(filters: ReportGenerationFilters) {
  const result = await getActiveMembersReport(filters);

  if (result.error || !result.data) {
    throw new Error(result.error?.message || 'Failed to fetch active members data');
  }

  const columns = [
    { key: 'first_name', label: 'First Name', width: 40 },
    { key: 'last_name', label: 'Last Name', width: 40 },
    { key: 'email', label: 'Email', width: 60 },
    { key: 'phone', label: 'Phone', width: 40 },
    { key: 'join_date', label: 'Join Date', width: 30 },
    { key: 'departments', label: 'Departments', width: 50 }
  ];

  const data = result.data.map(member => ({
    ...member,
    join_date: member.join_date ? formatDateForPDF(member.join_date) : '',
    departments: member.departments?.join(', ') || '',
    phone: member.phone || ''
  }));

  generateTablePDF(data, columns, {
    filename: `active-members-report-${new Date().toISOString().split('T')[0]}.pdf`,
    title: 'Active Members Report',
    orientation: 'landscape'
  });
}

async function generateInactiveMembersReport(filters: ReportGenerationFilters) {
  const result = await getInactiveMembersReport(filters);

  if (result.error || !result.data) {
    throw new Error(result.error?.message || 'Failed to fetch inactive members data');
  }

  const columns = [
    { key: 'first_name', label: 'First Name', width: 40 },
    { key: 'last_name', label: 'Last Name', width: 40 },
    { key: 'email', label: 'Email', width: 60 },
    { key: 'phone', label: 'Phone', width: 40 },
    { key: 'join_date', label: 'Join Date', width: 30 },
    { key: 'departments', label: 'Departments', width: 50 }
  ];

  const data = result.data.map(member => ({
    ...member,
    join_date: member.join_date ? formatDateForPDF(member.join_date) : '',
    departments: member.departments?.join(', ') || '',
    phone: member.phone || ''
  }));

  generateTablePDF(data, columns, {
    filename: `inactive-members-report-${new Date().toISOString().split('T')[0]}.pdf`,
    title: 'Inactive Members Report',
    orientation: 'landscape'
  });
}

async function generateAttendanceReport(filters: ReportGenerationFilters) {
  const result = await getAttendanceReport(filters);

  if (result.error || !result.data) {
    throw new Error(result.error?.message || 'Failed to fetch attendance data');
  }

  const columns = [
    { key: 'member_name', label: 'Member Name', width: 60 },
    { key: 'total_events', label: 'Total Events', width: 30 },
    { key: 'attended_events', label: 'Attended', width: 30 },
    { key: 'attendance_rate', label: 'Rate (%)', width: 30 },
    { key: 'last_attendance', label: 'Last Attendance', width: 40 }
  ];

  const data = result.data.map(record => ({
    ...record,
    last_attendance: record.last_attendance ? formatDateForPDF(record.last_attendance) : 'Never'
  }));

  const dateRange = filters.startDate && filters.endDate
    ? `${formatDateForPDF(filters.startDate)} to ${formatDateForPDF(filters.endDate)}`
    : 'All Time';

  generateTablePDF(data, columns, {
    filename: `attendance-report-${new Date().toISOString().split('T')[0]}.pdf`,
    title: `Attendance Summary Report (${dateRange})`,
    orientation: 'landscape'
  });
}

async function generateAbsenteeismReport(filters: ReportGenerationFilters) {
  const result = await getAbsenteeismReport(filters);

  if (result.error || !result.data) {
    throw new Error(result.error?.message || 'Failed to fetch absenteeism data');
  }

  const columns = [
    { key: 'member_name', label: 'Member Name', width: 60 },
    { key: 'total_events', label: 'Total Events', width: 30 },
    { key: 'attended_events', label: 'Attended', width: 30 },
    { key: 'absences', label: 'Absences', width: 30 },
    { key: 'attendance_rate', label: 'Rate (%)', width: 30 },
    { key: 'last_attendance', label: 'Last Attendance', width: 40 }
  ];

  const data = result.data.map(record => ({
    ...record,
    absences: record.total_events - record.attended_events,
    last_attendance: record.last_attendance ? formatDateForPDF(record.last_attendance) : 'Never'
  }));

  const dateRange = filters.startDate && filters.endDate
    ? `${formatDateForPDF(filters.startDate)} to ${formatDateForPDF(filters.endDate)}`
    : 'All Time';

  generateTablePDF(data, columns, {
    filename: `absenteeism-report-${new Date().toISOString().split('T')[0]}.pdf`,
    title: `Absenteeism Report (${dateRange})`,
    orientation: 'landscape'
  });
}

async function generateIncomeReport(filters: ReportGenerationFilters) {
  const result = await getIncomeReport(filters);

  if (result.error || !result.data) {
    throw new Error(result.error?.message || 'Failed to fetch income data');
  }

  const columns = [
    { key: 'date', label: 'Date', width: 30 },
    { key: 'description', label: 'Description', width: 80 },
    { key: 'category_name', label: 'Category', width: 40 },
    { key: 'amount', label: 'Amount', width: 30 }
  ];

  const data = result.data.map(entry => ({
    ...entry,
    date: formatDateForPDF(entry.date),
    amount: formatCurrencyForPDF(entry.amount),
    description: entry.description || 'N/A',
    category_name: entry.category_name || 'Uncategorized'
  }));

  const dateRange = filters.startDate && filters.endDate
    ? `${formatDateForPDF(filters.startDate)} to ${formatDateForPDF(filters.endDate)}`
    : 'All Time';

  const totalAmount = result.data.reduce((sum, entry) => sum + entry.amount, 0);

  // Add summary row
  data.push({
    date: '',
    description: 'TOTAL',
    category_name: '',
    amount: formatCurrencyForPDF(totalAmount)
  });

  generateTablePDF(data, columns, {
    filename: `income-report-${new Date().toISOString().split('T')[0]}.pdf`,
    title: `Income Report (${dateRange})`,
    orientation: 'landscape'
  });
}

async function generateExpenditureReport(filters: ReportGenerationFilters) {
  const result = await getExpenditureReport(filters);

  if (result.error || !result.data) {
    throw new Error(result.error?.message || 'Failed to fetch expenditure data');
  }

  const columns = [
    { key: 'date', label: 'Date', width: 30 },
    { key: 'description', label: 'Description', width: 80 },
    { key: 'category_name', label: 'Category', width: 40 },
    { key: 'amount', label: 'Amount', width: 30 }
  ];

  const data = result.data.map(entry => ({
    ...entry,
    date: formatDateForPDF(entry.date),
    amount: formatCurrencyForPDF(entry.amount),
    description: entry.description || 'N/A',
    category_name: entry.category_name || 'Uncategorized'
  }));

  const dateRange = filters.startDate && filters.endDate
    ? `${formatDateForPDF(filters.startDate)} to ${formatDateForPDF(filters.endDate)}`
    : 'All Time';

  const totalAmount = result.data.reduce((sum, entry) => sum + entry.amount, 0);

  // Add summary row
  data.push({
    date: '',
    description: 'TOTAL',
    category_name: '',
    amount: formatCurrencyForPDF(totalAmount)
  });

  generateTablePDF(data, columns, {
    filename: `expenditure-report-${new Date().toISOString().split('T')[0]}.pdf`,
    title: `Expenditure Report (${dateRange})`,
    orientation: 'landscape'
  });
}

async function generateLiabilitiesReport(filters: ReportGenerationFilters) {
  const result = await getLiabilitiesReport(filters);

  if (result.error || !result.data) {
    throw new Error(result.error?.message || 'Failed to fetch liabilities data');
  }

  const columns = [
    { key: 'date', label: 'Date', width: 25 },
    { key: 'creditor_name', label: 'Creditor', width: 40 },
    { key: 'category_name', label: 'Category', width: 30 },
    { key: 'total_amount', label: 'Total Amount', width: 25 },
    { key: 'amount_remaining', label: 'Amount Remaining', width: 25 },
    { key: 'status', label: 'Status', width: 20 }
  ];

  const data = result.data.map(entry => ({
    date: formatDateForPDF(entry.date),
    creditor_name: entry.creditor_name || 'Unknown Creditor',
    category_name: entry.category_name || 'Uncategorized',
    total_amount: formatCurrencyForPDF(entry.total_amount),
    amount_remaining: formatCurrencyForPDF(entry.amount_remaining),
    status: entry.status.charAt(0).toUpperCase() + entry.status.slice(1)
  }));

  const totalOutstanding = result.data.reduce((sum, entry) => sum + entry.amount_remaining, 0);

  // Add summary row
  data.push({
    date: '',
    creditor_name: 'TOTAL OUTSTANDING',
    category_name: '',
    total_amount: '',
    amount_remaining: formatCurrencyForPDF(totalOutstanding),
    status: ''
  });

  generateTablePDF(data, columns, {
    filename: `liabilities-report-${new Date().toISOString().split('T')[0]}.pdf`,
    title: 'Liabilities Report',
    orientation: 'landscape'
  });
}

async function generateAssetsReport(filters: ReportGenerationFilters) {
  const result = await getAssetsReport(filters);

  if (result.error || !result.data) {
    throw new Error(result.error?.message || 'Failed to fetch assets data');
  }

  const columns = [
    { key: 'date', label: 'Acquisition Date', width: 30 },
    { key: 'description', label: 'Asset Description', width: 80 },
    { key: 'category_name', label: 'Type', width: 40 },
    { key: 'amount', label: 'Value', width: 30 }
  ];

  const data = result.data.map(entry => ({
    ...entry,
    date: formatDateForPDF(entry.date),
    amount: formatCurrencyForPDF(entry.amount),
    description: entry.description || 'N/A',
    category_name: entry.category_name || 'Asset'
  }));

  const totalValue = result.data.reduce((sum, entry) => sum + entry.amount, 0);

  // Add summary row
  data.push({
    date: '',
    description: 'TOTAL VALUE',
    category_name: '',
    amount: formatCurrencyForPDF(totalValue)
  });

  generateTablePDF(data, columns, {
    filename: `assets-report-${new Date().toISOString().split('T')[0]}.pdf`,
    title: 'Assets Report',
    orientation: 'landscape'
  });
}

async function generateAnnualFinancialReport(filters: ReportGenerationFilters) {
  if (!filters.year) {
    throw new Error('Year is required for annual financial report');
  }

  const result = await getAnnualFinancialReport(filters.year);

  if (result.error || !result.data) {
    throw new Error(result.error?.message || 'Failed to fetch annual financial data');
  }

  const { summary } = result.data;

  // Create summary data for PDF
  const summaryData = [
    { category: 'Total Income', amount: formatCurrencyForPDF(summary.totalIncome), percentage: '100%' },
    { category: 'Total Expenditure', amount: formatCurrencyForPDF(summary.totalExpenditure), percentage: `${((summary.totalExpenditure / summary.totalIncome) * 100).toFixed(1)}%` },
    { category: 'Net Income', amount: formatCurrencyForPDF(summary.netIncome), percentage: `${((summary.netIncome / summary.totalIncome) * 100).toFixed(1)}%` },
    { category: '', amount: '', percentage: '' }, // Separator
    { category: 'Total Liabilities', amount: formatCurrencyForPDF(summary.totalLiabilities), percentage: '' },
    { category: 'Total Assets', amount: formatCurrencyForPDF(summary.totalAssets), percentage: '' },
    { category: 'Net Worth', amount: formatCurrencyForPDF(summary.totalAssets - summary.totalLiabilities), percentage: '' }
  ];

  const columns = [
    { key: 'category', label: 'Category', width: 80 },
    { key: 'amount', label: 'Amount', width: 50 },
    { key: 'percentage', label: '% of Income', width: 30 }
  ];

  generateTablePDF(summaryData, columns, {
    filename: `annual-financial-report-${filters.year}.pdf`,
    title: `Annual Financial Report - ${filters.year}`,
    orientation: 'portrait'
  });
}

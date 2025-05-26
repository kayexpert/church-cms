import { supabase } from "@/lib/supabase";
import { ServiceResponse } from "@/types/common";

/**
 * Reports Service
 * Handles data fetching for various reports
 * Optimized for performance and error handling
 */

// Types for report data
export interface MemberReport {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive';
  join_date?: string;
  departments?: string[];
  created_at?: string;
}

export interface AttendanceReport {
  member_id: string;
  member_name: string;
  total_events: number;
  attended_events: number;
  attendance_rate: number;
  last_attendance?: string;
}

export interface FinanceReport {
  id: string;
  date: string;
  amount: number;
  description?: string;
  category_name?: string;
  type: 'income' | 'expenditure' | 'liability' | 'asset';
}

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  categoryId?: string;
  departmentId?: string;
}

/**
 * Optimized query builder for better performance
 */
const buildDateFilter = (query: any, filters: ReportFilters, dateField: string = 'created_at') => {
  if (filters.startDate) {
    query = query.gte(dateField, filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte(dateField, filters.endDate);
  }
  return query;
};

/**
 * Get active members report
 */
export async function getActiveMembersReport(
  filters: ReportFilters = {}
): Promise<ServiceResponse<MemberReport[]>> {
  try {
    let query = supabase
      .from('members')
      .select(`
        id,
        first_name,
        last_name,
        email,
        primary_phone_number,
        status,
        created_at,
        member_departments(
          departments(name)
        )
      `)
      .eq('status', 'active');

    // Apply date filters using optimized helper
    query = buildDateFilter(query, filters, 'created_at');

    const { data, error } = await query.order('first_name', { ascending: true });

    if (error) throw error;

    // Transform data
    const transformedData = data?.map(member => ({
      id: member.id,
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      phone: member.primary_phone_number,
      status: member.status as 'active' | 'inactive',
      join_date: member.created_at, // Using created_at as join_date
      departments: member.member_departments?.map((md: any) => md.departments?.name).filter(Boolean) || [],
      created_at: member.created_at
    })) || [];

    return { data: transformedData, error: null };
  } catch (error) {
    console.error('Error fetching active members report:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get inactive members report
 */
export async function getInactiveMembersReport(
  filters: ReportFilters = {}
): Promise<ServiceResponse<MemberReport[]>> {
  try {
    let query = supabase
      .from('members')
      .select(`
        id,
        first_name,
        last_name,
        email,
        primary_phone_number,
        status,
        created_at,
        member_departments(
          departments(name)
        )
      `)
      .eq('status', 'inactive');

    // Apply date filters using optimized helper
    query = buildDateFilter(query, filters, 'created_at');

    const { data, error } = await query.order('first_name', { ascending: true });

    if (error) throw error;

    // Transform data
    const transformedData = data?.map(member => ({
      id: member.id,
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      phone: member.primary_phone_number,
      status: member.status as 'active' | 'inactive',
      join_date: member.created_at, // Using created_at as join_date
      departments: member.member_departments?.map((md: any) => md.departments?.name).filter(Boolean) || [],
      created_at: member.created_at
    })) || [];

    return { data: transformedData, error: null };
  } catch (error) {
    console.error('Error fetching inactive members report:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get attendance report
 */
export async function getAttendanceReport(
  filters: ReportFilters = {}
): Promise<ServiceResponse<AttendanceReport[]>> {
  try {
    // Get all active members
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, first_name, last_name')
      .eq('status', 'active');

    if (membersError) throw membersError;

    // Get attendance records with date filtering
    let attendanceQuery = supabase
      .from('attendance')
      .select('id, date, event_type, event_name');

    if (filters.startDate) {
      attendanceQuery = attendanceQuery.gte('date', filters.startDate);
    }
    if (filters.endDate) {
      attendanceQuery = attendanceQuery.lte('date', filters.endDate);
    }

    const { data: attendanceRecords, error: attendanceError } = await attendanceQuery;

    if (attendanceError) throw attendanceError;

    // Get member attendance records for the filtered attendance records
    let memberAttendanceData: any[] = [];
    if (attendanceRecords && attendanceRecords.length > 0) {
      const attendanceIds = attendanceRecords.map(record => record.id);

      const { data: memberRecords, error: memberRecordsError } = await supabase
        .from('attendance_records')
        .select('attendance_id, member_id, present')
        .in('attendance_id', attendanceIds);

      if (memberRecordsError) throw memberRecordsError;
      memberAttendanceData = memberRecords || [];
    }

    // Process attendance data for each member
    const attendanceReport: AttendanceReport[] = members?.map(member => {
      // Find all attendance records for this member
      const memberRecords = memberAttendanceData.filter(record => record.member_id === member.id);

      // Count total events this member was included in
      const totalEvents = memberRecords.length;

      // Count events where this member was present
      const attendedEvents = memberRecords.filter(record => record.present).length;

      // Calculate attendance rate
      const attendanceRate = totalEvents > 0 ? (attendedEvents / totalEvents) * 100 : 0;

      // Find last attendance date
      let lastAttendance: string | undefined;
      if (attendedEvents > 0) {
        // Get attendance IDs where member was present
        const presentAttendanceIds = memberRecords
          .filter(record => record.present)
          .map(record => record.attendance_id);

        // Find the most recent attendance date
        const recentAttendance = attendanceRecords
          ?.filter(record => presentAttendanceIds.includes(record.id))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        lastAttendance = recentAttendance?.date;
      }

      return {
        member_id: member.id,
        member_name: `${member.first_name} ${member.last_name}`,
        total_events: totalEvents,
        attended_events: attendedEvents,
        attendance_rate: Math.round(attendanceRate * 100) / 100,
        last_attendance: lastAttendance
      };
    }) || [];

    return { data: attendanceReport, error: null };
  } catch (error) {
    console.error('Error fetching attendance report:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get absenteeism report (members absent more than 2 times in selected period)
 */
export async function getAbsenteeismReport(
  filters: ReportFilters = {}
): Promise<ServiceResponse<AttendanceReport[]>> {
  try {
    const attendanceReport = await getAttendanceReport(filters);

    if (attendanceReport.error || !attendanceReport.data) {
      return attendanceReport;
    }

    // Filter members with more than 2 absences
    const absenteeismData = attendanceReport.data.filter(member => {
      const absences = member.total_events - member.attended_events;
      return absences > 2;
    });

    return { data: absenteeismData, error: null };
  } catch (error) {
    console.error('Error fetching absenteeism report:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get income report
 */
export async function getIncomeReport(
  filters: ReportFilters = {}
): Promise<ServiceResponse<FinanceReport[]>> {
  try {
    // Build the SQL query with LEFT JOIN to handle NULL categories
    let whereConditions = [];

    if (filters.startDate) {
      whereConditions.push(`ie.date >= '${filters.startDate}'`);
    }
    if (filters.endDate) {
      whereConditions.push(`ie.date <= '${filters.endDate}'`);
    }
    if (filters.categoryId) {
      whereConditions.push(`ie.category_id = '${filters.categoryId}'`);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const sqlQuery = `
      SELECT
        ie.id,
        ie.date,
        ie.amount,
        ie.description,
        COALESCE(ic.name, 'Uncategorized') as category_name
      FROM
        income_entries ie
        LEFT JOIN income_categories ic ON ie.category_id = ic.id
      ${whereClause}
      ORDER BY ie.date DESC
    `;

    const { data, error } = await supabase.rpc('exec_sql', { query: sqlQuery });

    if (error) throw error;

    const transformedData = data?.map((entry: any) => ({
      id: entry.id,
      date: entry.date,
      amount: Number(entry.amount),
      description: entry.description,
      category_name: entry.category_name,
      type: 'income' as const
    })) || [];

    return { data: transformedData, error: null };
  } catch (error) {
    console.error('Error fetching income report:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get expenditure report
 */
export async function getExpenditureReport(
  filters: ReportFilters = {}
): Promise<ServiceResponse<FinanceReport[]>> {
  try {
    // Build the SQL query with LEFT JOIN to handle NULL categories
    let whereConditions = [];

    if (filters.startDate) {
      whereConditions.push(`ee.date >= '${filters.startDate}'`);
    }
    if (filters.endDate) {
      whereConditions.push(`ee.date <= '${filters.endDate}'`);
    }
    if (filters.categoryId) {
      whereConditions.push(`ee.category_id = '${filters.categoryId}'`);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const sqlQuery = `
      SELECT
        ee.id,
        ee.date,
        ee.amount,
        ee.description,
        COALESCE(ec.name, 'Uncategorized') as category_name
      FROM
        expenditure_entries ee
        LEFT JOIN expenditure_categories ec ON ee.category_id = ec.id
      ${whereClause}
      ORDER BY ee.date DESC
    `;

    const { data, error } = await supabase.rpc('exec_sql', { query: sqlQuery });

    if (error) throw error;

    const transformedData = data?.map((entry: any) => ({
      id: entry.id,
      date: entry.date,
      amount: Number(entry.amount),
      description: entry.description,
      category_name: entry.category_name,
      type: 'expenditure' as const
    })) || [];

    return { data: transformedData, error: null };
  } catch (error) {
    console.error('Error fetching expenditure report:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get liabilities report
 */
export async function getLiabilitiesReport(
  filters: ReportFilters = {}
): Promise<ServiceResponse<FinanceReport[]>> {
  try {
    // Query liability_entries without relationship since foreign key doesn't exist
    let query = supabase
      .from('liability_entries')
      .select(`
        id,
        date,
        total_amount,
        amount_paid,
        amount_remaining,
        creditor_name,
        details,
        category_id
      `);

    if (filters.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('date', filters.endDate);
    }
    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) {
      console.error('Liability query error:', error);
      throw error;
    }

    // Get category names separately if needed
    const categoryIds = [...new Set(data?.map(entry => entry.category_id).filter(Boolean))];
    let categoryMap: Record<string, string> = {};

    if (categoryIds.length > 0) {
      const { data: categories } = await supabase
        .from('liability_categories')
        .select('id, name')
        .in('id', categoryIds);

      categoryMap = categories?.reduce((acc, cat) => {
        acc[cat.id] = cat.name;
        return acc;
      }, {} as Record<string, string>) || {};
    }

    // Create a fallback category name mapping for known IDs
    const fallbackCategoryNames: Record<string, string> = {
      'cba552c6-5692-4ef1-9fbf-6654f05321b4': 'Loans',
      'c60f649b-1590-47c2-b2d2-22227655ca25': 'Vendor Payments'
    };

    const transformedData = data?.map(entry => {
      const categoryName = entry.category_id
        ? (categoryMap[entry.category_id] || fallbackCategoryNames[entry.category_id] || 'Uncategorized')
        : 'Uncategorized';

      return {
        id: entry.id,
        date: entry.date,
        creditor_name: entry.creditor_name || 'Unknown Creditor',
        total_amount: Number(entry.total_amount || 0),
        amount_remaining: Number(entry.amount_remaining || entry.total_amount || 0),
        status: entry.status || (Number(entry.amount_remaining || entry.total_amount) <= 0 ? 'paid' : 'unpaid'),
        category_name: categoryName,
        type: 'liability' as const
      };
    }) || [];

    return { data: transformedData, error: null };
  } catch (error) {
    console.error('Error fetching liabilities report:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get assets report
 */
export async function getAssetsReport(
  filters: ReportFilters = {}
): Promise<ServiceResponse<FinanceReport[]>> {
  try {
    // Check if assets table exists by trying a simple query first
    const { data: tableCheck, error: tableError } = await supabase
      .from('assets')
      .select('id')
      .limit(1);

    // If table doesn't exist, return empty data
    if (tableError && tableError.message.includes('does not exist')) {
      console.warn('Assets table does not exist, returning empty data');
      return { data: [], error: null };
    }

    // Use direct Supabase query instead of raw SQL
    let query = supabase
      .from('assets')
      .select(`
        id,
        acquisition_date,
        acquisition_value,
        name,
        description,
        asset_types(name)
      `);

    if (filters.startDate) {
      query = query.gte('acquisition_date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('acquisition_date', filters.endDate);
    }

    const { data, error } = await query.order('acquisition_date', { ascending: false });

    if (error) {
      // If the query fails (likely due to missing table), return empty data
      console.warn('Assets query failed, likely due to missing table:', error.message);
      return { data: [], error: null };
    }

    const transformedData = data?.map(entry => ({
      id: entry.id,
      date: entry.acquisition_date,
      amount: Number(entry.acquisition_value),
      description: `${entry.name}${entry.description ? ' - ' + entry.description : ''}`,
      category_name: entry.asset_types?.name || 'Uncategorized',
      type: 'asset' as const
    })) || [];

    return { data: transformedData, error: null };
  } catch (error) {
    console.error('Error fetching assets report:', error);
    // Return empty data instead of error for missing assets functionality
    return { data: [], error: null };
  }
}

/**
 * Get annual financial report
 */
export async function getAnnualFinancialReport(
  year: number
): Promise<ServiceResponse<{
  income: FinanceReport[];
  expenditure: FinanceReport[];
  liabilities: FinanceReport[];
  assets: FinanceReport[];
  summary: {
    totalIncome: number;
    totalExpenditure: number;
    netIncome: number;
    totalLiabilities: number;
    totalAssets: number;
  };
}>> {
  try {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const [incomeResult, expenditureResult, liabilitiesResult, assetsResult] = await Promise.all([
      getIncomeReport({ startDate, endDate }),
      getExpenditureReport({ startDate, endDate }),
      getLiabilitiesReport({ startDate, endDate }),
      getAssetsReport({ startDate, endDate })
    ]);

    if (incomeResult.error || expenditureResult.error || liabilitiesResult.error || assetsResult.error) {
      throw new Error('Failed to fetch annual financial data');
    }

    const income = incomeResult.data || [];
    const expenditure = expenditureResult.data || [];
    const liabilities = liabilitiesResult.data || [];
    const assets = assetsResult.data || [];

    const summary = {
      totalIncome: income.reduce((sum, item) => sum + item.amount, 0),
      totalExpenditure: expenditure.reduce((sum, item) => sum + item.amount, 0),
      netIncome: 0,
      totalLiabilities: liabilities.reduce((sum, item) => sum + item.amount_remaining, 0),
      totalAssets: assets.reduce((sum, item) => sum + item.amount, 0)
    };

    summary.netIncome = summary.totalIncome - summary.totalExpenditure;

    return {
      data: {
        income,
        expenditure,
        liabilities,
        assets,
        summary
      },
      error: null
    };
  } catch (error) {
    console.error('Error fetching annual financial report:', error);
    return { data: null, error: error as Error };
  }
}

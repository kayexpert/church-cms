import { supabase } from "@/lib/supabase";
import { IncomeEntry, ExpenditureEntry, LiabilityEntry } from "@/types/finance";

// Types for service responses
export type ServiceResponse<T> = {
  data: T | null;
  error: Error | null;
};

// Types for pagination
export type PaginatedResponse<T> = {
  data: T[];
  count: number;
};

/**
 * Get income entries with optional filtering and pagination
 */
export async function getIncomeEntries(options: {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<ServiceResponse<PaginatedResponse<IncomeEntry>>> {
  try {
    const {
      startDate,
      endDate,
      categoryId,
      search,
      page = 1,
      pageSize = 10
    } = options;

    // Calculate pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build query
    let query = supabase
      .from("income_entries")
      .select(`
        *,
        income_categories(id, name),
        account:account_id(id, name)
      `, { count: 'exact' });

    // Apply filters
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    if (search) {
      const searchTerm = `%${search}%`;

      // Use separate or conditions
      query = query.or(
        `description.ilike.${searchTerm},date.ilike.${searchTerm}`
      );

      // Handle amount search separately
      try {
        const searchNumber = parseFloat(search);
        if (!isNaN(searchNumber)) {
          query = query.or(`amount.eq.${searchNumber}`);
        }
      } catch (e) {
        // If parsing fails, just continue with the text search
      }
    }

    // Apply pagination
    query = query.range(from, to)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    // Execute query
    const { data, error, count } = await query;

    if (error) throw error;

    // Process the data to ensure consistent types
    const processedData = data?.map(entry => {
      return {
        ...entry,
        amount: typeof entry.amount === 'string' ? parseFloat(entry.amount) : entry.amount,
      };
    }) || [];

    return {
      data: {
        data: processedData,
        count: count || 0
      },
      error: null
    };
  } catch (error) {
    console.error('Error fetching income entries:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Get expenditure entries with optional filtering and pagination
 */
export async function getExpenditureEntries(options: {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<ServiceResponse<PaginatedResponse<ExpenditureEntry>>> {
  try {
    const {
      startDate,
      endDate,
      categoryId,
      search,
      page = 1,
      pageSize = 10
    } = options;

    // Calculate pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build query
    let query = supabase
      .from("expenditure_entries")
      .select(`
        *,
        expenditure_categories(id, name),
        liability_entries(id, creditor_name),
        account:account_id(id, name)
      `, { count: 'exact' });

    // Apply filters
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    if (search) {
      const searchTerm = `%${search}%`;

      // Use separate or conditions
      query = query.or(
        `description.ilike.${searchTerm},date.ilike.${searchTerm}`
      );

      // Handle amount search separately
      try {
        const searchNumber = parseFloat(search);
        if (!isNaN(searchNumber)) {
          query = query.or(`amount.eq.${searchNumber}`);
        }
      } catch (e) {
        // If parsing fails, just continue with the text search
      }
    }

    // Apply pagination
    query = query.range(from, to)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    // Execute query
    const { data, error, count } = await query;

    if (error) throw error;

    // Process the data to ensure consistent types
    const processedData = data?.map(entry => {
      return {
        ...entry,
        amount: typeof entry.amount === 'string' ? parseFloat(entry.amount) : entry.amount,
      };
    }) || [];

    return {
      data: {
        data: processedData,
        count: count || 0
      },
      error: null
    };
  } catch (error) {
    console.error('Error fetching expenditure entries:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Get liability entries with optional filtering and pagination
 */
export async function getLiabilityEntries(options: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<ServiceResponse<PaginatedResponse<LiabilityEntry>>> {
  try {
    const {
      status,
      search,
      page = 1,
      pageSize = 10
    } = options;

    // Calculate pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build query
    let query = supabase
      .from("liability_entries")
      .select(`
        *,
        liability_categories(id, name)
      `, { count: 'exact' });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (search) {
      const searchTerm = `%${search}%`;

      // Use separate or conditions
      query = query.or(
        `creditor_name.ilike.${searchTerm},details.ilike.${searchTerm},date.ilike.${searchTerm}`
      );

      // Handle amount search separately
      try {
        const searchNumber = parseFloat(search);
        if (!isNaN(searchNumber)) {
          query = query.or(`total_amount.eq.${searchNumber}`);
        }
      } catch (e) {
        // If parsing fails, just continue with the text search
      }
    }

    // Apply pagination
    query = query.range(from, to)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    // Execute query
    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: {
        data: data || [],
        count: count || 0
      },
      error: null
    };
  } catch (error) {
    console.error('Error fetching liability entries:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
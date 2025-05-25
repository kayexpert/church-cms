/**
 * Centralized query key factory for finance-related queries
 * This ensures consistent query key structure across the application
 */

// Define the base key first
const FINANCE_BASE_KEY = ['finance'] as const;

// Export the finance keys object
export const financeKeys = {
  all: FINANCE_BASE_KEY,

  // Dashboard
  dashboard: {
    all: (timeFrame?: string) =>
      [...FINANCE_BASE_KEY, 'dashboard', timeFrame] as const,
    stats: (timeFrame?: string) =>
      [...FINANCE_BASE_KEY, 'dashboard', 'stats', timeFrame] as const,
    monthlyChart: (timeFrame?: string) =>
      [...FINANCE_BASE_KEY, 'dashboard', 'monthlyChart', timeFrame] as const,
    categoryDistribution: (timeFrame?: string) =>
      [...FINANCE_BASE_KEY, 'dashboard', 'categoryDistribution', timeFrame] as const,
    trendChart: (timeFrame?: string) =>
      [...FINANCE_BASE_KEY, 'dashboard', 'trendChart', timeFrame] as const,
  },

  // Accounts
  accounts: {
    all: [...FINANCE_BASE_KEY, 'accounts'] as const,
    lists: () => [...FINANCE_BASE_KEY, 'accounts', 'list'] as const,
    detail: (id: string) => [...FINANCE_BASE_KEY, 'accounts', 'detail', id] as const,
    balance: (id: string) => [...FINANCE_BASE_KEY, 'accounts', 'balance', id] as const,
    transactions: (accountId: string, filters?: any) =>
      [...FINANCE_BASE_KEY, 'accounts', 'transactions', accountId, filters] as const,
    transfers: (filters?: any) =>
      [...FINANCE_BASE_KEY, 'accounts', 'transfers', filters] as const,
  },

  // Income
  income: {
    all: [...FINANCE_BASE_KEY, 'income'] as const,
    lists: (filters?: any) =>
      [...FINANCE_BASE_KEY, 'income', 'list', filters] as const,
    detail: (id: string) =>
      [...FINANCE_BASE_KEY, 'income', 'detail', id] as const,
    categories: () =>
      [...FINANCE_BASE_KEY, 'income', 'categories'] as const,
    recent: () =>
      [...FINANCE_BASE_KEY, 'income', 'recent'] as const,
  },

  // Expenditure
  expenditure: {
    all: [...FINANCE_BASE_KEY, 'expenditure'] as const,
    lists: (filters?: any) =>
      [...FINANCE_BASE_KEY, 'expenditure', 'list', filters] as const,
    detail: (id: string) =>
      [...FINANCE_BASE_KEY, 'expenditure', 'detail', id] as const,
    categories: () =>
      [...FINANCE_BASE_KEY, 'expenditure', 'categories'] as const,
    recent: () =>
      [...FINANCE_BASE_KEY, 'expenditure', 'recent'] as const,
  },

  // Liabilities
  liabilities: {
    all: [...FINANCE_BASE_KEY, 'liabilities'] as const,
    lists: (filters?: any) =>
      [...FINANCE_BASE_KEY, 'liabilities', 'list', filters] as const,
    detail: (id: string) =>
      [...FINANCE_BASE_KEY, 'liabilities', 'detail', id] as const,
    categories: () =>
      [...FINANCE_BASE_KEY, 'liabilities', 'categories'] as const,
  },

  // Budgets
  budgets: {
    all: [...FINANCE_BASE_KEY, 'budgets'] as const,
    lists: () =>
      [...FINANCE_BASE_KEY, 'budgets', 'list'] as const,
    detail: (id: string) =>
      [...FINANCE_BASE_KEY, 'budgets', 'detail', id] as const,
    items: (budgetId: string) =>
      [...FINANCE_BASE_KEY, 'budgets', 'items', budgetId] as const,
  },

  // Bank Reconciliation
  reconciliation: {
    all: [...FINANCE_BASE_KEY, 'reconciliation'] as const,
    lists: () =>
      [...FINANCE_BASE_KEY, 'reconciliation', 'list'] as const,
    detail: (id: string) =>
      [...FINANCE_BASE_KEY, 'reconciliation', 'detail', id] as const,
    transactions: (accountId: string, startDate: string | null, endDate: string | null, reconciliationId: string | null) => {
      // Format dates to YYYY-MM-DD to ensure consistent cache keys
      const formattedStartDate = startDate ? startDate.split('T')[0] : null;
      const formattedEndDate = endDate ? endDate.split('T')[0] : null;
      return [...FINANCE_BASE_KEY, 'reconciliation', 'transactions', accountId, formattedStartDate, formattedEndDate, reconciliationId] as const;
    },
  },

  // Financial Data
  financialData: (timeFrame?: string) =>
    [...FINANCE_BASE_KEY, 'financialData', timeFrame] as const,
};

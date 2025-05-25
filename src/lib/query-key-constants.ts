/**
 * Query Key Constants
 *
 * This file provides constants for React Query keys to ensure consistency
 * across the application and prevent typos.
 */

// Define base keys first to avoid circular references
const FINANCE_BASE = ['finance'] as const;
const FINANCE_ACCOUNTS_BASE = [...FINANCE_BASE, 'accounts'] as const;
const FINANCE_INCOME_BASE = [...FINANCE_BASE, 'income'] as const;
const FINANCE_EXPENDITURE_BASE = [...FINANCE_BASE, 'expenditure'] as const;
const FINANCE_LIABILITIES_BASE = [...FINANCE_BASE, 'liabilities'] as const;
const FINANCE_BUDGETS_BASE = [...FINANCE_BASE, 'budgets'] as const;
const FINANCE_RECONCILIATION_BASE = [...FINANCE_BASE, 'reconciliation'] as const;

// Finance query keys
export const FINANCE_KEYS = {
  all: FINANCE_BASE,
  dashboard: (timeFrame?: string) =>
    [...FINANCE_BASE, 'dashboard', timeFrame] as const,
  accounts: {
    all: FINANCE_ACCOUNTS_BASE,
    list: () => [...FINANCE_ACCOUNTS_BASE, 'list'] as const,
    detail: (id: string) => [...FINANCE_ACCOUNTS_BASE, 'detail', id] as const,
    transactions: (id: string) => [...FINANCE_ACCOUNTS_BASE, 'transactions', id] as const,
    balance: (id: string) => [...FINANCE_ACCOUNTS_BASE, 'balance', id] as const,
  },
  income: {
    all: FINANCE_INCOME_BASE,
    list: (filters?: any) => [...FINANCE_INCOME_BASE, 'list', filters] as const,
    detail: (id: string) => [...FINANCE_INCOME_BASE, 'detail', id] as const,
    categories: () => [...FINANCE_INCOME_BASE, 'categories'] as const,
    byCategory: () => [...FINANCE_INCOME_BASE, 'byCategory'] as const,
    byMonth: () => [...FINANCE_INCOME_BASE, 'byMonth'] as const,
    recent: () => [...FINANCE_INCOME_BASE, 'recent'] as const,
  },
  expenditure: {
    all: FINANCE_EXPENDITURE_BASE,
    list: (filters?: any) => [...FINANCE_EXPENDITURE_BASE, 'list', filters] as const,
    detail: (id: string) => [...FINANCE_EXPENDITURE_BASE, 'detail', id] as const,
    categories: () => [...FINANCE_EXPENDITURE_BASE, 'categories'] as const,
    byCategory: () => [...FINANCE_EXPENDITURE_BASE, 'byCategory'] as const,
    byMonth: () => [...FINANCE_EXPENDITURE_BASE, 'byMonth'] as const,
    recent: () => [...FINANCE_EXPENDITURE_BASE, 'recent'] as const,
  },
  liabilities: {
    all: FINANCE_LIABILITIES_BASE,
    list: () => [...FINANCE_LIABILITIES_BASE, 'list'] as const,
    detail: (id: string) => [...FINANCE_LIABILITIES_BASE, 'detail', id] as const,
    categories: () => [...FINANCE_LIABILITIES_BASE, 'categories'] as const,
  },
  budgets: {
    all: FINANCE_BUDGETS_BASE,
    list: () => [...FINANCE_BUDGETS_BASE, 'list'] as const,
    detail: (id: string) => [...FINANCE_BUDGETS_BASE, 'detail', id] as const,
    items: (budgetId: string) => [...FINANCE_BUDGETS_BASE, 'items', budgetId] as const,
  },
  reconciliation: {
    all: FINANCE_RECONCILIATION_BASE,
    list: () => [...FINANCE_RECONCILIATION_BASE, 'list'] as const,
    detail: (id: string) => [...FINANCE_RECONCILIATION_BASE, 'detail', id] as const,
  },
};

// Define base keys for other modules
const MEMBER_BASE = ['members'] as const;
const EVENT_BASE = ['events'] as const;
const MESSAGING_BASE = ['messaging'] as const;
const ASSET_BASE = ['assets'] as const;
const SETTINGS_BASE = ['settings'] as const;

// Member query keys
export const MEMBER_KEYS = {
  all: MEMBER_BASE,
  list: (filters?: any) => [...MEMBER_BASE, 'list', filters] as const,
  detail: (id: string) => [...MEMBER_BASE, 'detail', id] as const,
  stats: () => [...MEMBER_BASE, 'stats'] as const,
  attendance: (memberId: string) => [...MEMBER_BASE, 'attendance', memberId] as const,
  departments: () => [...MEMBER_BASE, 'departments'] as const,
};

// Event query keys
export const EVENT_KEYS = {
  all: EVENT_BASE,
  list: (filters?: any) => [...EVENT_BASE, 'list', filters] as const,
  detail: (id: string) => [...EVENT_BASE, 'detail', id] as const,
  categories: () => [...EVENT_BASE, 'categories'] as const,
  attendance: (eventId: string) => [...EVENT_BASE, 'attendance', eventId] as const,
  upcoming: () => [...EVENT_BASE, 'upcoming'] as const,
};

// Messaging query keys
export const MESSAGING_KEYS = {
  all: MESSAGING_BASE,
  list: (filters?: any) => [...MESSAGING_BASE, 'list', filters] as const,
  detail: (id: string) => [...MESSAGING_BASE, 'detail', id] as const,
  config: () => [...MESSAGING_BASE, 'config'] as const,
  templates: () => [...MESSAGING_BASE, 'templates'] as const,
  scheduled: () => [...MESSAGING_BASE, 'scheduled'] as const,
  stats: () => [...MESSAGING_BASE, 'stats'] as const,
};

// Asset query keys
export const ASSET_KEYS = {
  all: ASSET_BASE,
  list: (filters?: any) => [...ASSET_BASE, 'list', filters] as const,
  detail: (id: string) => [...ASSET_BASE, 'detail', id] as const,
  categories: () => [...ASSET_BASE, 'categories'] as const,
  disposals: () => [...ASSET_BASE, 'disposals'] as const,
};

// Settings query keys
export const SETTINGS_KEYS = {
  all: SETTINGS_BASE,
  church: () => [...SETTINGS_BASE, 'church'] as const,
  users: () => [...SETTINGS_BASE, 'users'] as const,
  roles: () => [...SETTINGS_BASE, 'roles'] as const,
  permissions: () => [...SETTINGS_BASE, 'permissions'] as const,
  appearance: () => [...SETTINGS_BASE, 'appearance'] as const,
  notifications: () => [...SETTINGS_BASE, 'notifications'] as const,
};

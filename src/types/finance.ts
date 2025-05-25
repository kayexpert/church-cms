// Finance Types

// Income Category
export interface IncomeCategory {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// Expenditure Category
export interface ExpenditureCategory {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// Liability Category
export interface LiabilityCategory {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// Account
export interface Account {
  id: string;
  name: string;
  account_number?: string;
  bank_name?: string;
  account_type: 'cash' | 'bank' | 'mobile_money' | 'other';
  description?: string;
  is_default: boolean;
  balance?: number;
  opening_balance?: number;
  calculatedBalance?: number; // Added for real-time balance calculation
  created_at?: string;
  updated_at?: string;
}

// Income Entry
export interface IncomeEntry {
  id: string;
  date: string;
  category_id: string;
  category?: IncomeCategory;
  description?: string;
  amount: number;
  payment_method: string;
  account_id?: string;
  account?: Account;
  member_id?: string; // Reference to the member who made the payment
  member?: any; // Member object when joined
  payment_details?: any; // For storing metadata like liability references
  budget_item_id?: string; // Reference to a budget item
  reconciliation_id?: string; // Reference to a bank reconciliation
  is_reconciliation_adjustment?: boolean; // Flag for reconciliation adjustments
  created_at?: string;
  updated_at?: string;
}

// Expenditure Entry
export interface ExpenditureEntry {
  id: string;
  date: string;
  category_id: string;
  category?: ExpenditureCategory;
  department_id?: string;
  description: string;
  amount: number;
  recipient?: string;
  payment_method: string;
  account_id?: string;
  account?: Account;
  liability_payment: boolean;
  liability_id?: string;
  budget_item_id?: string;
  reconciliation_id?: string; // Reference to a bank reconciliation
  is_reconciliation_adjustment?: boolean; // Flag for reconciliation adjustments
  created_at?: string;
  updated_at?: string;
}

// Liability Entry
export interface LiabilityEntry {
  id: string;
  date: string;
  category_id: string;
  category?: LiabilityCategory;
  creditor_name: string;
  details?: string;
  total_amount: number;
  amount_paid: number;
  amount_remaining: number;
  due_date?: string;
  status: 'unpaid' | 'partial' | 'paid';
  last_payment_date?: string;
  is_loan: boolean;
  created_at?: string;
  updated_at?: string;
}

// Budget
export interface Budget {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

// Budget Item
export interface BudgetItem {
  id: string;
  budget_id: string;
  category_id: string;
  category_type: 'income' | 'expenditure';
  description?: string;
  planned_amount: number;
  actual_amount: number;
  variance: number;
  account_id?: string;
  account?: Account;
  created_at?: string;
  updated_at?: string;
}

// Bank Reconciliation
export interface BankReconciliation {
  id: string;
  account_id: string;
  account?: Account;
  start_date: string;
  end_date: string;
  bank_balance: number;
  book_balance: number;
  difference: number;
  status: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Reconciliation Item
export interface ReconciliationItem {
  id: string;
  reconciliation_id: string;
  transaction_type: 'income' | 'expenditure';
  transaction_id: string;
  amount: number;
  date: string;
  is_cleared: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Financial Summary
export interface FinancialSummary {
  totalIncome: number;
  totalExpenditure: number;
  netCash: number;
  totalLiabilities: number;
  categories: {
    income: Record<string, number>;
    expenditure: Record<string, number>;
  };
}

// Form Values
export interface IncomeFormValues {
  date: string;
  category_id: string;
  description?: string;
  amount: string;
  payment_method: string;
  account_id?: string;
  member_id?: string;
}

export interface ExpenditureFormValues {
  date: string;
  category_id: string;
  department_id?: string;
  description: string;
  amount: string;
  recipient?: string;
  payment_method: string;
  account_id?: string;
  liability_payment: boolean;
  liability_id?: string;
}

export interface LiabilityFormValues {
  date: string;
  category_id: string;
  creditor_name: string;
  details?: string;
  total_amount: string;
  amount_paid: string;
  due_date?: string;
  is_loan: boolean;
  payment_method?: string;
  account_id?: string;
}

export interface BudgetFormValues {
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  total_amount: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
}

export interface BudgetItemFormValues {
  category_id: string;
  category_type: 'income' | 'expenditure';
  description?: string;
  amount: string;
  actual_amount?: string;
  account_id?: string;
}

export interface ReconciliationFormValues {
  account_id: string;
  start_date: string;
  end_date: string;
  bank_balance: string;
  notes?: string;
}

// Account Transfer
export interface AccountTransfer {
  id: string;
  date: string;
  source_account_id: string;
  source_account?: Account;
  destination_account_id: string;
  destination_account?: Account;
  amount: number;
  description?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// Account Transfer Form Values
export interface AccountTransferFormValues {
  date: string;
  source_account_id: string;
  destination_account_id: string;
  amount: string;
  description?: string;
}

// Account Transaction (for displaying in account history)
export interface AccountTransaction {
  id: string;
  date: string;
  account_id: string;
  transaction_type: 'income' | 'expenditure' | 'transfer_in' | 'transfer_out';
  amount: number;
  description?: string;
  created_at?: string;
}

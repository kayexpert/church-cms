import { IncomeCategory, ExpenditureCategory, LiabilityCategory } from "@/types/finance";

/**
 * Identifies if an income category is a system category that should be hidden from user selection
 * @param category The income category to check
 * @returns True if the category is a system category, false otherwise
 */
export function isSystemIncomeCategory(category: IncomeCategory): boolean {
  // Check for opening balance categories
  if (
    category.name === "Bal c/d" ||
    category.name === "Opening Balance"
  ) {
    return true;
  }

  // Check for asset disposal categories
  if (category.name === "Asset Disposal") {
    return true;
  }

  // Check for system-related descriptions
  if (category.description) {
    const description = category.description.toLowerCase();
    if (
      description.includes("system category") ||
      description.includes("opening balance") ||
      description.includes("auto-created") ||
      description.includes("asset disposal")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Identifies if an expenditure category is a system category that should be hidden from user selection
 * @param category The expenditure category to check
 * @returns True if the category is a system category, false otherwise
 */
export function isSystemExpenditureCategory(category: ExpenditureCategory): boolean {
  // Check for system categories
  if (
    category.name === "Budget Allocation" ||
    category.name === "Liability Payment" ||
    (category.name && category.name.startsWith("Budget allocation for ")) ||
    (category.name && category.name === "Liability Payments")
  ) {
    return true;
  }

  // Check for system-related descriptions
  if (category.description) {
    const description = category.description.toLowerCase();
    if (
      description.includes("system category") ||
      description.includes("budget allocation") ||
      description.includes("auto-created") ||
      description.includes("liability payment")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Filters out system categories from a list of income categories
 * @param categories The list of income categories to filter
 * @returns A filtered list with system categories removed
 */
export function filterSystemIncomeCategories(categories: IncomeCategory[]): IncomeCategory[] {
  return categories.filter(category => !isSystemIncomeCategory(category));
}

/**
 * Filters out system categories from a list of expenditure categories
 * @param categories The list of expenditure categories to filter
 * @returns A filtered list with system categories removed
 */
export function filterSystemExpenditureCategories(categories: ExpenditureCategory[]): ExpenditureCategory[] {
  return categories.filter(category => !isSystemExpenditureCategory(category));
}

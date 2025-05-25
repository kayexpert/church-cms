import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { QueryClient } from "@tanstack/react-query";

/**
 * Updates a budget item when a new expenditure entry is created with a budget_item_id
 * 
 * @param expenditureEntryId The ID of the newly created expenditure entry
 * @param queryClient Optional QueryClient for invalidating queries
 * @returns True if the update was successful, false otherwise
 */
export async function updateBudgetItemForExpenditure(
  expenditureEntryId: string,
  queryClient?: QueryClient
): Promise<boolean> {
  try {
    // First, get the expenditure entry
    const { data: expenditureEntry, error: fetchError } = await supabase
      .from("expenditure_entries")
      .select("*")
      .eq("id", expenditureEntryId)
      .single();

    if (fetchError) {
      console.error(`Error fetching expenditure entry for budget item update:`, fetchError);
      return false;
    }

    // Check if the expenditure entry is linked to a budget item
    if (!expenditureEntry.budget_item_id) {
      console.log(`Expenditure entry ${expenditureEntryId} is not linked to a budget item. No update needed.`);
      return true;
    }

    console.log(`Expenditure entry ${expenditureEntryId} is linked to budget item ${expenditureEntry.budget_item_id}. Updating budget item...`);

    // Get the current budget item
    const { data: budgetItem, error: fetchBudgetItemError } = await supabase
      .from("budget_items")
      .select("*")
      .eq("id", expenditureEntry.budget_item_id)
      .single();

    if (fetchBudgetItemError) {
      console.error("Error fetching budget item:", fetchBudgetItemError);
      toast.warning("Budget item may not be updated correctly");
      return false;
    }

    if (!budgetItem) {
      console.error(`Budget item ${expenditureEntry.budget_item_id} not found`);
      return false;
    }

    // Update the budget item's actual_amount by adding the expenditure amount
    const newActualAmount = (budgetItem.actual_amount || 0) + expenditureEntry.amount;

    // Calculate the new variance
    const newVariance = (budgetItem.planned_amount || 0) - newActualAmount;

    // Update the budget item
    const { error: updateBudgetItemError } = await supabase
      .from("budget_items")
      .update({
        actual_amount: newActualAmount,
        variance: newVariance,
        updated_at: new Date().toISOString()
      })
      .eq("id", expenditureEntry.budget_item_id);

    if (updateBudgetItemError) {
      console.error("Error updating budget item:", updateBudgetItemError);
      toast.warning("Budget item may not be updated correctly");
      return false;
    }

    console.log(`Budget item ${expenditureEntry.budget_item_id} updated successfully. New actual amount: ${newActualAmount}`);

    // Invalidate budget-related queries if we have a query client
    if (queryClient) {
      queryClient.invalidateQueries({ queryKey: ["budgetItems"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    }

    return true;
  } catch (error) {
    console.error("Error in updateBudgetItemForExpenditure:", error);
    return false;
  }
}

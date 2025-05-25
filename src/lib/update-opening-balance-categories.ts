import { supabase } from "@/lib/supabase";
import { ensureOpeningBalanceCategory } from "./ensure-opening-balance-category";

/**
 * Updates existing opening balance entries to use the "Bal c/d" category
 * @returns The number of entries updated
 */
export async function updateOpeningBalanceCategories(): Promise<number> {
  try {
    // Get the "Bal c/d" category ID
    const balCdCategoryId = await ensureOpeningBalanceCategory();
    
    // Find all income entries that are opening balances
    const { data: openingBalanceEntries, error: fetchError } = await supabase
      .from("income_entries")
      .select("id, description")
      .ilike("description", "Opening balance for%");
    
    if (fetchError) {
      console.error("Error fetching opening balance entries:", fetchError);
      throw fetchError;
    }
    
    if (!openingBalanceEntries || openingBalanceEntries.length === 0) {
      console.log("No opening balance entries found to update");
      return 0;
    }
    
    // Update all opening balance entries to use the "Bal c/d" category
    const { error: updateError } = await supabase
      .from("income_entries")
      .update({ category_id: balCdCategoryId })
      .in("id", openingBalanceEntries.map(entry => entry.id));
    
    if (updateError) {
      console.error("Error updating opening balance entries:", updateError);
      throw updateError;
    }
    
    console.log(`Successfully updated ${openingBalanceEntries.length} opening balance entries to use "Bal c/d" category`);
    return openingBalanceEntries.length;
  } catch (error) {
    console.error("Error in updateOpeningBalanceCategories:", error);
    return 0;
  }
}

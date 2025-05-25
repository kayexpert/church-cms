import { supabase } from "@/lib/supabase";

/**
 * Ensures that a "Bal c/d" income category exists for opening balance entries
 * @returns The ID of the "Bal c/d" category
 */
export async function ensureOpeningBalanceCategory(): Promise<string> {
  try {
    // First, check if the "Bal c/d" category already exists
    const { data: existingCategory, error: checkError } = await supabase
      .from("income_categories")
      .select("id")
      .eq("name", "Bal c/d")
      .maybeSingle();

    if (checkError) {
      console.error("Error checking for Bal c/d category:", checkError);
      throw checkError;
    }

    // If the category exists, return its ID
    if (existingCategory?.id) {
      return existingCategory.id;
    }

    // If the category doesn't exist, create it
    const { data: newCategory, error: createError } = await supabase
      .from("income_categories")
      .insert({
        name: "Bal c/d",
        description: "Opening balance for accounts",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (createError) {
      console.error("Error creating Bal c/d category:", createError);
      throw createError;
    }

    return newCategory.id;
  } catch (error) {
    console.error("Error in ensureOpeningBalanceCategory:", error);
    
    // Fallback: Try to get any income category as a last resort
    const { data: fallbackCategory, error: fallbackError } = await supabase
      .from("income_categories")
      .select("id")
      .limit(1)
      .single();

    if (fallbackError) {
      console.error("Error getting fallback category:", fallbackError);
      throw new Error("Failed to ensure opening balance category");
    }

    return fallbackCategory.id;
  }
}

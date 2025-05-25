import { supabase } from "@/lib/supabase";

/**
 * Ensures that a "Budget Allocation" expenditure category exists for budget allocation entries
 * @returns The ID of the "Budget Allocation" category
 */
export async function ensureBudgetAllocationCategory(): Promise<string> {
  try {
    // First, check if the "Budget Allocation" category already exists
    const { data: existingCategory, error: checkError } = await supabase
      .from("expenditure_categories")
      .select("id")
      .eq("name", "Budget Allocation")
      .maybeSingle();

    if (checkError) {
      console.error("Error checking for Budget Allocation category:", checkError);
      throw checkError;
    }

    // If the category exists, return its ID
    if (existingCategory?.id) {
      return existingCategory.id;
    }

    // If the category doesn't exist, create it
    const { data: newCategory, error: createError } = await supabase
      .from("expenditure_categories")
      .insert({
        name: "Budget Allocation",
        description: "System category for budget allocations",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (createError) {
      console.error("Error creating Budget Allocation category:", createError);
      throw createError;
    }

    return newCategory.id;
  } catch (error) {
    console.error("Error in ensureBudgetAllocationCategory:", error);

    // Fallback: Try to get any expenditure category as a last resort
    const { data: fallbackCategory, error: fallbackError } = await supabase
      .from("expenditure_categories")
      .select("id")
      .limit(1)
      .single();

    if (fallbackError || !fallbackCategory) {
      console.error("Failed to get fallback category:", fallbackError);
      throw new Error("Could not create or find Budget Allocation category");
    }

    return fallbackCategory.id;
  }
}

/**
 * Ensures that a "Liability Payment" expenditure category exists for liability payment entries
 * @returns The ID of the "Liability Payment" category
 */
export async function ensureLiabilityPaymentCategory(): Promise<string> {
  try {
    // First, check if the "Liability Payment" category already exists
    const { data: existingCategory, error: checkError } = await supabase
      .from("expenditure_categories")
      .select("id")
      .eq("name", "Liability Payment")
      .maybeSingle();

    if (checkError) {
      console.error("Error checking for Liability Payment category:", checkError);
      throw checkError;
    }

    // If the category exists, return its ID
    if (existingCategory?.id) {
      return existingCategory.id;
    }

    // If the category doesn't exist, create it
    const { data: newCategory, error: createError } = await supabase
      .from("expenditure_categories")
      .insert({
        name: "Liability Payment",
        description: "System category for liability payments",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (createError) {
      console.error("Error creating Liability Payment category:", createError);
      throw createError;
    }

    return newCategory.id;
  } catch (error) {
    console.error("Error in ensureLiabilityPaymentCategory:", error);

    // Fallback: Try to get any expenditure category as a last resort
    const { data: fallbackCategory, error: fallbackError } = await supabase
      .from("expenditure_categories")
      .select("id")
      .limit(1)
      .single();

    if (fallbackError || !fallbackCategory) {
      console.error("Failed to get fallback category:", fallbackError);
      throw new Error("Could not create or find Liability Payment category");
    }

    return fallbackCategory.id;
  }
}

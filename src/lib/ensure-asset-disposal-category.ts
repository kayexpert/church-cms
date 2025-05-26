import { supabase } from "@/lib/supabase";

/**
 * Ensures that the "Asset Disposal" income category exists in the database
 * This is a system category used for asset disposal income entries
 * @returns Promise<string> The ID of the Asset Disposal category
 */
export async function ensureAssetDisposalCategory(): Promise<string> {
  try {
    // First, check if the Asset Disposal category already exists
    const { data: existingCategory, error: checkError } = await supabase
      .from("income_categories")
      .select("id")
      .eq("name", "Asset Disposal")
      .maybeSingle();

    if (checkError) {
      throw new Error(`Failed to check for existing Asset Disposal category: ${checkError.message}`);
    }

    // If it exists, return its ID
    if (existingCategory) {
      return existingCategory.id;
    }

    // If it doesn't exist, create it
    const { data: newCategory, error: createError } = await supabase
      .from("income_categories")
      .insert({
        name: "Asset Disposal",
        description: "System category for income from asset disposals - auto-created"
      })
      .select("id")
      .single();

    if (createError) {
      throw new Error(`Failed to create Asset Disposal category: ${createError.message}`);
    }

    if (!newCategory) {
      throw new Error("Failed to create Asset Disposal category: No data returned");
    }

    console.log("Created Asset Disposal income category");
    return newCategory.id;
  } catch (error) {
    console.error("Error ensuring Asset Disposal category exists:", error);
    throw error;
  }
}

/**
 * Gets the Asset Disposal category ID, creating it if it doesn't exist
 * This is a convenience function that wraps ensureAssetDisposalCategory
 * @returns Promise<string> The ID of the Asset Disposal category
 */
export async function getAssetDisposalCategoryId(): Promise<string> {
  return await ensureAssetDisposalCategory();
}

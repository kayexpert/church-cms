// JavaScript version of the migration script that can be run directly with Node.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create a Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Ensures that a "Budget Allocation" expenditure category exists
 * @returns {Promise<string>} The ID of the "Budget Allocation" category
 */
async function ensureBudgetAllocationCategory() {
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
 * Ensures that a "Liability Payment" expenditure category exists
 * @returns {Promise<string>} The ID of the "Liability Payment" category
 */
async function ensureLiabilityPaymentCategory() {
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

/**
 * Script to consolidate budget and liability expenditure categories
 */
async function consolidateExpenditureCategories() {
  try {
    console.log("Starting expenditure category consolidation...");

    // 1. Ensure the standard "Budget Allocation" category exists
    console.log("Ensuring Budget Allocation category exists...");
    const budgetAllocationId = await ensureBudgetAllocationCategory();
    console.log(`Budget Allocation category ID: ${budgetAllocationId}`);

    // 2. Ensure the standard "Liability Payment" category exists
    console.log("Ensuring Liability Payment category exists...");
    const liabilityPaymentId = await ensureLiabilityPaymentCategory();
    console.log(`Liability Payment category ID: ${liabilityPaymentId}`);

    // 3. Update all budget-related expenditure entries to use the standard "Budget Allocation" category
    console.log("Updating budget-related expenditure entries...");
    const { data: directBudgetUpdate, error: directBudgetError } = await supabase
      .from('expenditure_entries')
      .update({ category_id: budgetAllocationId })
      .filter('budget_item_id', 'not.is', null)
      .filter('liability_payment', 'eq', false)
      .select('id');
    
    if (directBudgetError) {
      console.error("Update of budget-related expenditure entries failed:", directBudgetError);
    } else {
      console.log(`Updated ${directBudgetUpdate?.length || 0} budget-related expenditure entries`);
    }

    // 4. Update all liability payment entries to use the standard "Liability Payment" category
    console.log("Updating liability payment expenditure entries...");
    const { data: directLiabilityUpdate, error: directLiabilityError } = await supabase
      .from('expenditure_entries')
      .update({ category_id: liabilityPaymentId })
      .filter('liability_payment', 'eq', true)
      .select('id');
    
    if (directLiabilityError) {
      console.error("Update of liability payment expenditure entries failed:", directLiabilityError);
    } else {
      console.log(`Updated ${directLiabilityUpdate?.length || 0} liability payment expenditure entries`);
    }

    // 5. Get a list of redundant budget-specific categories
    console.log("Finding redundant budget-specific categories...");
    const { data: redundantCategories, error: findError } = await supabase
      .from('expenditure_categories')
      .select('id, name')
      .or('name.like.Budget allocation for %,name.eq.Liability Payments');

    if (findError) {
      console.error("Error finding redundant categories:", findError);
    } else {
      console.log(`Found ${redundantCategories?.length || 0} redundant categories`);
      
      if (redundantCategories && redundantCategories.length > 0) {
        console.log("Redundant categories:", redundantCategories.map(c => c.name).join(", "));
        
        // Check if any of these categories are still in use
        for (const category of redundantCategories) {
          const { count, error: countError } = await supabase
            .from('expenditure_entries')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', category.id);
          
          if (countError) {
            console.error(`Error checking if category ${category.name} is in use:`, countError);
          } else if (count && count > 0) {
            console.log(`Category ${category.name} is still in use by ${count} entries - skipping deletion`);
          } else {
            // Delete the category if it's not in use
            console.log(`Deleting unused category: ${category.name}`);
            const { error: deleteError } = await supabase
              .from('expenditure_categories')
              .delete()
              .eq('id', category.id);
            
            if (deleteError) {
              console.error(`Error deleting category ${category.name}:`, deleteError);
            } else {
              console.log(`Successfully deleted category: ${category.name}`);
            }
          }
        }
      }
    }

    console.log("Expenditure category consolidation completed successfully!");
  } catch (error) {
    console.error("Error in consolidateExpenditureCategories:", error);
  }
}

// Run the script
consolidateExpenditureCategories();

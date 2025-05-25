import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ensureOpeningBalanceCategory } from "@/lib/ensure-opening-balance-category";

export async function POST() {
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
      return NextResponse.json(
        { error: "Failed to fetch opening balance entries", details: fetchError },
        { status: 500 }
      );
    }
    
    if (!openingBalanceEntries || openingBalanceEntries.length === 0) {
      return NextResponse.json(
        { message: "No opening balance entries found to update", count: 0 },
        { status: 200 }
      );
    }
    
    // Update all opening balance entries to use the "Bal c/d" category
    const { error: updateError } = await supabase
      .from("income_entries")
      .update({ category_id: balCdCategoryId })
      .in("id", openingBalanceEntries.map(entry => entry.id));
    
    if (updateError) {
      console.error("Error updating opening balance entries:", updateError);
      return NextResponse.json(
        { error: "Failed to update opening balance entries", details: updateError },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        message: `Successfully updated ${openingBalanceEntries.length} opening balance entries to use "Bal c/d" category`,
        count: openingBalanceEntries.length 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in updateOpeningBalanceCategories:", error);
    return NextResponse.json(
      { error: "Failed to update opening balance categories", details: error },
      { status: 500 }
    );
  }
}

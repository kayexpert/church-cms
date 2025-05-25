import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { assetId, disposalDate, disposalAmount, accountId } = await request.json();

    if (!assetId) {
      return NextResponse.json(
        { error: "Asset ID is required" },
        { status: 400 }
      );
    }

    if (!disposalDate) {
      return NextResponse.json(
        { error: "Disposal date is required" },
        { status: 400 }
      );
    }

    if (!disposalAmount || isNaN(parseFloat(disposalAmount))) {
      return NextResponse.json(
        { error: "Valid disposal amount is required" },
        { status: 400 }
      );
    }

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    // 1. Get the asset name
    const { data: assetData, error: assetError } = await supabase
      .from("assets")
      .select("name")
      .eq("id", assetId)
      .single();

    if (assetError) {
      console.error("Error fetching asset:", assetError);
      return NextResponse.json(
        { error: `Failed to fetch asset: ${assetError.message}` },
        { status: 500 }
      );
    }

    // 2. Get a default income category for asset disposals
    // First try to find a category with 'disposal' or 'asset' in the name
    const { data: categoryData, error: categoryError } = await supabase
      .from("income_categories")
      .select("id")
      .or("name.ilike.%disposal%,name.ilike.%asset%")
      .limit(1);

    if (categoryError) {
      console.error("Error fetching categories:", categoryError);
      return NextResponse.json(
        { error: `Failed to fetch categories: ${categoryError.message}` },
        { status: 500 }
      );
    }

    let categoryId = categoryData?.[0]?.id;

    // If no specific category found, get the first income category
    if (!categoryId) {
      const { data: fallbackCategory, error: fallbackError } = await supabase
        .from("income_categories")
        .select("id")
        .limit(1);

      if (fallbackError) {
        console.error("Error fetching fallback category:", fallbackError);
        return NextResponse.json(
          { error: `Failed to fetch fallback category: ${fallbackError.message}` },
          { status: 500 }
        );
      }
      categoryId = fallbackCategory?.[0]?.id;
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: "No income category found" },
        { status: 500 }
      );
    }

    // 3. Create an income entry
    const { data: incomeData, error: incomeError } = await supabase
      .from("income_entries")
      .insert({
        account_id: accountId,
        category_id: categoryId,
        amount: parseFloat(disposalAmount),
        date: disposalDate,
        description: `Disposal of asset: ${assetData.name}`,
        payment_method: "asset_disposal",
        payment_details: JSON.stringify({
          source: "asset_disposal",
          asset_id: assetId
        })
      })
      .select();

    if (incomeError) {
      console.error("Error creating income entry:", incomeError);
      return NextResponse.json(
        { error: `Failed to create income entry: ${incomeError.message}` },
        { status: 500 }
      );
    }

    // 4. Create the asset disposal record
    const { data: disposalData, error: disposalError } = await supabase
      .from("asset_disposals")
      .insert({
        asset_id: assetId,
        disposal_date: disposalDate,
        disposal_amount: parseFloat(disposalAmount),
        account_id: accountId,
        income_entry_id: incomeData[0].id
      })
      .select();

    if (disposalError) {
      console.error("Error creating disposal record:", disposalError);
      
      // Try to clean up the income entry if disposal creation fails
      await supabase
        .from("income_entries")
        .delete()
        .eq("id", incomeData[0].id);
        
      return NextResponse.json(
        { error: `Failed to create disposal record: ${disposalError.message}` },
        { status: 500 }
      );
    }

    // 5. Update the asset status to disposed
    const { error: updateError } = await supabase
      .from("assets")
      .update({
        status: "disposed",
        updated_at: new Date().toISOString()
      })
      .eq("id", assetId);

    if (updateError) {
      console.error("Error updating asset status:", updateError);
      // Continue even if this fails, as the disposal record is created
    }

    return NextResponse.json(
      { 
        message: "Asset disposed successfully",
        data: {
          id: disposalData[0].id,
          income_entry_id: incomeData[0].id
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in manual asset disposal:", error);
    return NextResponse.json(
      { error: `Failed to dispose asset: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

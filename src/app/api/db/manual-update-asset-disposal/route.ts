import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { disposalId, disposalDate, disposalAmount, accountId, incomeEntryId } = await request.json();

    if (!disposalId) {
      return NextResponse.json(
        { error: "Disposal ID is required" },
        { status: 400 }
      );
    }

    // Get the asset ID and name
    const { data: disposalData, error: fetchError } = await supabase
      .from("asset_disposals")
      .select("asset_id, assets(name)")
      .eq("id", disposalId)
      .single();

    if (fetchError) {
      console.error("Error fetching disposal details:", fetchError);
      return NextResponse.json(
        { error: `Failed to fetch disposal details: ${fetchError.message}` },
        { status: 500 }
      );
    }

    const assetId = disposalData.asset_id;
    const assetName = (disposalData.assets as any)?.name || "Unknown Asset";

    // 1. Update the asset disposal record
    const { error: disposalError } = await supabase
      .from("asset_disposals")
      .update({
        disposal_date: disposalDate,
        disposal_amount: disposalAmount,
        account_id: accountId,
        updated_at: new Date().toISOString()
      })
      .eq("id", disposalId);

    if (disposalError) {
      console.error("Error updating asset disposal:", disposalError);
      return NextResponse.json(
        { error: `Failed to update asset disposal: ${disposalError.message}` },
        { status: 500 }
      );
    }

    // 2. Update the income entry if provided
    if (incomeEntryId) {
      const { error: incomeError } = await supabase
        .from("income_entries")
        .update({
          date: disposalDate,
          amount: disposalAmount,
          account_id: accountId,
          description: `Disposal of asset: ${assetName}`,
          payment_details: JSON.stringify({
            source: "asset_disposal",
            asset_id: assetId
          })
        })
        .eq("id", incomeEntryId);

      if (incomeError) {
        console.error("Error updating income entry:", incomeError);
        // Continue with other operations even if this fails
      }
    }

    return NextResponse.json(
      { message: "Asset disposal updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error manually updating asset disposal:", error);
    return NextResponse.json(
      { error: `Failed to update asset disposal: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

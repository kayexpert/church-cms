import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { disposalId, incomeEntryId, assetId } = await request.json();

    if (!disposalId) {
      return NextResponse.json(
        { error: "Disposal ID is required" },
        { status: 400 }
      );
    }

    // 1. Delete the asset disposal record
    const { error: disposalError } = await supabase
      .from("asset_disposals")
      .delete()
      .eq("id", disposalId);

    if (disposalError) {
      console.error("Error deleting asset disposal:", disposalError);
      return NextResponse.json(
        { error: `Failed to delete asset disposal: ${disposalError.message}` },
        { status: 500 }
      );
    }

    // 2. Delete the income entry if provided
    if (incomeEntryId) {
      const { error: incomeError } = await supabase
        .from("income_entries")
        .delete()
        .eq("id", incomeEntryId);

      if (incomeError) {
        console.error("Error deleting income entry:", incomeError);
        // Continue with other operations even if this fails
      }
    }

    // 3. Update the asset status if provided
    if (assetId) {
      const { error: assetError } = await supabase
        .from("assets")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", assetId);

      if (assetError) {
        console.error("Error updating asset status:", assetError);
        // Continue even if this fails
      }
    }

    return NextResponse.json(
      { message: "Asset disposal deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error manually deleting asset disposal:", error);
    return NextResponse.json(
      { error: `Failed to delete asset disposal: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

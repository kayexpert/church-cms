import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

// Define the schema for account transfer requests
const transferSchema = z.object({
  source_account_id: z.string().uuid(),
  destination_account_id: z.string().uuid(),
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  description: z.string().optional(),
});

// Define the schema for delete transfer requests
const deleteTransferSchema = z.object({
  transfer_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();

    // Validate the request body
    const result = transferSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: result.error.format() },
        { status: 400 }
      );
    }

    const { source_account_id, destination_account_id, amount, date, description } = result.data;

    // Check if source and destination are different
    if (source_account_id === destination_account_id) {
      return NextResponse.json(
        { error: "Source and destination accounts must be different" },
        { status: 400 }
      );
    }

    // Call the transfer_between_accounts function
    const { data, error } = await supabase.rpc("transfer_between_accounts", {
      source_account_id,
      destination_account_id,
      transfer_amount: amount,
      transfer_date: date,
      transfer_description: description || "Account transfer",
    });

    if (error) {
      console.error("Error in transfer_between_accounts:", error);

      // Check for specific error messages
      if (error.message.includes("Insufficient balance")) {
        return NextResponse.json(
          { error: "Insufficient balance in source account" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Failed to process transfer", details: error.message },
        { status: 500 }
      );
    }

    // Return the transfer ID
    return NextResponse.json({ success: true, transfer_id: data });
  } catch (error) {
    console.error("Unexpected error in account transfer API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();

    // Validate the request body with transfer_id field
    const updateSchema = z.object({
      transfer_id: z.string().uuid(),
      source_account_id: z.string().uuid(),
      destination_account_id: z.string().uuid(),
      amount: z.number().positive(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
      description: z.string().optional(),
    });

    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: result.error.format() },
        { status: 400 }
      );
    }

    const { transfer_id, source_account_id, destination_account_id, amount, date, description } = result.data;

    // First, get the current transfer to compare
    const { data: currentTransfer, error: fetchError } = await supabase
      .from("account_transfers")
      .select("*")
      .eq("id", transfer_id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch transfer", details: fetchError.message },
        { status: 500 }
      );
    }

    // If source or destination changed, we need to recalculate all affected accounts
    if (currentTransfer.source_account_id !== source_account_id ||
        currentTransfer.destination_account_id !== destination_account_id) {

      // First, reverse the original transfer by recalculating the original accounts
      await supabase.rpc("recalculate_account_balance", {
        account_id: currentTransfer.source_account_id
      });
      await supabase.rpc("recalculate_account_balance", {
        account_id: currentTransfer.destination_account_id
      });

      // Update the transfer
      const { error: updateError } = await supabase
        .from("account_transfers")
        .update({
          source_account_id,
          destination_account_id,
          amount,
          date,
          description: description || "Account transfer",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transfer_id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update transfer", details: updateError.message },
          { status: 500 }
        );
      }

      // Recalculate the new accounts
      await supabase.rpc("recalculate_account_balance", {
        account_id: source_account_id
      });
      await supabase.rpc("recalculate_account_balance", {
        account_id: destination_account_id
      });
    }
    // If only amount or date changed, we can just update the transfer and recalculate
    else {
      // Update the transfer
      const { error: updateError } = await supabase
        .from("account_transfers")
        .update({
          amount,
          date,
          description: description || "Account transfer",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transfer_id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update transfer", details: updateError.message },
          { status: 500 }
        );
      }

      // Recalculate both accounts
      await supabase.rpc("recalculate_account_balance", {
        account_id: source_account_id
      });
      await supabase.rpc("recalculate_account_balance", {
        account_id: destination_account_id
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in account transfer update API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();

    // Validate the request body
    const result = deleteTransferSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: result.error.format() },
        { status: 400 }
      );
    }

    const { transfer_id } = result.data;

    // First, get the current transfer to get account IDs for recalculation
    const { data: currentTransfer, error: fetchError } = await supabase
      .from("account_transfers")
      .select("*")
      .eq("id", transfer_id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch transfer details", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!currentTransfer) {
      return NextResponse.json(
        { error: "Transfer not found" },
        { status: 404 }
      );
    }

    // Delete the transfer
    const { error: deleteError } = await supabase
      .from("account_transfers")
      .delete()
      .eq("id", transfer_id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete transfer", details: deleteError.message },
        { status: 500 }
      );
    }

    // Recalculate both accounts
    await supabase.rpc("recalculate_account_balance", {
      account_id: currentTransfer.source_account_id
    });
    await supabase.rpc("recalculate_account_balance", {
      account_id: currentTransfer.destination_account_id
    });

    return NextResponse.json({
      success: true,
      message: "Transfer deleted successfully"
    }, { status: 200 });
  } catch (error) {
    console.error("Error in DELETE account-transfer:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
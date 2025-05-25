import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { sql } = await request.json();

    if (!sql) {
      return NextResponse.json(
        { error: "SQL statement is required" },
        { status: 400 }
      );
    }

    // Execute the SQL directly
    const { data, error } = await supabase.rpc("exec_sql", { sql });

    if (error) {
      console.error("Error executing SQL:", error);
      return NextResponse.json(
        { error: `Failed to execute SQL: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "SQL executed successfully", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error executing SQL:", error);
    return NextResponse.json(
      { error: `Failed to execute SQL: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

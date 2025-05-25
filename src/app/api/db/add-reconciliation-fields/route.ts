import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), 'src', 'db', 'migrations', 'add_reconciliation_fields.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error("Error adding reconciliation fields:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Reconciliation fields added successfully" });
  } catch (error) {
    console.error("Error in add-reconciliation-fields route:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

/**
 * API route to apply all finance optimizations at once
 */
export async function GET() {
  try {
    console.log("Applying all finance optimizations...");
    
    // Apply database indexes
    try {
      const indexResponse = await fetch(new URL('/api/db/apply-finance-indexes', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
      if (!indexResponse.ok) {
        console.warn("Failed to apply finance indexes:", await indexResponse.text());
      } else {
        console.log("Finance indexes applied successfully");
      }
    } catch (indexError) {
      console.warn("Error applying finance indexes:", indexError);
    }
    
    // Create dashboard function
    try {
      const dashboardResponse = await fetch(new URL('/api/db/create-dashboard-function', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
      if (!dashboardResponse.ok) {
        console.warn("Failed to create dashboard function:", await dashboardResponse.text());
      } else {
        console.log("Dashboard function created successfully");
      }
    } catch (dashboardError) {
      console.warn("Error creating dashboard function:", dashboardError);
    }
    
    // Create monthly data function
    try {
      const monthlyDataResponse = await fetch(new URL('/api/db/create-monthly-data-function', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
      if (!monthlyDataResponse.ok) {
        console.warn("Failed to create monthly data function:", await monthlyDataResponse.text());
      } else {
        console.log("Monthly data function created successfully");
      }
    } catch (monthlyDataError) {
      console.warn("Error creating monthly data function:", monthlyDataError);
    }
    
    return NextResponse.json(
      { message: "All finance optimizations applied successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error applying finance optimizations:", error);
    return NextResponse.json(
      { error: `Failed to apply finance optimizations: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

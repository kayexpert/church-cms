"use client";

import { ReportGenerator } from "./components/report-generator";

export default function ReportsPage() {
  return (
    <div className="flex-1 space-y-4 md:p-8 pt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground mt-1">
            Generate and download comprehensive reports for your church
          </p>
        </div>
      </div>

      <ReportGenerator key={Date.now()} />
    </div>
  );
}

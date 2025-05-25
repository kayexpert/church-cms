import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileBarChart } from "lucide-react";

export const metadata: Metadata = {
  title: "Reports | Church CMS",
  description: "Generate and view reports for your church",
};

export default function ReportsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground mt-1">
            Generate and analyze data across your organization
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5" />
            <span>Reports</span>
          </CardTitle>
          <CardDescription>
            Generate and view reports for your church
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileBarChart className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
          <p className="text-muted-foreground max-w-md">
            The reporting feature is currently under development and will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

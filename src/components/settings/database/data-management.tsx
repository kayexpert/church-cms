"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Upload } from "lucide-react";

interface DataManagementProps {
  onExport: (() => void) | undefined;
  onImport: (() => void) | undefined;
  onReset: (() => void) | undefined;
  isExporting: boolean;
  isImporting: boolean;
  isResetting: boolean;
}

export function DataManagement({
  onExport,
  onImport,
  onReset,
  isExporting = false,
  isImporting = false,
  isResetting = false
}: DataManagementProps) {
  return (
    <>
      <h3 className="text-lg font-medium">Data Management</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-medium mb-2">Export Database</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Export all your data to a JSON file for backup purposes.
          </p>
          <Button
            onClick={onExport}
            disabled={isExporting}
            className="w-full"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exporting..." : "Export Data"}
          </Button>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-medium mb-2">Import Database</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Import data from a previously exported JSON file.
          </p>
          <Button
            onClick={onImport}
            disabled={isImporting}
            variant="outline"
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Data
          </Button>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-medium mb-2">Reset Database</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Reset all transactional data while keeping settings intact.
          </p>
          <Button
            onClick={onReset}
            disabled={isResetting}
            variant="destructive"
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {isResetting ? "Resetting..." : "Reset Data"}
          </Button>
        </Card>
      </div>
    </>
  );
}

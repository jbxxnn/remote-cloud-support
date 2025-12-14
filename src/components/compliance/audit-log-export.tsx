"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileText, FileSpreadsheet, Loader } from "lucide-react";

interface AuditLogExportProps {
  dateRange?: { start: string; end: string };
}

export function AuditLogExport({ dateRange }: AuditLogExportProps) {
  const [format, setFormat] = useState<"csv" | "pdf">("csv");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      params.append("format", format);
      if (dateRange) {
        params.append("startDate", dateRange.start);
        params.append("endDate", dateRange.end);
      }

      const response = await fetch(`/api/admin/compliance/audit-logs/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to export audit logs");
      }

      // Get the blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to export audit logs:", error);
      alert("Failed to export audit logs. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Export Audit Logs</CardTitle>
          <CardDescription>
            Generate CSV or PDF exports of audit logs for compliance reporting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Export Format</Label>
            <Select value={format} onValueChange={(value) => setFormat(value as "csv" | "pdf")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    CSV (Comma Separated Values)
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    PDF (Portable Document Format)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateRange && (
            <div className="text-sm text-muted-foreground">
              <p>
                Date Range: {new Date(dateRange.start).toLocaleDateString()} -{" "}
                {new Date(dateRange.end).toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Audit Logs
                </>
              )}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">Export includes:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>SOP Response activities (creation, completion)</li>
              <li>Incident reports (creation, review, finalization)</li>
              <li>Alert events (acknowledgment, resolution, escalation)</li>
              <li>User actions and timestamps</li>
              <li>Compliance metadata</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>CSV Format:</strong> Suitable for spreadsheet analysis and data processing.
            Includes all audit log entries with timestamps, users, actions, and results.
          </p>
          <p>
            <strong>PDF Format:</strong> Suitable for official compliance reports and documentation.
            Includes summary statistics, formatted table, and page numbering.
          </p>
          <p>
            <strong>Note:</strong> Exports are generated based on the selected date range. If no
            date range is specified, all available audit logs will be included.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}




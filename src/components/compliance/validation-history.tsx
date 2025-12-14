"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Filter,
  Loader,
  FileText,
  ExternalLink,
} from "lucide-react";

interface ValidationHistoryItem {
  id: string;
  type: "sop" | "incident";
  validatorType: "sop" | "record" | "compliance" | "billing";
  entityId: string;
  entityName: string;
  clientId: string;
  clientName: string;
  alertId?: string;
  alertMessage?: string;
  isValid: boolean;
  errors: number;
  warnings: number;
  errorDetails?: any[];
  warningDetails?: any[];
  timestamp: string;
  metadata?: any;
}

interface ValidationHistoryProps {
  dateRange?: { start: string; end: string };
}

export function ValidationHistory({ dateRange }: ValidationHistoryProps) {
  const [history, setHistory] = useState<ValidationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [validatorTypeFilter, setValidatorTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<ValidationHistoryItem | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [dateRange, validatorTypeFilter, statusFilter]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange) {
        params.append("startDate", dateRange.start);
        params.append("endDate", dateRange.end);
      }
      if (validatorTypeFilter !== "all") {
        params.append("validatorType", validatorTypeFilter);
      }
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/admin/compliance/validation-history?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch validation history");
      }

      const data = await response.json();
      setHistory(data.history || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error("Failed to fetch validation history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (isValid: boolean) => {
    if (isValid) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Passed
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Failed
      </Badge>
    );
  };

  const getValidatorTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      sop: "default",
      record: "secondary",
      compliance: "outline",
      billing: "outline",
    };
    return (
      <Badge variant={variants[type] || "outline"}>{type.toUpperCase()}</Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Validations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Passed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.passed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">SOP Validations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.byType?.sop || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label>Validator Type</Label>
              <Select value={validatorTypeFilter} onValueChange={setValidatorTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sop">SOP</SelectItem>
                  <SelectItem value="record">Record</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Validation History</CardTitle>
          <CardDescription>
            Historical validation results and rule violations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No validation history found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Errors</TableHead>
                  <TableHead>Warnings</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>{getValidatorTypeBadge(item.validatorType)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{item.entityName}</div>
                      {item.alertMessage && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {item.alertMessage}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{item.clientName || "Unknown"}</TableCell>
                    <TableCell>{getStatusBadge(item.isValid)}</TableCell>
                    <TableCell>
                      {item.errors > 0 ? (
                        <Badge variant="destructive">{item.errors}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.warnings > 0 ? (
                        <Badge variant="secondary">{item.warnings}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedItem(item)}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      {selectedItem && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Validation Details</CardTitle>
            <CardDescription>{selectedItem.entityName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Status</Label>
                <div className="mt-1">{getStatusBadge(selectedItem.isValid)}</div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Validator Type</Label>
                <div className="mt-1">{getValidatorTypeBadge(selectedItem.validatorType)}</div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Client</Label>
                <div className="mt-1">{selectedItem.clientName}</div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Timestamp</Label>
                <div className="mt-1">{new Date(selectedItem.timestamp).toLocaleString()}</div>
              </div>
            </div>

            {selectedItem.errorDetails && selectedItem.errorDetails.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-red-600">Errors</Label>
                <div className="mt-2 space-y-2">
                  {selectedItem.errorDetails.map((error, index) => (
                    <div key={index} className="border border-red-200 rounded p-2 bg-red-50 dark:bg-red-950/20">
                      <div className="text-sm font-medium">{error.field}</div>
                      <div className="text-xs text-muted-foreground">{error.message}</div>
                      {error.ruleRef && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {error.ruleRef}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedItem.warningDetails && selectedItem.warningDetails.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-yellow-600">Warnings</Label>
                <div className="mt-2 space-y-2">
                  {selectedItem.warningDetails.map((warning, index) => (
                    <div key={index} className="border border-yellow-200 rounded p-2 bg-yellow-50 dark:bg-yellow-950/20">
                      <div className="text-sm font-medium">{warning.field}</div>
                      <div className="text-xs text-muted-foreground">{warning.message}</div>
                      {warning.ruleRef && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {warning.ruleRef}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setSelectedItem(null)}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}




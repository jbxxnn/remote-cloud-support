"use client";

import { useState } from "react";
import { HeaderBar } from "@/components/layout/header-bar";
import { AssistantIcon } from "@/components/assistant/assistant-icon";
import { AssistantDrawer } from "@/components/assistant/assistant-drawer";
import { ComplianceScore } from "@/components/compliance/compliance-score";
import { ValidationHistory } from "@/components/compliance/validation-history";
import { IncidentOverview } from "@/components/compliance/incident-overview";
import { AuditLogExport } from "@/components/compliance/audit-log-export";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "lucide-react";

interface ComplianceDashboardProps {
  user: any;
}

export function ComplianceDashboard({ user }: ComplianceDashboardProps) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | undefined>(undefined);

  // Default to last 30 days
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  const defaultEndDate = new Date();

  const currentDateRange = dateRange || {
    start: defaultStartDate.toISOString(),
    end: defaultEndDate.toISOString(),
  };

  return (
    <div className="flex flex-col h-full">
      <HeaderBar />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Provider-wide compliance monitoring and reporting
              </p>
            </div>
            <div className="flex items-center gap-2">
              <AssistantIcon
                module="Compliance Dashboard"
                userRole="admin"
                onOpen={() => setAssistantOpen(true)}
              />
            </div>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="validation">Validation History</TabsTrigger>
              <TabsTrigger value="incidents">Incidents</TabsTrigger>
              <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Compliance Score */}
              <ComplianceScore dateRange={currentDateRange} showBreakdown={true} showTrend={true} />

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Date Range</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {new Date(currentDateRange.start).toLocaleDateString()} -{" "}
                        {new Date(currentDateRange.end).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="validation" className="space-y-6">
              <ValidationHistory dateRange={currentDateRange} />
            </TabsContent>

            <TabsContent value="incidents" className="space-y-6">
              <IncidentOverview dateRange={currentDateRange} />
            </TabsContent>

            <TabsContent value="audit" className="space-y-6">
              <AuditLogExport dateRange={currentDateRange} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Assistant */}
      <AssistantDrawer
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
      />
    </div>
  );
}


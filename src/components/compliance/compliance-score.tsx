"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ComplianceScoreBreakdown } from "@/lib/compliance/score-calculator";

interface ComplianceScoreProps {
  dateRange?: { start: string; end: string };
  showBreakdown?: boolean;
  showTrend?: boolean;
}

export function ComplianceScore({ dateRange, showBreakdown = true, showTrend = true }: ComplianceScoreProps) {
  const [score, setScore] = useState<ComplianceScoreBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState<number | null>(null);

  useEffect(() => {
    fetchScore();
    if (showTrend) {
      fetchTrend();
    }
  }, [dateRange, showTrend]);

  const fetchScore = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange) {
        params.append("startDate", dateRange.start);
        params.append("endDate", dateRange.end);
      }

      const response = await fetch(`/api/admin/compliance/score?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch compliance score");
      }

      const data = await response.json();
      setScore(data);
    } catch (error) {
      console.error("Failed to fetch compliance score:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrend = async () => {
    try {
      const response = await fetch("/api/admin/compliance/score?historical=true&days=7");
      if (!response.ok) {
        throw new Error("Failed to fetch trend");
      }

      const data = await response.json();
      if (data.scores && data.scores.length >= 2) {
        const recent = data.scores[data.scores.length - 1].score;
        const previous = data.scores[data.scores.length - 2].score;
        setTrend(recent - previous);
      }
    } catch (error) {
      console.error("Failed to fetch trend:", error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 75) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 60) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 90) return "default";
    if (score >= 75) return "secondary";
    if (score >= 60) return "outline";
    return "destructive";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 75) return "Good";
    if (score >= 60) return "Fair";
    return "Needs Improvement";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compliance Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!score) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compliance Score</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Compliance Score</CardTitle>
            <CardDescription>
              Provider-wide compliance rating
              {score.dateRange && (
                <span className="block text-xs mt-1">
                  {new Date(score.dateRange.start).toLocaleDateString()} -{" "}
                  {new Date(score.dateRange.end).toLocaleDateString()}
                </span>
              )}
            </CardDescription>
          </div>
          {showTrend && trend !== null && (
            <div className="flex items-center gap-1">
              {trend > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : trend < 0 ? (
                <TrendingDown className="w-4 h-4 text-red-600" />
              ) : (
                <Minus className="w-4 h-4 text-muted-foreground" />
              )}
              <span className={`text-sm font-medium ${trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                {trend > 0 ? "+" : ""}{trend.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center space-y-2">
          <div className={`text-6xl font-bold ${getScoreColor(score.overallScore)}`}>
            {score.overallScore}
          </div>
          <div className="flex items-center justify-center gap-2">
            <Badge variant={getScoreBadgeVariant(score.overallScore)}>
              {getScoreLabel(score.overallScore)}
            </Badge>
          </div>
          <Progress value={score.overallScore} className="w-full" />
        </div>

        {/* Breakdown */}
        {showBreakdown && (
          <div className="space-y-4">
            <div className="text-sm font-medium">Score Breakdown</div>
            <div className="grid grid-cols-2 gap-4">
              {/* Validation Score */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Validation</span>
                  <span className={`font-medium ${getScoreColor(score.validationScore)}`}>
                    {score.validationScore}
                  </span>
                </div>
                <Progress value={score.validationScore} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {score.details.validation.passedValidations} / {score.details.validation.totalValidations} passed
                </div>
              </div>

              {/* Incident Score */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Incidents</span>
                  <span className={`font-medium ${getScoreColor(score.incidentScore)}`}>
                    {score.incidentScore}
                  </span>
                </div>
                <Progress value={score.incidentScore} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {score.details.incidents.finalizedIncidents} / {score.details.incidents.totalIncidents} finalized
                </div>
              </div>

              {/* SOP Score */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">SOPs</span>
                  <span className={`font-medium ${getScoreColor(score.sopScore)}`}>
                    {score.sopScore}
                  </span>
                </div>
                <Progress value={score.sopScore} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {score.details.sops.completedSOPResponses} / {score.details.sops.totalSOPResponses} completed
                </div>
              </div>

              {/* Documentation Score */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Documentation</span>
                  <span className={`font-medium ${getScoreColor(score.documentationScore)}`}>
                    {score.documentationScore}
                  </span>
                </div>
                <Progress value={score.documentationScore} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {score.details.documentation.completeRecords} / {score.details.documentation.totalRecords} complete
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}




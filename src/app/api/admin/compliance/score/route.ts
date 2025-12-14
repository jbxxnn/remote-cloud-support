import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateComplianceScore, getHistoricalScores } from "@/lib/compliance/score-calculator";

/**
 * GET /api/admin/compliance/score - Get compliance score
 * 
 * Query params:
 * - startDate: Start date for calculation (ISO string)
 * - endDate: End date for calculation (ISO string)
 * - historical: If true, return historical scores (default: false)
 * - days: Number of days for historical data (default: 30)
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const historical = searchParams.get("historical") === "true";
    const days = parseInt(searchParams.get("days") || "30");

    if (historical) {
      // Return historical scores
      const historicalScores = await getHistoricalScores(days);
      return NextResponse.json({
        historical: true,
        scores: historicalScores,
        days,
      });
    }

    // Calculate current score
    const dateRange = startDate && endDate
      ? { start: startDate, end: endDate }
      : undefined;

    const score = await calculateComplianceScore(dateRange);

    return NextResponse.json(score);
  } catch (error) {
    console.error("Failed to calculate compliance score:", error);
    return NextResponse.json(
      {
        error: "Failed to calculate compliance score",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}




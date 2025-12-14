import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOACRule, getAllOACRules, getOACRulesByCategory } from "@/lib/validation/oac-rules";

/**
 * GET /api/compliance/oac-rules/[ref] - Get OAC rule by reference
 * GET /api/compliance/oac-rules - Get all OAC rules
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref?: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { ref } = await params;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    // If specific rule reference provided
    if (ref) {
      // Normalize rule reference (handle formats like "5123.0412" or "OAC 5123.0412")
      const normalizedRef = ref.startsWith('OAC') 
        ? ref 
        : `OAC 5123.${ref.replace(/^5123\.?/, '').padStart(4, '0')}`;

      const rule = getOACRule(normalizedRef);

      if (!rule) {
        return NextResponse.json(
          { error: `OAC rule ${normalizedRef} not found` },
          { status: 404 }
        );
      }

      return NextResponse.json(rule);
    }

    // If category filter provided
    if (category) {
      const validCategories = ['documentation', 'timestamp', 'staff_qualification', 'service_description', 'incident_reporting'];
      if (validCategories.includes(category)) {
        const rules = getOACRulesByCategory(category as any);
        return NextResponse.json({
          category,
          rules,
          count: rules.length,
        });
      } else {
        return NextResponse.json(
          { error: `Invalid category. Valid categories: ${validCategories.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Return all rules
    const allRules = getAllOACRules();
    return NextResponse.json({
      rules: allRules,
      count: allRules.length,
    });
  } catch (error) {
    console.error("Failed to fetch OAC rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch OAC rules" },
      { status: 500 }
    );
  }
}




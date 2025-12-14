import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validatorEngine } from "@/lib/validation/validator-engine";
import { AutoFixService, AutoFixOptions } from "@/lib/validation/auto-fix";
import { ValidationContext } from "@/lib/validation/types";

/**
 * POST /api/validation/auto-fix - Auto-fix validation issues
 * 
 * Request body:
 * {
 *   validatorType: 'sop' | 'record' | 'compliance' | 'billing',
 *   data: any,
 *   context?: ValidationContext,
 *   options?: AutoFixOptions
 * }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { validatorType, data, context, options } = body;

    // Validate request
    if (!validatorType) {
      return NextResponse.json(
        { error: "validatorType is required" },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "data is required" },
        { status: 400 }
      );
    }

    // Build validation context
    const validationContext: ValidationContext = {
      userId: (session.user as any).id,
      ...context,
    };

    // First, validate the data
    const validationResult = validatorEngine.validate(validatorType, data, validationContext);

    // Check if there are any fixable issues
    const fixableIssues = AutoFixService.getFixableIssues(validationResult, validationContext);
    const unfixableIssues = AutoFixService.getUnfixableIssues(validationResult, validationContext);

    if (fixableIssues.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No auto-fixable issues found",
        fixableIssues: [],
        unfixableIssues: unfixableIssues,
        validationResult,
      });
    }

    // Apply auto-fixes
    const autoFixOptions: AutoFixOptions = {
      applySafeFixes: options?.applySafeFixes !== false, // Default to true
      requireConfirmation: options?.requireConfirmation || false,
      context: validationContext,
    };

    const fixResult = AutoFixService.autoFix(data, validationResult, autoFixOptions);

    // Re-validate the fixed data
    const revalidationResult = validatorEngine.validate(validatorType, fixResult.fixedData, validationContext);

    return NextResponse.json({
      ...fixResult,
      revalidationResult,
      originalValidation: validationResult,
    });
  } catch (error) {
    console.error("Auto-fix error:", error);
    return NextResponse.json(
      {
        error: "Auto-fix failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/validation/auto-fix - Get fixable issues for data
 * 
 * Query params:
 * - validatorType: 'sop' | 'record' | 'compliance' | 'billing'
 * - data: JSON string of data to check
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const validatorType = searchParams.get('validatorType');
    const dataParam = searchParams.get('data');

    if (!validatorType || !dataParam) {
      return NextResponse.json(
        { error: "validatorType and data query parameters are required" },
        { status: 400 }
      );
    }

    const data = JSON.parse(dataParam);
    const validationContext: ValidationContext = {
      userId: (session.user as any).id,
    };

    // Validate the data
    const validationResult = validatorEngine.validate(validatorType as any, data, validationContext);

    // Get fixable and unfixable issues
    const fixableIssues = AutoFixService.getFixableIssues(validationResult, validationContext);
    const unfixableIssues = AutoFixService.getUnfixableIssues(validationResult, validationContext);

    return NextResponse.json({
      fixableIssues,
      unfixableIssues,
      fixableCount: fixableIssues.length,
      unfixableCount: unfixableIssues.length,
      validationResult,
    });
  } catch (error) {
    console.error("Failed to check fixable issues:", error);
    return NextResponse.json(
      { error: "Failed to check fixable issues" },
      { status: 500 }
    );
  }
}




import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validatorEngine } from "@/lib/validation/validator-engine";
import { ValidationRequest, ValidationContext } from "@/lib/validation/types";

/**
 * POST /api/validation/validate - Validate data using specified validator
 * 
 * Request body:
 * {
 *   validatorType: 'sop' | 'record' | 'compliance' | 'billing',
 *   data: any,
 *   context?: {
 *     userId?: string,
 *     clientId?: string,
 *     alertId?: string,
 *     sopResponseId?: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { validatorType, data, context } = body as ValidationRequest;

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

    // Perform validation
    const result = validatorEngine.validate(validatorType, data, validationContext);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Validation error:", error);
    return NextResponse.json(
      {
        error: "Validation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/validation/validate - Get available validators
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const availableValidators = validatorEngine.getAvailableValidators();
    return NextResponse.json({
      availableValidators,
      count: availableValidators.length,
    });
  } catch (error) {
    console.error("Failed to get validators:", error);
    return NextResponse.json(
      { error: "Failed to get validators" },
      { status: 500 }
    );
  }
}




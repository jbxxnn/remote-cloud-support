import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";
import bcrypt from "bcryptjs";

// GET /api/users/[id] - Get a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await query(`
      SELECT 
        u.*,
        c.name as "clientName"
      FROM "User" u
      LEFT JOIN "Client" c ON u."clientId" = c.id
      WHERE u.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    const user = result.rows[0];
    // Remove password from response
    delete user.password;
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

// PUT /api/users/[id] - Update a specific user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      name, 
      email, 
      phone, 
      clientId, 
      isActive 
    } = body;

    if (!name || !email) {
      return NextResponse.json({ 
        error: "Name and email are required" 
      }, { status: 400 });
    }

    // Check if email already exists for other users
    const existingUser = await query(
      'SELECT id FROM "User" WHERE email = $1 AND id != $2',
      [email, id]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const now = new Date();

    const result = await query(`
      UPDATE "User" 
      SET 
        name = $1, 
        email = $2, 
        phone = $3, 
        "clientId" = $4, 
        "isActive" = $5, 
        "updatedAt" = $6
      WHERE id = $7
      RETURNING *
    `, [
      name, email, phone, clientId, isActive, now, id
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = result.rows[0];

    // Get client name if assigned
    if (user.clientId) {
      const clientResult = await query(
        'SELECT name FROM "Client" WHERE id = $1',
        [user.clientId]
      );
      if (clientResult.rows.length > 0) {
        user.clientName = clientResult.rows[0].name;
      }
    }

    // Remove password from response
    delete user.password;

    return NextResponse.json(user);
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Delete a specific user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // First check if the user exists
    const checkResult = await query(
      'SELECT id, role FROM "User" WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = checkResult.rows[0];

    // Prevent deletion of admin users
    if (user.role === "admin") {
      return NextResponse.json({ error: "Cannot delete admin users" }, { status: 400 });
    }

    // Delete the user
    await query(
      'DELETE FROM "User" WHERE id = $1',
      [id]
    );

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
} 
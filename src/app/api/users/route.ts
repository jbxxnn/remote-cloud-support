import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";
import bcrypt from "bcryptjs";

// GET /api/users - Get all users (with optional role filter)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    let sql = `
      SELECT 
        u.*,
        c.name as "clientName"
      FROM "User" u
      LEFT JOIN "Client" c ON u."clientId" = c.id
    `;
    
    const params: any[] = [];
    
    if (role) {
      sql += ` WHERE u.role = $1`;
      params.push(role);
    }
    
    sql += ` ORDER BY u."createdAt" DESC`;

    const users = await query(sql, params);
    
    return NextResponse.json(users.rows);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST /api/users - Create a new user (staff member)
export async function POST(request: NextRequest) {
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
      password, 
      role = "staff", 
      clientId, 
      isActive = true 
    } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ 
        error: "Name, email, and password are required" 
      }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ 
        error: "Password must be at least 6 characters long" 
      }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await query(
      'SELECT id FROM "User" WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    const now = new Date();

    const result = await query(`
      INSERT INTO "User" (
        id, name, email, phone, password, role, "clientId", "isActive", 
        "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
      RETURNING *
    `, [
      name, email, phone, hashedPassword, role, clientId, isActive, now, now
    ]);

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

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
} 
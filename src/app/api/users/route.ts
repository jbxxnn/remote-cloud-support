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
    const clientId = searchParams.get('clientId');

    let sql = `
      SELECT 
        u.id, u.name, u.email, u.phone, u.role, u."clientId", u."isActive", u."createdAt",
        COALESCE(
          (SELECT json_agg(json_build_object('id', c.id, 'name', c.name))
           FROM "StaffAssignment" sa
           JOIN "Client" c ON sa."clientId" = c.id
           WHERE sa."userId" = u.id),
          '[]'
        ) as "assignedClients"
      FROM "User" u
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (role) {
      sql += ` AND u.role = $${paramIndex++}`;
      params.push(role);
    }

    if (clientId) {
      // For staff, check assignments table too
      sql += ` AND (u."clientId" = $${paramIndex} OR EXISTS (SELECT 1 FROM "StaffAssignment" sa WHERE sa."userId" = u.id AND sa."clientId" = $${paramIndex}))`;
      params.push(clientId);
      paramIndex++;
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
      clientId, // Keep for tablet back-compat
      clientIds = [], // Array for multiple assignments
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
      name, email, phone, hashedPassword, role, clientId || null, isActive, now, now
    ]);

    const user = result.rows[0];

    // Handle multiple assignments for staff
    if (role === 'staff' && clientIds.length > 0) {
      for (const cid of clientIds) {
        await query(
          'INSERT INTO "StaffAssignment" ("userId", "clientId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [user.id, cid]
        );
      }
    } else if (clientId && role === 'staff') {
      // Legacy single selection support
      await query(
        'INSERT INTO "StaffAssignment" ("userId", "clientId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [user.id, clientId]
      );
    }

    // Return the user with their assignments
    const assignmentsResult = await query(
      `SELECT c.id, c.name FROM "StaffAssignment" sa JOIN "Client" c ON sa."clientId" = c.id WHERE sa."userId" = $1`,
      [user.id]
    );
    user.assignedClients = assignmentsResult.rows;

    // Remove password from response
    delete user.password;

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
} 
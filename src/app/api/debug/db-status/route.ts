import { NextResponse } from "next/server";
import { query } from "@/lib/database";

export async function GET() {
  try {
    // Test database connection
    const connectionTest = await query('SELECT NOW() as current_time');
    
    // Check if users table exists and has data
    const userCount = await query('SELECT COUNT(*) as count FROM "User" WHERE "isActive" = true');
    
    // Get sample users (without passwords)
    const sampleUsers = await query(`
      SELECT id, email, name, role, "isActive", "createdAt" 
      FROM "User" 
      WHERE "isActive" = true 
      ORDER BY "createdAt" DESC 
      LIMIT 5
    `);
    
    // Check if admin user exists
    const adminUser = await query(`
      SELECT id, email, name, role 
      FROM "User" 
      WHERE role = 'admin' AND "isActive" = true 
      LIMIT 1
    `);
    
    return NextResponse.json({
      status: 'success',
      database: {
        connected: true,
        currentTime: connectionTest.rows[0].current_time
      },
      users: {
        totalCount: parseInt(userCount.rows[0].count),
        sampleUsers: sampleUsers.rows,
        hasAdmin: adminUser.rows.length > 0,
        adminUser: adminUser.rows[0] || null
      }
    });
  } catch (error) {
    console.error('Database status check failed:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      database: {
        connected: false
      }
    }, { status: 500 });
  }
} 
import { query } from '../database';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  clientId?: string;
  email: string;
  password: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role?: string;
  clientId?: string;
}

// Find user by email
export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await query(
    'SELECT * FROM "User" WHERE email = $1 AND "isActive" = true',
    [email]
  );
  return result.rows[0] || null;
}

// Find user by ID
export async function findUserById(id: string): Promise<User | null> {
  const result = await query(
    'SELECT * FROM "User" WHERE id = $1 AND "isActive" = true',
    [id]
  );
  return result.rows[0] || null;
}

// Create new user
export async function createUser(data: CreateUserData): Promise<User> {
  const hashedPassword = await bcrypt.hash(data.password, 12);
  
  const result = await query(
    `INSERT INTO "User" (email, password, name, role, "clientId")
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.email, hashedPassword, data.name, data.role || 'user', data.clientId]
  );
  
  return result.rows[0];
}

// Update user
export async function updateUser(id: string, data: Partial<CreateUserData>): Promise<User | null> {
  const fields = [];
  const values = [];
  let paramCount = 1;

  if (data.email) {
    fields.push(`email = $${paramCount}`);
    values.push(data.email);
    paramCount++;
  }
  
  if (data.name) {
    fields.push(`name = $${paramCount}`);
    values.push(data.name);
    paramCount++;
  }
  
  if (data.role) {
    fields.push(`role = $${paramCount}`);
    values.push(data.role);
    paramCount++;
  }
  
  if (data.password) {
    const hashedPassword = await bcrypt.hash(data.password, 12);
    fields.push(`password = $${paramCount}`);
    values.push(hashedPassword);
    paramCount++;
  }

  if (fields.length === 0) {
    return null;
  }

  values.push(id);
  const result = await query(
    `UPDATE "User" SET ${fields.join(', ')}, "updatedAt" = CURRENT_TIMESTAMP
     WHERE id = $${paramCount} AND "isActive" = true
     RETURNING *`,
    values
  );
  
  return result.rows[0] || null;
}

// Delete user (soft delete)
export async function deleteUser(id: string): Promise<boolean> {
  const result = await query(
    'UPDATE "User" SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1',
    [id]
  );
  return result.rowCount > 0;
}

// Get all users
export async function getAllUsers(): Promise<User[]> {
  const result = await query(
    'SELECT * FROM "User" WHERE "isActive" = true ORDER BY "createdAt" DESC'
  );
  return result.rows;
}

// Get users by client
export async function getUsersByClient(clientId: string): Promise<User[]> {
  const result = await query(
    'SELECT * FROM "User" WHERE "clientId" = $1 AND "isActive" = true ORDER BY "createdAt" DESC',
    [clientId]
  );
  return result.rows;
} 
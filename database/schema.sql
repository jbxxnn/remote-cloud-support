-- Database schema for remote support system
-- Run this SQL to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS "User" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients table
CREATE TABLE IF NOT EXISTS "Client" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    company TEXT,
    "apiKey" TEXT UNIQUE DEFAULT gen_random_uuid()::text,
    "webhookUrl" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'active',
    notes TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Devices table
CREATE TABLE IF NOT EXISTS "Device" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT NOT NULL,
    name TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    location TEXT,
    "deviceType" TEXT DEFAULT 'camera',
    "isActive" BOOLEAN DEFAULT true,
    metadata JSONB,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("clientId") REFERENCES "Client"(id) ON DELETE CASCADE
);

-- Detections table
CREATE TABLE IF NOT EXISTS "Detection" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "detectionType" TEXT NOT NULL,
    confidence FLOAT NOT NULL,
    "clipUrl" TEXT,
    location TEXT,
    severity TEXT DEFAULT 'medium',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("clientId") REFERENCES "Client"(id) ON DELETE CASCADE,
    FOREIGN KEY ("deviceId") REFERENCES "Device"(id) ON DELETE CASCADE
);

-- Alerts table
CREATE TABLE IF NOT EXISTS "Alert" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "detectionId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    message TEXT NOT NULL,
    "sentAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("detectionId") REFERENCES "Detection"(id) ON DELETE CASCADE,
    FOREIGN KEY ("clientId") REFERENCES "Client"(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);
CREATE INDEX IF NOT EXISTS idx_user_client_id ON "User"("clientId");
CREATE INDEX IF NOT EXISTS idx_client_email ON "Client"(email);
CREATE INDEX IF NOT EXISTS idx_device_client_id ON "Device"("clientId");
CREATE INDEX IF NOT EXISTS idx_device_device_id ON "Device"("deviceId");
CREATE INDEX IF NOT EXISTS idx_detection_client_id ON "Detection"("clientId");
CREATE INDEX IF NOT EXISTS idx_detection_device_id ON "Detection"("deviceId");
CREATE INDEX IF NOT EXISTS idx_detection_timestamp ON "Detection"(timestamp);
CREATE INDEX IF NOT EXISTS idx_alert_detection_id ON "Alert"("detectionId");
CREATE INDEX IF NOT EXISTS idx_alert_client_id ON "Alert"("clientId");

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_updated_at BEFORE UPDATE ON "Client" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_device_updated_at BEFORE UPDATE ON "Device" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 
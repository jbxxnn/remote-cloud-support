-- Seed data for remote support system
-- Run this after creating the schema

-- Insert admin user (password: admin123)
INSERT INTO "User" (id, email, password, name, role, "isActive", "createdAt", "updatedAt") VALUES 
('admin-001', 'admin@example.com', '$2b$12$ph70qLycMg1cPyuPvHKQhOmh7uZ7WJ29RRemF.NLCZ0wEExTSAvCm', 'System Admin', 'admin', true, NOW(), NOW());


-- Insert sample client
INSERT INTO "Client" (id, name, email, phone, company, "apiKey", "webhookUrl", "isActive", status, "createdAt", "updatedAt") VALUES 
('client-001', 'Sample Client', 'client@example.com', '+1234567890', 'Sample Company', 'api-key-001', 'https://example.com/webhook', true, 'active', NOW(), NOW());

-- Insert staff user for the client (password: staff123)
INSERT INTO "User" (id, "clientId", email, password, name, role, "isActive", "createdAt", "updatedAt") VALUES 
('staff-001', 'client-001', 'staff@example.com', '$2b$12$.HTo8OFbbsTBIM4203fSg.sZjVM90X1Yu/Nq1.bhpT5o9F1I.Mr3m', 'Staff User', 'staff', true, NOW(), NOW());

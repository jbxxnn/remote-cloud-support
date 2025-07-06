-- Seed data for remote support system
-- Run this after creating the schema

-- Insert admin user (password: admin123)
INSERT INTO "User" (id, email, password, name, role, "isActive", "createdAt", "updatedAt") VALUES 
('admin-001', 'admin@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8O', 'System Admin', 'admin', true, NOW(), NOW());

-- Insert sample client
INSERT INTO "Client" (id, name, email, phone, company, "apiKey", "webhookUrl", "isActive", status, "createdAt", "updatedAt") VALUES 
('client-001', 'Sample Client', 'client@example.com', '+1234567890', 'Sample Company', 'api-key-001', 'https://example.com/webhook', true, 'active', NOW(), NOW());

-- Insert staff user for the client (password: staff123)
INSERT INTO "User" (id, "clientId", email, password, name, role, "isActive", "createdAt", "updatedAt") VALUES 
('staff-001', 'client-001', 'staff@example.com', '$2a$12$8K1p/a0dL1LXMIgoEDFrwOe6g7fKj/5KqJ9KqJ9KqJ9KqJ9KqJ9KqJ', 'Staff User', 'staff', true, NOW(), NOW());

-- Insert sample device
INSERT INTO "Device" (id, "clientId", name, "deviceId", location, "deviceType", "isActive", metadata, "createdAt", "updatedAt") VALUES 
('device-001', 'client-001', 'Living Room Camera', 'camera_living_room', 'Living Room', 'camera', true, '{"resolution": "1080p", "fps": 30}', NOW(), NOW());

-- Insert sample detection
INSERT INTO "Detection" (id, "clientId", "deviceId", "detectionType", confidence, "clipUrl", location, severity, timestamp, "createdAt", "updatedAt") VALUES 
('detection-001', 'client-001', 'device-001', 'person', 0.95, 'https://example.com/clip1.mp4', 'Living Room', 'medium', NOW() - INTERVAL '1 hour', NOW(), NOW()),
('detection-002', 'client-001', 'device-001', 'fall', 0.87, 'https://example.com/clip2.mp4', 'Living Room', 'high', NOW() - INTERVAL '30 minutes', NOW(), NOW());

-- Insert sample alert
INSERT INTO "Alert" (id, "detectionId", "clientId", type, status, message, "sentAt", "createdAt", "updatedAt") VALUES 
('alert-001', 'detection-002', 'client-001', 'email', 'sent', 'Fall detection alert: High confidence fall detected in Living Room', NOW() - INTERVAL '25 minutes', NOW(), NOW()); 
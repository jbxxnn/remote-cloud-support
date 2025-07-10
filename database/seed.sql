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

-- Insert sample SOPs for different detection types
INSERT INTO "SOP" (id, name, description, "eventType", steps, "isGlobal", "clientId", "isActive", "createdAt", "updatedAt") VALUES 
-- Global Fall Detection SOP
('sop-001', 'Fall Detection Response', 'Standard procedure for responding to fall detection alerts', 'fall', 
 '["Immediately attempt to contact the client via video call", "If no response within 30 seconds, check the video clip for severity", "If serious fall or no response, contact emergency services immediately", "Document all actions taken and outcome"]', 
 true, NULL, true, NOW(), NOW()),

-- Global Motion Detection SOP  
('sop-002', 'Motion Detection Response', 'Standard procedure for responding to motion detection alerts', 'motion',
 '["Review the video clip to identify the source of motion", "If unexpected activity, attempt to contact the client", "If no response, check if motion is from authorized personnel", "Document findings and any actions taken"]',
 true, NULL, true, NOW(), NOW()),

-- Global Door Open Detection SOP
('sop-003', 'Door Open Detection Response', 'Standard procedure for responding to door open detection alerts', 'door_open',
 '["Check the video clip to see who opened the door", "If unexpected person, attempt to contact the client immediately", "If no response, contact emergency services", "Document the incident and actions taken"]',
 true, NULL, true, NOW(), NOW()),

-- Client-specific Fall Detection SOP
('sop-004', 'Client-Specific Fall Response', 'Customized fall response for Sample Client', 'fall',
 '["Call client immediately using their preferred contact method", "If no answer, try emergency contact", "Check medical history for fall risk factors", "Follow up with family member if needed"]',
 false, 'client-001', true, NOW(), NOW()),

-- Global Person Detection SOP
('sop-005', 'Person Detection Response', 'Standard procedure for responding to person detection alerts', 'person',
 '["Review video clip to identify the person", "If unknown person, attempt to contact the client", "If client confirms visitor, document the visit", "If suspicious activity, contact authorities"]',
 true, NULL, true, NOW(), NOW()); 
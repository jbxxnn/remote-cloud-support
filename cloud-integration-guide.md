# Fall Detection System - Cloud Integration Guide

## Overview

This document outlines the cloud integration architecture and implementation for the fall detection system. The system currently operates at the edge with local processing and now includes cloud communication capabilities for enterprise-grade monitoring and alerting.

## Current System Architecture

```
Camera → Frigate → Clip Worker → CodeProject.AI → Home Assistant → Cloud Server
   ↓         ↓           ↓              ↓              ↓            ↓
Motion   Recording   Processing    Person/Fall    Orchestration  Alerts
Detection            & Analysis    Detection      & MQTT         & Logging
```

## Multi-Tenant Architecture

### Client & Device Management

The system is designed to handle multiple clients, each with multiple detection devices:

- **Clients**: Organizations, facilities, or customers using the system
- **Devices**: Individual cameras, sensors, or detection units per client
- **Users**: Admin users who can access client data (system-wide or client-specific)
- **Detections**: Events from specific devices belonging to specific clients

### Key Features:
- **Client Isolation**: Each client's data is completely separated
- **Device Management**: Automatic device registration and tracking
- **Role-Based Access**: System admins vs client-specific users
- **Scalable Architecture**: Supports unlimited clients and devices

## Cloud Integration Components

### 1. Home Assistant Webhook Integration

**Purpose**: Sends detection events to cloud server in real-time

**Configuration**:
```yaml
# ha-config/configuration.yaml
webhook:
  - name: "Cloud Integration"
    url: "http://YOUR_SERVER_IP:3000/api/webhooks/detections"
    method: POST
    headers:
      Content-Type: "application/json"
      Authorization: "Bearer YOUR_API_KEY"
```

**Event Payload Structure**:
```json
{
  "event_type": "person_detected",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "device_id": "front_door_camera_001",
    "client_id": "client_abc123",
    "confidence": 0.85,
    "detection_type": "person",
    "clip_url": "http://localhost:5000/api/events/123/clip.mp4",
    "location": "Living Room",
    "severity": "medium"
  }
}
```

### 2. Local Webhook Server (Testing)

**Purpose**: Validates webhook integration before cloud deployment

**Implementation**: Flask-based server with dashboard
- **Port**: 8080
- **Features**: Real-time detection display, API endpoints, logging
- **URL**: `http://YOUR_HOST_IP:8080`

**Key Endpoints**:
- `POST /webhook` - Receives detection data
- `GET /dashboard` - Real-time detection display
- `GET /api/detections` - JSON API for detections

### 3. Cloud Server Architecture (Next.js)

**Recommended Structure**:
```
cloud-server/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── webhooks/
│   │   │   │   └── detections/
│   │   │   │       └── route.ts
│   │   │   ├── clients/
│   │   │   │   └── route.ts
│   │   │   ├── devices/
│   │   │   │   └── route.ts
│   │   │   ├── detections/
│   │   │   │   └── route.ts
│   │   │   └── auth/
│   │   │       └── route.ts
│   │   ├── dashboard/
│   │   │   ├── clients/
│   │   │   │   └── [clientId]/
│   │   │   │       └── page.tsx
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   └── permissions.ts
│   └── components/
│       ├── DetectionCard.tsx
│       ├── ClientList.tsx
│       ├── DeviceList.tsx
│       └── DashboardStats.tsx
├── prisma/
│   └── schema.prisma
└── package.json
```

## Database Schema (Prisma)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Client {
  id          String   @id @default(cuid())
  name        String
  apiKey      String   @unique
  webhookUrl  String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  devices     Device[]
  detections  Detection[]
  alerts      Alert[]
  users       User[]
}

model Device {
  id          String   @id @default(cuid())
  clientId    String
  name        String
  deviceId    String   // Unique identifier from Home Assistant
  location    String?
  deviceType  String   @default("camera") // "camera", "sensor", "gateway"
  isActive    Boolean  @default(true)
  metadata    Json?    // Additional device-specific data
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  client      Client   @relation(fields: [clientId], references: [id])
  detections  Detection[]
}

model Detection {
  id            String   @id @default(cuid())
  clientId      String
  deviceId      String   // References Device, not just cameraId string
  detectionType String   // "person", "fall", etc.
  confidence    Float
  clipUrl       String?
  location      String?
  severity      String   @default("medium") // "low", "medium", "high", "critical"
  timestamp     DateTime @default(now())
  
  client        Client   @relation(fields: [clientId], references: [id])
  device        Device   @relation(fields: [deviceId], references: [id])
  alerts        Alert[]
}

model Alert {
  id          String   @id @default(cuid())
  detectionId String
  clientId    String
  type        String   // "email", "sms", "push", "webhook"
  status      String   @default("pending") // "pending", "sent", "failed"
  message     String
  sentAt      DateTime?
  createdAt   DateTime @default(now())
  
  detection   Detection @relation(fields: [detectionId], references: [id])
  client      Client    @relation(fields: [clientId], references: [id])
}

model User {
  id        String   @id @default(cuid())
  clientId  String?  // Null for system admins
  email     String   @unique
  name      String
  role      String   @default("user") // "admin", "user", "client_admin"
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  client    Client?  @relation(fields: [clientId], references: [id])
}
```

## API Endpoints

### 1. Webhook Endpoint
```typescript
// src/app/api/webhooks/detections/route.ts
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');
    
    // Validate API key
    const apiKey = authHeader?.replace('Bearer ', '');
    const client = await prisma.client.findUnique({
      where: { apiKey, isActive: true }
    });
    
    if (!client) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Find or create device
    let device = await prisma.device.findFirst({
      where: {
        clientId: client.id,
        deviceId: body.data.device_id
      }
    });
    
    if (!device) {
      device = await prisma.device.create({
        data: {
          clientId: client.id,
          name: body.data.device_id,
          deviceId: body.data.device_id,
          location: body.data.location,
          deviceType: 'camera'
        }
      });
    }
    
    // Store detection
    const detection = await prisma.detection.create({
      data: {
        clientId: client.id,
        deviceId: device.id,
        detectionType: body.data.detection_type,
        confidence: body.data.confidence,
        clipUrl: body.data.clip_url,
        location: body.data.location,
        severity: body.data.severity || 'medium',
        timestamp: new Date(body.timestamp)
      }
    });
    
    // Trigger alerts based on severity
    await triggerAlerts(detection, client);
    
    return Response.json({ success: true, detectionId: detection.id });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 2. Detections API
```typescript
// src/app/api/detections/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const deviceId = searchParams.get('deviceId');
  const limit = parseInt(searchParams.get('limit') || '50');
  
  const detections = await prisma.detection.findMany({
    where: {
      ...(clientId && { clientId }),
      ...(deviceId && { deviceId })
    },
    include: { 
      client: true,
      device: true
    },
    orderBy: { timestamp: 'desc' },
    take: limit
  });
  
  return Response.json(detections);
}
```

### 3. Clients API
```typescript
// src/app/api/clients/route.ts
export async function GET() {
  const clients = await prisma.client.findMany({
    include: {
      _count: { 
        select: { 
          detections: true,
          devices: true,
          users: true
        } 
      },
      devices: {
        select: {
          id: true,
          name: true,
          deviceType: true,
          isActive: true,
          _count: { select: { detections: true } }
        }
      }
    }
  });
  
  return Response.json(clients);
}

export async function POST(request: Request) {
  const body = await request.json();
  
  const client = await prisma.client.create({
    data: {
      name: body.name,
      apiKey: generateApiKey(),
      webhookUrl: body.webhookUrl
    }
  });
  
  return Response.json(client);
}
```

### 4. Devices API
```typescript
// src/app/api/devices/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  
  const devices = await prisma.device.findMany({
    where: clientId ? { clientId } : {},
    include: {
      client: true,
      _count: { select: { detections: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return Response.json(devices);
}

export async function POST(request: Request) {
  const body = await request.json();
  
  const device = await prisma.device.create({
    data: {
      clientId: body.clientId,
      name: body.name,
      deviceId: body.deviceId,
      location: body.location,
      deviceType: body.deviceType || 'camera',
      metadata: body.metadata
    }
  });
  
  return Response.json(device);
}
```

## Alert System

### Alert Triggers
```typescript
async function triggerAlerts(detection: Detection, client: Client) {
  const alertConfigs = {
    critical: ['sms', 'email', 'push'],
    high: ['email', 'push'],
    medium: ['email'],
    low: []
  };
  
  const alertTypes = alertConfigs[detection.severity as keyof typeof alertConfigs] || [];
  
  for (const alertType of alertTypes) {
    await prisma.alert.create({
      data: {
        detectionId: detection.id,
        clientId: client.id,
        type: alertType,
        message: generateAlertMessage(detection, alertType)
      }
    });
  }
}
```

### External Alert Services
- **SMS**: Twilio integration
- **Email**: SendGrid or AWS SES
- **Push**: Firebase Cloud Messaging
- **Webhook**: Custom webhook URLs per client

## Security Considerations

### 1. API Key Management
- Generate secure API keys for each client
- Implement key rotation
- Store keys hashed in database

### 2. Rate Limiting
```typescript
// Implement rate limiting per client
const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each client to 100 requests per windowMs
};
```

### 3. Data Validation
- Validate all incoming webhook data
- Sanitize inputs
- Implement request size limits

### 4. Authentication
- JWT tokens for admin access
- API key validation for webhooks
- Role-based access control

## Monitoring & Analytics

### 1. Detection Metrics
- Detection frequency by client
- Confidence score distribution
- False positive analysis
- Response time tracking

### 2. System Health
- Webhook delivery success rates
- Alert delivery status
- Database performance
- API response times

### 3. Dashboard Features
- Real-time detection feed
- Client management interface
- Alert configuration
- Analytics and reporting

## Deployment Considerations

### 1. Environment Variables
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-jwt-secret"
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"
SENDGRID_API_KEY="your-sendgrid-key"
```

### 2. Infrastructure
- **Database**: PostgreSQL (managed or self-hosted)
- **Hosting**: Vercel, AWS, or self-hosted
- **CDN**: For static assets and video clips
- **Monitoring**: Sentry for error tracking

### 3. Scaling
- Database connection pooling
- Redis for caching
- Load balancing for high traffic
- CDN for video clip delivery

## Implementation Phases

### Phase 1: Basic Webhook Integration ✅
- [x] Home Assistant webhook configuration
- [x] Local webhook server for testing
- [x] Basic detection data structure

### Phase 2: Cloud Server Foundation
- [ ] Next.js project setup
- [ ] Database schema implementation
- [ ] Basic API endpoints
- [ ] Authentication system

### Phase 3: Alert System
- [ ] Email integration
- [ ] SMS integration
- [ ] Push notifications
- [ ] Alert configuration UI

### Phase 4: Advanced Features
- [ ] Real-time dashboard
- [ ] Analytics and reporting
- [ ] Client management
- [ ] Video clip storage

### Phase 5: Production Ready
- [ ] Security hardening
- [ ] Performance optimization
- [ ] Monitoring and logging
- [ ] Documentation and training

## Testing Strategy

### 1. Unit Tests
- API endpoint validation
- Database operations
- Alert generation logic

### 2. Integration Tests
- Webhook end-to-end flow
- Alert delivery verification
- Database consistency

### 3. Load Testing
- Webhook throughput
- Database performance
- Alert system capacity

## Current Status

- ✅ **Edge Detection**: Working with person detection
- ✅ **Home Assistant**: Configured and operational
- ✅ **Local Webhook**: Tested and functional
- 🔄 **Cloud Server**: Ready for Next.js implementation
- ⏳ **Alert System**: Planned for Phase 3
- ⏳ **Production**: Planned for Phase 5

## Next Steps for Cursor Agent

1. **Set up Next.js project** with the recommended structure
2. **Implement Prisma schema** and database setup
3. **Create API routes** for webhooks, detections, and clients
4. **Build authentication system** for admin access
5. **Develop dashboard** for real-time monitoring
6. **Integrate alert services** (email, SMS, push)
7. **Add security measures** (rate limiting, validation)
8. **Implement monitoring** and analytics

## Key Files to Create

1. `package.json` - Next.js dependencies
2. `prisma/schema.prisma` - Database schema
3. `src/app/api/webhooks/detections/route.ts` - Webhook endpoint
4. `src/app/api/detections/route.ts` - Detections API
5. `src/app/api/clients/route.ts` - Clients API
6. `src/app/api/devices/route.ts` - Devices API
7. `src/app/dashboard/page.tsx` - System admin dashboard
8. `src/app/dashboard/clients/[clientId]/page.tsx` - Client-specific dashboard
9. `src/lib/prisma.ts` - Database client
10. `src/lib/auth.ts` - Authentication utilities
11. `src/lib/permissions.ts` - Role-based access control
12. `src/components/ClientList.tsx` - Client management component
13. `src/components/DeviceList.tsx` - Device management component
14. `src/components/DashboardStats.tsx` - Analytics dashboard
15. `.env.example` - Environment variables template
16. `README.md` - Project documentation

This architecture provides a scalable, secure, and extensible foundation for the fall detection cloud integration system. 
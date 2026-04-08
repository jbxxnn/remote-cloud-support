const fs = require('fs');
const envPath = fs.existsSync('.env.local') ? '.env.local' : '../.env.local';
require('dotenv').config({ path: envPath });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.SIGNALING_PORT || 3001;
const CALL_TOKEN_SECRET = process.env.CALL_TOKEN_SECRET;

if (!CALL_TOKEN_SECRET) {
  console.error('❌ Error: CALL_TOKEN_SECRET is not defined in .env.local');
  process.exit(1);
}

// Socket.io Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }

  try {
    const decoded = jwt.verify(token, CALL_TOKEN_SECRET);
    socket.user = decoded; // { userId, role, callSessionId }
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  const { userId, role, callSessionId } = socket.user;
  console.log(`🔌 [SIGNALING] User Joined: ${userId} (${role}) | Session: ${callSessionId || 'NONE'}`);
  
  // Join per-user room for persistent invites
  const userRoom = `user:${userId}`;
  socket.join(userRoom);
  console.log(`🏠 Joined room: ${userRoom}`);
  
  // Join per-client room for client-wide signaling
  if (socket.user.clientId) {
    const clientRoom = `client:${socket.user.clientId}`;
    socket.join(clientRoom);
    console.log(`🏠 Joined room: ${clientRoom}`);
  }
  
  // Join specific call session room if present
  if (callSessionId) {
    socket.join(callSessionId);
    console.log(`📞 Joined call room: ${callSessionId}`);
    
    // Log occupancy
    const room = io.sockets.adapter.rooms.get(callSessionId);
    console.log(`📊 Room ${callSessionId} occupancy: ${room ? room.size : 0} participant(s)`);
    
    socket.to(callSessionId).emit('user:joined', { userId, role });
  }

  socket.on('call:invite', (data) => {
    const { toUserId, toClientId, callSessionId: inviteCallId } = data;
    console.log(`📨 INVITE: [${userId}] -> [TargetUserId: ${toUserId}, TargetClientId: ${toClientId}] (Call: ${inviteCallId})`);
    
    if (toClientId) {
      console.log(`👉 Routing to client: client:${toClientId}`);
      socket.to(`client:${toClientId}`).emit('call:invite', { ...data, from: userId });
    } else if (toUserId) {
      console.log(`👉 Routing to user: user:${toUserId}`);
      socket.to(`user:${toUserId}`).emit('call:invite', { ...data, from: userId });
    } else {
      console.log(`👉 Routing to call room: ${inviteCallId}`);
      socket.to(inviteCallId).emit('call:invite', { ...data, from: userId });
    }
  });

  socket.on('call:join', ({ callSessionId: joinId }) => {
    socket.join(joinId);
    console.log(`☎️ JOIN: User ${userId} joined room ${joinId}`);
    socket.to(joinId).emit('user:joined', { userId, role });
  });

  socket.on('call:offer', (data) => {
    console.log(`📤 OFFER: [${userId}] -> session [${data.callSessionId}]`);
    socket.to(data.callSessionId).emit('call:offer', { ...data, from: userId });
  });

  socket.on('call:answer', (data) => {
    console.log(`📥 ANSWER: [${userId}] -> session [${data.callSessionId}]`);
    socket.to(data.callSessionId).emit('call:answer', { ...data, from: userId });
  });

  socket.on('call:ice-candidate', (data) => {
    socket.to(data.callSessionId).emit('call:ice-candidate', { ...data, from: userId });
  });

  socket.on('call:end', (data) => {
    const targetRoom = data?.callSessionId || callSessionId;
    console.log(`🔚 END CALL: [${userId}] ending session [${targetRoom}]`);
    if (targetRoom) {
      socket.to(targetRoom).emit('call:end', { from: userId });
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ DISCONNECT: User ${userId}`);
    if (callSessionId) {
      socket.to(callSessionId).emit('user:left', { userId });
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', clientCount: io.engine.clientsCount });
});

server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
});

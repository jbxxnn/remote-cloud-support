const { io } = require('socket.io-client');
const token = process.argv[2];

if (!token) {
  console.error('❌ Error: Token is required. Run node scripts/test-signaling.js first.');
  process.exit(1);
}

const socket = io('http://localhost:3001', {
  auth: { token },
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('✅ Connected to Signaling Server!');
  console.log('🔗 Socket ID:', socket.id);
  
  // Test join message
  console.log('📤 Sending ping (user:joined)...');
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
});

socket.on('user:joined', (data) => {
  console.log('📥 Received user:joined event:', data);
  // After connection, we can disconnect
  setTimeout(() => {
    console.log('👋 Disconnecting...');
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected.');
});

const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

const CALL_TOKEN_SECRET = process.env.CALL_TOKEN_SECRET;

if (!CALL_TOKEN_SECRET) {
  console.error('❌ CALL_TOKEN_SECRET not found in .env.local');
  process.exit(1);
}

const payload = {
  userId: 'test-user-id',
  role: 'staff',
  callSessionId: 'test-session-id'
};

const token = jwt.sign(payload, CALL_TOKEN_SECRET, { expiresIn: '1h' });
console.log('✅ Generated Token:', token);
console.log('---');
console.log('Instructions:');
console.log('1. Start signaling server: cd signaling && node server.js');
console.log('2. Connect with token: node scripts/connect-signaling.js ' + token);

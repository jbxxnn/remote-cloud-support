// Using native fetch (Node.js 18+)
// If you're using Node.js < 18, install node-fetch: npm install node-fetch@2

const API_KEY = 'api-key-001';
// Update this to your production URL: https://rss.re-circuit.com/api/webhooks/detections
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/detections';

const testDetection = {
  device_id: 'camera_001',
  reason: 'fall',
  confidence: 0.85,
  image_topic: 'https://example.com/test_clip.mp4',
  camera: 'Living Room',
  severity: 'high',
  ts: Date.now()
};

async function testWebhook() {
  try {
    console.log('Sending test detection to webhook...');
    console.log('URL:', WEBHOOK_URL);
    console.log('Payload:', JSON.stringify(testDetection, null, 2));
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(testDetection)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Get response as text first to check if it's HTML
    const responseText = await response.text();
    
    // Check if response is HTML (error page)
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.error('❌ Server returned HTML instead of JSON. This usually means:');
      console.error('   1. The Next.js dev server is not running');
      console.error('   2. The route does not exist');
      console.error('   3. There was a server error');
      console.error('\nResponse preview:', responseText.substring(0, 500));
      console.error('\n💡 Make sure you have the dev server running: npm run dev');
      return;
    }
    
    // Try to parse as JSON
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON');
      console.error('Response text:', responseText);
      return;
    }
    
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Webhook test successful!');
      if (result.detectionId) {
        console.log('Detection ID:', result.detectionId);
      }
    } else {
      console.log('❌ Webhook test failed!');
      if (result.error) {
        console.log('Error:', result.error);
      }
    }
  } catch (error) {
    console.error('Error testing webhook:', error);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection refused. Make sure the Next.js dev server is running:');
      console.error('   npm run dev');
    }
  }
}

testWebhook(); 
// Using native fetch (Node.js 18+)
// If you're using Node.js < 18, install node-fetch: npm install node-fetch@2

const API_KEY = 'a4b2df33-208e-48f3-bc0d-8ac988ff251c';
// Update this to your production URL: https://rss.re-circuit.com/api/webhooks/detections
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/detections';

const testDetection = {
  timestamp: Date.now(),
  data: {
    device_id: 'camera_001',
    detection_type: 'fall',
    confidence: 0.85,
    clip_url: 'https://example.com/test_clip.mp4',
    location: 'Living Room',
    severity: 'high'
  }
};

async function testWebhook() {
  try {
    console.log('Sending test detection to webhook...');
    console.log('Payload:', JSON.stringify(testDetection, null, 2));
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(testDetection)
    });

    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Webhook test successful!');
      console.log('Detection ID:', result.detectionId);
    } else {
      console.log('❌ Webhook test failed!');
    }
  } catch (error) {
    console.error('Error testing webhook:', error);
  }
}

testWebhook(); 
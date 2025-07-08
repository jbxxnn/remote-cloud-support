const fetch = require('node-fetch');

const API_KEY = '6630db19-0f12-4980-81d0-4d920577bca2';
const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/detections';

const testDetection = {
  timestamp: Date.now(),
  data: {
    device_id: 'test-device-001',
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
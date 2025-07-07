// Test script to simulate detection webhook
// Run with: node test-detection-webhook.js

async function testDetectionWebhook() {
  const webhookUrl = 'http://localhost:3000/api/webhooks/detections';
  
  // You'll need to replace this with a real API key from your database
  const apiKey = '6630db19-0f12-4980-81d0-4d920577bca2'; // Get this from the Client table
  
  const detectionData = {
    timestamp: new Date().toISOString(),
    data: {
      device_id: 'test-camera-001',
      detection_type: 'motion',
      confidence: 0.85,
      clip_url: 'https://example.com/video-clip.mp4',
      location: 'Living Room',
      severity: 'medium'
    }
  };

  try {
    console.log('Sending detection webhook...');
    console.log('Data:', JSON.stringify(detectionData, null, 2));
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(detectionData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Detection webhook successful!');
      console.log('Response:', result);
      console.log('\n📋 Next steps:');
      console.log('1. Check the Event table in your database');
      console.log('2. Verify an event was created with status "alert"');
      console.log('3. Check the staff dashboard to see the new event');
    } else {
      console.log('❌ Detection webhook failed!');
      console.log('Status:', response.status);
      console.log('Response:', result);
    }
  } catch (error) {
    console.error('❌ Error testing webhook:', error);
  }
}

// Instructions
console.log('🔧 Detection → Event Flow Test');
console.log('================================');
console.log('');
console.log('Before running this test:');
console.log('1. Make sure your server is running (npm run dev)');
console.log('2. The API key is already set in the script');
console.log('3. Run: node test-detection-webhook.js');
console.log('');

// Run the test
testDetectionWebhook(); 
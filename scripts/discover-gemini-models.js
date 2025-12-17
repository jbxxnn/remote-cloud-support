/**
 * Script to discover available Gemini models
 * 
 * Usage: node scripts/discover-gemini-models.js
 */

require('dotenv').config({ path: '.env.local' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}

async function discoverModels() {
  try {
    console.log('Fetching available Gemini models...\n');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to list models: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.models || data.models.length === 0) {
      console.log('No models found.');
      return;
    }

    console.log(`Found ${data.models.length} models:\n`);
    console.log('='.repeat(80));
    
    // Filter models that support generateContent
    const supportedModels = data.models.filter(model => 
      model.supportedGenerationMethods?.includes('generateContent')
    );

    console.log(`\nModels supporting generateContent (${supportedModels.length}):\n`);
    
    supportedModels.forEach((model, index) => {
      const modelName = model.name?.replace('models/', '') || model.name;
      console.log(`${index + 1}. ${modelName}`);
      console.log(`   Display Name: ${model.displayName || 'N/A'}`);
      console.log(`   Description: ${model.description || 'N/A'}`);
      console.log(`   Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
      console.log(`   Version: ${model.version || 'N/A'}`);
      console.log('');
    });

    // Find flash models
    const flashModels = supportedModels.filter(model => 
      model.name?.toLowerCase().includes('flash')
    );

    if (flashModels.length > 0) {
      console.log('\nRecommended Flash Models:\n');
      flashModels.forEach(model => {
        const modelName = model.name?.replace('models/', '') || model.name;
        console.log(`  - ${modelName}`);
      });
    }

    // Find pro models
    const proModels = supportedModels.filter(model => 
      model.name?.toLowerCase().includes('pro')
    );

    if (proModels.length > 0) {
      console.log('\nPro Models:\n');
      proModels.forEach(model => {
        const modelName = model.name?.replace('models/', '') || model.name;
        console.log(`  - ${modelName}`);
      });
    }

    // Suggest best model
    let suggestedModel = null;
    if (flashModels.length > 0) {
      const latestFlash = flashModels.find(m => 
        m.name.includes('latest') || m.name.includes('001')
      );
      suggestedModel = latestFlash || flashModels[0];
    } else if (proModels.length > 0) {
      const latestPro = proModels.find(m => 
        m.name.includes('latest') || m.name.includes('001')
      );
      suggestedModel = latestPro || proModels[0];
    } else if (supportedModels.length > 0) {
      suggestedModel = supportedModels[0];
    }

    if (suggestedModel) {
      const modelName = suggestedModel.name?.replace('models/', '') || suggestedModel.name;
      console.log('\n' + '='.repeat(80));
      console.log(`\n✅ Suggested Model: ${modelName}`);
      console.log(`\nUpdate your .env.local file with:`);
      console.log(`GEMINI_MODEL=${modelName}\n`);
    }

  } catch (error) {
    console.error('Error discovering models:', error.message);
    process.exit(1);
  }
}

discoverModels();


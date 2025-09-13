/**
 * Test script for Python AI API integration
 * Run this to test the connection to your Python FastAPI endpoint
 */

const axios = require('axios');
require('dotenv').config();

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

async function testPythonAIAPI() {
  console.log('🧪 Testing Python AI API Integration...\n');
  console.log(`📡 FastAPI URL: ${FASTAPI_URL}`);
  
  try {
    // Test 1: Health check
    console.log('\n1️⃣ Testing health endpoint...');
    try {
      const healthResponse = await axios.get(`${FASTAPI_URL}/health`, {
        timeout: 5000
      });
      console.log('✅ Health check passed:', healthResponse.status);
    } catch (healthError) {
      console.log('⚠️ Health check failed (this is optional):', healthError.message);
    }

    // Test 2: AI Response endpoint
    console.log('\n2️⃣ Testing AI response endpoint...');
    const testQuery = "What are the patient's symptoms?";
    
    const response = await axios({
      method: 'POST',
      url: `${FASTAPI_URL}/api/v1/chat/ai-response`,
      data: {
        query: testQuery
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ API Response received!');
    console.log('📊 Status:', response.status);
    console.log('📝 Response structure:');
    console.log('   - response:', typeof response.data.response, response.data.response ? '(present)' : '(missing)');
    console.log('   - patient_context:', Array.isArray(response.data.patient_context) ? `array with ${response.data.patient_context.length} items` : typeof response.data.patient_context);
    console.log('   - timestamp:', response.data.timestamp ? 'present' : 'missing');
    
    if (response.data.response) {
      console.log('\n💬 Sample response:', response.data.response.substring(0, 100) + '...');
    }

    if (response.data.patient_context && response.data.patient_context.length > 0) {
      console.log('\n📋 Patient context available:', response.data.patient_context.length, 'records');
      const firstRecord = response.data.patient_context[0];
      console.log('   - First record ID:', firstRecord.record_id);
      console.log('   - Score:', firstRecord.score);
      console.log('   - Metadata keys:', Object.keys(firstRecord.metadata || {}));
    }

    console.log('\n🎉 Integration test completed successfully!');
    console.log('\n📌 Your Node.js chatbot server is ready to work with the Python AI API.');
    
  } catch (error) {
    console.error('\n❌ Integration test failed!');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Connection refused - Is your Python FastAPI server running on', FASTAPI_URL + '?');
      console.error('💡 Make sure to start your Python server first: uvicorn main:app --reload');
    } else if (error.response) {
      console.error('📡 API Error:', error.response.status, error.response.statusText);
      console.error('📝 Error details:', error.response.data);
    } else {
      console.error('🐛 Unexpected error:', error.message);
    }
    
    console.error('\n🔧 Troubleshooting tips:');
    console.error('1. Ensure Python FastAPI server is running');
    console.error('2. Check the FASTAPI_URL in your .env file');
    console.error('3. Verify the API endpoint path: /api/v1/chat/ai-response');
    console.error('4. Check if CORS is properly configured in your Python API');
  }
}

// Run the test
testPythonAIAPI();
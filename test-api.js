// API Testing Script
// Run this in a separate terminal: node test-api.js

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
let authToken = '';

async function testAuthAPI() {
  console.log('🔐 Testing Authentication API\n');

  // Test 1: Register a new user
  console.log('1️⃣ Testing Registration...');
  try {
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      username: 'testuser123',
      password: 'password123',
      email: 'test@example.com'
    });
    console.log('✅ Registration:', registerResponse.data);
  } catch (error) {
    console.log('ℹ️  Registration result:', error.response?.data?.message || 'User might already exist');
  }

  // Test 2: Login
  console.log('\n2️⃣ Testing Login...');
  try {
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'testuser123',
      password: 'password123'
    });
    console.log('✅ Login successful:', loginResponse.data);
    authToken = loginResponse.data.token;
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data);
    return;
  }

  // Test 3: Verify token (valid)
  console.log('\n3️⃣ Testing Token Verification (valid token)...');
  try {
    const verifyResponse = await axios.post(`${BASE_URL}/auth/verify`, {}, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    console.log('✅ Token verification successful:', verifyResponse.data);
  } catch (error) {
    console.log('❌ Token verification failed:', error.response?.data);
  }

  // Test 4: Verify token (invalid - no token)
  console.log('\n4️⃣ Testing Token Verification (no token - should get 401)...');
  try {
    const verifyResponse = await axios.post(`${BASE_URL}/auth/verify`);
    console.log('❌ Should not reach here:', verifyResponse.data);
  } catch (error) {
    console.log('✅ Correctly got 401:', error.response?.data);
  }

  // Test 5: Verify token (invalid token)
  console.log('\n5️⃣ Testing Token Verification (invalid token - should get 401)...');
  try {
    const verifyResponse = await axios.post(`${BASE_URL}/auth/verify`, {}, {
      headers: {
        'Authorization': 'Bearer invalid-token-here'
      }
    });
    console.log('❌ Should not reach here:', verifyResponse.data);
  } catch (error) {
    console.log('✅ Correctly got 401:', error.response?.data);
  }

  // Test 6: Access protected file endpoint without token
  console.log('\n6️⃣ Testing Protected File Endpoint (no token - should get 401)...');
  try {
    const fileResponse = await axios.get(`${BASE_URL}/files`);
    console.log('❌ Should not reach here:', fileResponse.data);
  } catch (error) {
    console.log('✅ Correctly got 401:', error.response?.data);
  }

  // Test 7: Access protected file endpoint with valid token
  console.log('\n7️⃣ Testing Protected File Endpoint (valid token)...');
  try {
    const fileResponse = await axios.get(`${BASE_URL}/files`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    console.log('✅ File endpoint accessible:', fileResponse.data);
  } catch (error) {
    console.log('ℹ️  File endpoint response:', error.response?.data);
  }
}

// Run the tests
testAuthAPI().catch(console.error);
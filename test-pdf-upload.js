/**
 * Test script for Python PDF upload integration
 * This tests the Node.js file upload endpoint that forwards to Python API
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const NODE_SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const PYTHON_API_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

// Sample JWT token - replace with actual token from authentication
const SAMPLE_TOKEN = 'your-jwt-token-here';

async function testPDFUploadIntegration() {
  console.log('🧪 Testing PDF Upload Integration...\n');
  console.log(`📡 Node.js Server: ${NODE_SERVER_URL}`);
  console.log(`🐍 Python API: ${PYTHON_API_URL}`);
  
  try {
    // Test 1: Check Python upload service health
    console.log('\n1️⃣ Testing Python upload service health...');
    try {
      const healthResponse = await axios.get(`${PYTHON_API_URL}/health`, {
        timeout: 5000
      });
      console.log('✅ Python service health check passed:', healthResponse.status);
    } catch (healthError) {
      console.log('❌ Python service health check failed:', healthError.message);
      console.log('⚠️ Make sure your Python FastAPI server is running on port 8000');
    }

    // Test 2: Check Node.js file service health
    console.log('\n2️⃣ Testing Node.js file service health...');
    try {
      const nodeHealthResponse = await axios.get(`${NODE_SERVER_URL}/api/files/health`);
      console.log('✅ Node.js file service health check passed:', nodeHealthResponse.status);
      console.log('📄 Response:', nodeHealthResponse.data);
    } catch (nodeHealthError) {
      console.log('❌ Node.js file service health check failed:', nodeHealthError.message);
      console.log('⚠️ Make sure your Node.js server is running on port 3001');
    }

    // Test 3: Direct Python API test
    console.log('\n3️⃣ Testing direct Python API upload endpoint...');
    
    // Create a simple test PDF content (this would normally be a real PDF file)
    const testPdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n198\n%%EOF');
    
    const directFormData = new FormData();
    directFormData.append('file', testPdfContent, {
      filename: 'test-direct.pdf',
      contentType: 'application/pdf'
    });

    try {
      const directResponse = await axios({
        method: 'POST',
        url: `${PYTHON_API_URL}/api/v1/upload/pdf`,
        data: directFormData,
        headers: {
          ...directFormData.getHeaders(),
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      console.log('✅ Direct Python API upload successful!');
      console.log('📊 Status:', directResponse.status);
      console.log('📝 Response:', JSON.stringify(directResponse.data, null, 2));
    } catch (directError) {
      console.log('❌ Direct Python API upload failed:', directError.message);
      if (directError.response) {
        console.log('📄 Error response:', directError.response.data);
      }
    }

    // Test 4: Node.js proxy upload (requires authentication)
    console.log('\n4️⃣ Testing Node.js proxy upload...');
    
    if (SAMPLE_TOKEN === 'your-jwt-token-here') {
      console.log('⚠️ Skipping Node.js proxy test - Please set a valid JWT token');
      console.log('💡 To get a token, login via: POST /api/auth/login');
      return;
    }

    const proxyFormData = new FormData();
    proxyFormData.append('file', testPdfContent, {
      filename: 'test-proxy.pdf',
      contentType: 'application/pdf'
    });

    try {
      const proxyResponse = await axios({
        method: 'POST',
        url: `${NODE_SERVER_URL}/api/files/upload`,
        data: proxyFormData,
        headers: {
          ...proxyFormData.getHeaders(),
          'Authorization': `Bearer ${SAMPLE_TOKEN}`,
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      console.log('✅ Node.js proxy upload successful!');
      console.log('📊 Status:', proxyResponse.status);
      console.log('📝 Response:', JSON.stringify(proxyResponse.data, null, 2));
    } catch (proxyError) {
      console.log('❌ Node.js proxy upload failed:', proxyError.message);
      if (proxyError.response) {
        console.log('📄 Error response:', proxyError.response.data);
      }
    }

    console.log('\n🎉 PDF Upload Integration test completed!');
    
  } catch (error) {
    console.error('\n❌ Integration test failed!', error.message);
  }
}

async function createSamplePDFFile() {
  console.log('\n📄 Creating sample PDF file for testing...');
  
  const samplePdfPath = path.join(__dirname, 'sample-test.pdf');
  const pdfContent = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Hello World!) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \n0000000218 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n298\n%%EOF';
  
  fs.writeFileSync(samplePdfPath, pdfContent);
  console.log('✅ Sample PDF created:', samplePdfPath);
  console.log('💡 You can use this file to test uploads manually');
}

// Run tests
if (require.main === module) {
  testPDFUploadIntegration()
    .then(() => createSamplePDFFile())
    .catch(error => {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testPDFUploadIntegration };
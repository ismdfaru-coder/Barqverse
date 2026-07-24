#!/usr/bin/env node

/**
 * QUICK TEST SCRIPT FOR USE.AI SCRAPER
 * Run: node test-scraper.js
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

console.log('🧪 Testing use.ai Scraper API\n');

async function test() {
  try {
    // Test 1: Health Check
    console.log('1️⃣  Testing health endpoint...');
    const healthRes = await axios.get(`${API_URL}/api/health`);
    console.log('✅ Health check passed');
    console.log(`   Status: ${healthRes.data.status}`);
    console.log(`   Uptime: ${healthRes.data.uptime.toFixed(2)}s\n`);

    // Test 2: Get Models
    console.log('2️⃣  Testing models endpoint...');
    const modelsRes = await axios.get(`${API_URL}/api/models`);
    console.log('✅ Models retrieved');
    console.log(`   Models: ${modelsRes.data.models.join(', ')}\n`);

    // Test 3: Scrape with valid data
    console.log('3️⃣  Testing scrape endpoint with valid data...');
    const scrapeRes = await axios.post(`${API_URL}/api/scrape`, {
      prompt: 'What is artificial intelligence?',
      model: 'Fable 5',
      email: TEST_EMAIL,
    });

    if (scrapeRes.data.success) {
      console.log('✅ Scrape request successful');
      console.log(`   Response length: ${scrapeRes.data.data.response.length} characters`);
      console.log(`   Duration: ${scrapeRes.data.data.duration}ms`);
      console.log(`   Model: ${scrapeRes.data.data.model}\n`);
    } else {
      console.error('❌ Scrape failed:', scrapeRes.data.error);
    }

    // Test 4: Invalid request (missing email)
    console.log('4️⃣  Testing error handling (missing email)...');
    try {
      await axios.post(`${API_URL}/api/scrape`, {
        prompt: 'test',
        model: 'Fable 5',
        // email missing
      });
      console.error('❌ Should have failed with 400 error');
    } catch (err: any) {
      if (err.response?.status === 400) {
        console.log('✅ Error handling works correctly');
        console.log(`   Error: ${err.response.data.error}\n`);
      } else {
        throw err;
      }
    }

    // Test 5: Invalid request (empty prompt)
    console.log('5️⃣  Testing error handling (empty prompt)...');
    try {
      await axios.post(`${API_URL}/api/scrape`, {
        prompt: '',
        model: 'Fable 5',
        email: TEST_EMAIL,
      });
      console.error('❌ Should have failed with 400 error');
    } catch (err: any) {
      if (err.response?.status === 400) {
        console.log('✅ Empty prompt validation works');
        console.log(`   Error: ${err.response.data.error}\n`);
      } else {
        throw err;
      }
    }

    console.log('🎉 All tests passed!\n');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Test failed:');
    
    if (error.code === 'ECONNREFUSED') {
      console.error(`   Cannot connect to ${API_URL}`);
      console.error('   Make sure backend is running: npm run dev');
    } else if (error.response?.status) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${error.response.data?.error || error.message}`);
    } else {
      console.error(`   ${error.message}`);
    }

    process.exit(1);
  }
}

console.log(`📍 Testing: ${API_URL}\n`);
test();

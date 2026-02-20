const crypto = require('crypto');
const axios = require('axios');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || 'test_secret_123';

function generateHmac(payload) {
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload, 'utf8')
    .digest('base64');
}

async function testWebhookWithHmac(endpoint, data) {
  const payload = JSON.stringify(data);
  const hmac = generateHmac(payload);

  try {
    const response = await axios.post(`${BASE_URL}${endpoint}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-shopify-hmac-sha256': hmac
      }
    });
    console.log(`✅ ${endpoint}:`, response.data);
    return true;
  } catch (error) {
    console.error(`❌ ${endpoint}:`, error.response?.data || error.message);
    return false;
  }
}

async function testEndpoint(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (data) config.data = data;

    const response = await axios(config);
    console.log(`✅ ${method} ${endpoint}:`, response.data);
    return true;
  } catch (error) {
    console.error(`❌ ${method} ${endpoint}:`, error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('\n🚀 Starting lacleoOmnia-auto Tests\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;

  console.log('\n=== Test 1: Health Check ===');
  if (await testEndpoint('GET', '/')) passed++; else failed++;

  console.log('\n=== Test 2: Create Test Checkouts ===');
  if (await testEndpoint('POST', '/test/checkout', {
    checkoutId: 'test-checkout-001',
    email: 'test1@example.com',
    firstName: 'Alice',
    lastName: 'Johnson',
    cartValue: 150.00,
    currency: 'USD'
  })) passed++; else failed++;

  if (await testEndpoint('POST', '/test/checkout', {
    checkoutId: 'test-checkout-002',
    email: 'test2@example.com',
    firstName: 'Bob',
    lastName: 'Smith',
    cartValue: 200.00,
    currency: 'USD'
  })) passed++; else failed++;

  console.log('\n=== Test 3: List Checkouts ===');
  if (await testEndpoint('GET', '/test/checkouts')) passed++; else failed++;

  console.log('\n=== Test 4: Create Test Order ===');
  if (await testEndpoint('POST', '/test/order', {
    orderId: 'test-order-001',
    email: 'test1@example.com',
    totalPrice: 150.00,
    currency: 'USD'
  })) passed++; else failed++;

  console.log('\n=== Test 5: List Orders ===');
  if (await testEndpoint('GET', '/test/orders')) passed++; else failed++;

  console.log('\n=== Test 6: Create Test Customer ===');
  if (await testEndpoint('POST', '/test/customer', {
    shopifyCustomerId: 'customer-12345',
    email: 'newcustomer@example.com',
    firstName: 'Diana',
    lastName: 'Prince'
  })) passed++; else failed++;

  console.log('\n=== Test 7: List Customers ===');
  if (await testEndpoint('GET', '/test/customers')) passed++; else failed++;

  console.log('\n=== Test 8: Webhook with Valid HMAC (Checkout) ===');
  if (await testWebhookWithHmac('/webhook/checkout', {
    id: 'shopify-checkout-999',
    email: 'hmac-test@example.com',
    total_price: '99.99',
    currency: 'USD',
    abandoned_checkout_url: 'https://example.com/recover',
    customer: {
      first_name: 'HMAC',
      last_name: 'Test'
    }
  })) passed++; else failed++;

  console.log('\n=== Test 9: Webhook with Invalid HMAC ===');
  try {
    await axios.post(`${BASE_URL}/webhook/checkout`, { test: 'data' }, {
      headers: {
        'Content-Type': 'application/json',
        'x-shopify-hmac-sha256': 'invalid_hmac'
      }
    });
    console.log('❌ Should have rejected invalid HMAC');
    failed++;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Correctly rejected invalid HMAC');
      passed++;
    } else {
      console.log('❌ Unexpected error:', error.message);
      failed++;
    }
  }

  console.log('\n=== Test 10: Idempotency (Duplicate Checkout) ===');
  if (await testEndpoint('POST', '/test/checkout', {
    checkoutId: 'idempotent-001',
    email: 'same@example.com',
    firstName: 'Same',
    lastName: 'User',
    cartValue: 100.00,
    currency: 'USD'
  })) passed++; else failed++;

  if (await testEndpoint('POST', '/test/checkout', {
    checkoutId: 'idempotent-001',
    email: 'same@example.com',
    firstName: 'Same',
    lastName: 'User',
    cartValue: 100.00,
    currency: 'USD'
  })) passed++; else failed++;

  console.log('\n=== Summary ===');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed\n');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('\n💥 Test suite error:', error.message);
  process.exit(1);
});

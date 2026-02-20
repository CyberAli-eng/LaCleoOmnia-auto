# Testing Guide for lacleoOmnia-auto

## Complete Testing Workflow

### Phase 1: Local Setup Testing

#### 1.1 Install and Start

```bash
cd lacleoOmnia-auto
npm install
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/lacleoomnia
SHOPIFY_WEBHOOK_SECRET=test_secret_123
SHOPIFY_STORE_DOMAIN=test-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=test_token
SNOV_CLIENT_ID=test_client_id
SNOV_CLIENT_SECRET=test_client_secret
SNOV_CAMPAIGN_ABANDONED=camp_123
SNOV_CAMPAIGN_UPSELL=camp_456
SNOV_CAMPAIGN_WELCOME=camp_789
MOCK_SNOV=true
```

Setup database:
```bash
npx prisma generate
npx prisma migrate dev --name init
```

Start server:
```bash
npm start
```

#### 1.2 Health Check

```bash
curl http://localhost:3000/
```

**Expected Output:**
```json
{
  "service": "lacleoOmnia-auto",
  "status": "running",
  "version": "1.0.0"
}
```

---

### Phase 2: Test Endpoints

#### 2.1 Create Test Checkout

```bash
curl -X POST http://localhost:3000/test/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "checkoutId": "checkout-001",
    "email": "test1@example.com",
    "firstName": "Alice",
    "lastName": "Johnson",
    "cartValue": 150.00,
    "currency": "USD"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "checkout": {
    "id": 1,
    "checkoutId": "checkout-001",
    "email": "test1@example.com",
    "status": "pending",
    "cartValue": 150,
    ...
  }
}
```

#### 2.2 Verify Checkout Stored

```bash
curl http://localhost:3000/test/checkouts
```

**Look for:**
- `count: 1`
- Your checkout in the array
- `status: "pending"`

#### 2.3 Create Multiple Checkouts

```bash
# Checkout 2
curl -X POST http://localhost:3000/test/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "checkoutId": "checkout-002",
    "email": "test2@example.com",
    "firstName": "Bob",
    "lastName": "Smith",
    "cartValue": 200.00,
    "currency": "USD"
  }'

# Checkout 3
curl -X POST http://localhost:3000/test/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "checkoutId": "checkout-003",
    "email": "test3@example.com",
    "firstName": "Charlie",
    "lastName": "Davis",
    "cartValue": 75.00,
    "currency": "EUR"
  }'
```

---

### Phase 3: Test Order Flow

#### 3.1 Create Order for Checkout 1

```bash
curl -X POST http://localhost:3000/test/order \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-001",
    "email": "test1@example.com",
    "totalPrice": 150.00,
    "currency": "USD"
  }'
```

**Expected:**
- Order created
- Checkout status changed to "converted"
- Mock upsell campaign logged

#### 3.2 Verify Order and Checkout Update

```bash
# Check orders
curl http://localhost:3000/test/orders

# Check checkouts - checkout-001 should be "converted"
curl http://localhost:3000/test/checkouts
```

---

### Phase 4: Test Customer Flow

#### 4.1 Create Customer

```bash
curl -X POST http://localhost:3000/test/customer \
  -H "Content-Type: application/json" \
  -d '{
    "shopifyCustomerId": "customer-12345",
    "email": "newcustomer@example.com",
    "firstName": "Diana",
    "lastName": "Prince"
  }'
```

**Expected:**
- Customer created
- Mock welcome campaign logged

#### 4.2 Verify Customer

```bash
curl http://localhost:3000/test/customers
```

---

### Phase 5: Test Abandoned Cart Detection

#### 5.1 Access Database

```bash
npx prisma studio
```

Or use any PostgreSQL client.

#### 5.2 Manually Age a Checkout

In Prisma Studio or SQL:

```sql
UPDATE "Checkout" 
SET "createdAt" = NOW() - INTERVAL '46 minutes' 
WHERE "checkoutId" = 'checkout-002';
```

This makes checkout-002 appear 46 minutes old (threshold is 45 min).

#### 5.3 Wait for Cron Job

The cron runs every 5 minutes. Watch server logs:

```
[INFO] Running abandoned cart detection...
[INFO] Found 1 abandoned checkouts
[INFO] Triggering abandoned cart campaign for: test2@example.com
[MOCK] Adding prospect to campaign: test2@example.com -> Campaign camp_123
[INFO] Abandoned cart processed: checkout-002
```

#### 5.4 Verify Status Changed

```bash
curl http://localhost:3000/test/checkouts | grep checkout-002
```

**Expected:** `status: "abandoned"`

---

### Phase 6: Test HMAC Verification

#### 6.1 Generate Valid HMAC

Create a test script `test-hmac.js`:

```javascript
const crypto = require('crypto');
const axios = require('axios');

const secret = 'test_secret_123';
const payload = JSON.stringify({
  id: "shopify-checkout-999",
  email: "hmac-test@example.com",
  total_price: "99.99",
  currency: "USD",
  abandoned_checkout_url: "https://example.com/recover"
});

const hmac = crypto
  .createHmac('sha256', secret)
  .update(payload, 'utf8')
  .digest('base64');

axios.post('http://localhost:3000/webhook/checkout', payload, {
  headers: {
    'Content-Type': 'application/json',
    'x-shopify-hmac-sha256': hmac
  }
})
.then(res => console.log('✅ HMAC Valid:', res.data))
.catch(err => console.error('❌ Error:', err.response?.data));
```

Run:
```bash
node test-hmac.js
```

**Expected:** `✅ HMAC Valid: { success: true }`

#### 6.2 Test Invalid HMAC

```bash
curl -X POST http://localhost:3000/webhook/checkout \
  -H "Content-Type: application/json" \
  -H "x-shopify-hmac-sha256: invalid_hmac" \
  -d '{"id":"test"}'
```

**Expected:** `401 Invalid HMAC signature`

---

### Phase 7: Test Idempotency

#### 7.1 Send Same Checkout Twice

```bash
# First time
curl -X POST http://localhost:3000/test/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "checkoutId": "idempotent-001",
    "email": "same@example.com",
    "firstName": "Same",
    "lastName": "User",
    "cartValue": 100.00,
    "currency": "USD"
  }'

# Second time (exact same)
curl -X POST http://localhost:3000/test/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "checkoutId": "idempotent-001",
    "email": "same@example.com",
    "firstName": "Same",
    "lastName": "User",
    "cartValue": 100.00,
    "currency": "USD"
  }'
```

#### 7.2 Verify Only One Record

```bash
curl http://localhost:3000/test/checkouts | grep idempotent-001
```

**Expected:** Only one checkout with that ID (upsert works).

---

### Phase 8: Load Testing

#### 8.1 Create 10 Checkouts Rapidly

```bash
for i in {1..10}; do
  curl -X POST http://localhost:3000/test/checkout \
    -H "Content-Type: application/json" \
    -d "{
      \"checkoutId\": \"load-$i\",
      \"email\": \"load$i@example.com\",
      \"firstName\": \"User\",
      \"lastName\": \"$i\",
      \"cartValue\": 100.00,
      \"currency\": \"USD\"
    }" &
done
wait
```

#### 8.2 Verify All Created

```bash
curl http://localhost:3000/test/checkouts | grep -c "load-"
```

**Expected:** `10`

---

### Phase 9: Reset and Clean

```bash
curl -X DELETE http://localhost:3000/test/reset
```

**Expected:** `{ success: true, message: "All data deleted" }`

Verify:
```bash
curl http://localhost:3000/test/checkouts
```

**Expected:** `{ count: 0, checkouts: [] }`

---

### Phase 10: Production Webhook Simulation

Use the HMAC test script but with real Shopify webhook payloads.

#### Sample Shopify Checkout Payload:

```json
{
  "id": 12345678901234,
  "token": "abc123",
  "email": "real@customer.com",
  "customer": {
    "first_name": "Real",
    "last_name": "Customer"
  },
  "total_price": "250.00",
  "currency": "USD",
  "abandoned_checkout_url": "https://store.myshopify.com/..."
}
```

Generate HMAC and send to `/webhook/checkout`.

---

## Checklist Summary

- [ ] Server starts without errors
- [ ] Health check returns 200
- [ ] Test checkout creates record
- [ ] Test order marks checkout as converted
- [ ] Test customer creates record
- [ ] Abandoned cart cron detects old checkouts
- [ ] Mock Snov campaigns logged
- [ ] HMAC verification rejects invalid requests
- [ ] HMAC verification accepts valid requests
- [ ] Idempotency prevents duplicates
- [ ] Load test handles concurrent requests
- [ ] Reset clears all data

---

## Common Issues

### Issue: "Prisma Client not generated"

**Fix:**
```bash
npx prisma generate
```

### Issue: Database connection error

**Fix:**
- Check `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Run migrations: `npx prisma migrate dev`

### Issue: Cron job not running

**Check:**
- Server logs show "Abandoned cart cron job started"
- Server stays running (not crashing)

### Issue: Mock campaigns not logging

**Check:**
- `.env` has `MOCK_SNOV=true`
- Server logs show `[MOCK]` messages

---

## Moving to Production

1. Deploy to Render (see main README)
2. Set `MOCK_SNOV=false`
3. Add real Snov.io credentials and campaign IDs
4. Configure Shopify webhooks with production URL
5. Test with Shopify's "Send test notification"
6. Monitor logs for real webhook events

---

**Testing Complete! 🎉**

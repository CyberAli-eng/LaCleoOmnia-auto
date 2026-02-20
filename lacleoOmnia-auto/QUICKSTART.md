# Quick Start Checklist

## Initial Setup

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your credentials

# 3. Generate Prisma client
npx prisma generate

# 4. Run database migrations
npx prisma migrate dev --name init

# 5. Start server
npm start
```

## Quick Test

```bash
# Health check
curl http://localhost:3000/

# Create test checkout
curl -X POST http://localhost:3000/test/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "checkoutId": "test-001",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "cartValue": 100.00,
    "currency": "USD"
  }'

# View all checkouts
curl http://localhost:3000/test/checkouts
```

## Deploy to Render

1. Create PostgreSQL database on Render
2. Create Web Service and connect GitHub repo
3. Add environment variables
4. Deploy
5. Update Shopify webhooks with Render URL

See full README.md for detailed instructions.

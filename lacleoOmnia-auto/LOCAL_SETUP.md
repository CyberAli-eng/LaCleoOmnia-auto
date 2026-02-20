# Local Development Setup

## Prerequisites

### 1. Install Node.js

Download and install Node.js 18+ from: https://nodejs.org/

Verify installation:
```bash
node --version  # Should be v18 or higher
npm --version
```

### 2. Install PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
- Download from: https://www.postgresql.org/download/windows/
- Run installer
- Remember the password you set for `postgres` user

**Docker (Alternative):**
```bash
docker run --name lacleoomnia-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=lacleoomnia \
  -p 5432:5432 \
  -d postgres:15
```

### 3. Create Database

**Using psql:**
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE lacleoomnia;

# Exit
\q
```

**Using Docker:**
```bash
# Database is already created with name from -e POSTGRES_DB
docker exec -it lacleoomnia-postgres psql -U postgres -d lacleoomnia
```

---

## Project Setup

### 1. Install Dependencies

```bash
cd lacleoOmnia-auto
npm install
```

### 2. Configure Environment

Edit `.env` file (already exists):

```env
PORT=3000

# Update this with your actual PostgreSQL connection
DATABASE_URL=postgresql://postgres:password@localhost:5432/lacleoomnia?schema=public

# Use test credentials for local development
SHOPIFY_WEBHOOK_SECRET=test_secret_123
SHOPIFY_STORE_DOMAIN=test-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=test_token

SNOV_CLIENT_ID=test_client_id
SNOV_CLIENT_SECRET=test_client_secret

SNOV_CAMPAIGN_ABANDONED=camp_abandoned_123
SNOV_CAMPAIGN_UPSELL=camp_upsell_456
SNOV_CAMPAIGN_WELCOME=camp_welcome_789

# Keep as true for local testing
MOCK_SNOV=true
```

**Important:** Update `DATABASE_URL` with your actual PostgreSQL credentials.

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

### 4. Run Database Migrations

```bash
npm run prisma:migrate:dev
```

When prompted for migration name, enter: `init`

This creates the following tables:
- `Checkout`
- `Order`
- `Customer`

### 5. Verify Database

```bash
npm run prisma:studio
```

This opens Prisma Studio at http://localhost:5555 where you can view your database.

---

## Running the Server

### Start Server

```bash
npm start
```

Or for development:
```bash
npm run dev
```

**Expected Output:**
```
[INFO] ====================================
[INFO] lacleoOmnia-auto server started
[INFO] Port: 3000
[INFO] Mock Snov: true
[INFO] ====================================
[INFO] Abandoned cart cron job started successfully
```

### Verify Server is Running

Open browser: http://localhost:3000

Should see:
```json
{
  "service": "lacleoOmnia-auto",
  "status": "running",
  "version": "1.0.0",
  ...
}
```

---

## Running Tests

### Automated Test Suite

In a new terminal (keep server running):

```bash
npm test
```

This runs all automated tests including:
- Health check
- Test endpoints
- HMAC verification
- Idempotency
- Database operations

### Manual Testing

See `TESTING.md` for comprehensive manual testing guide.

**Quick Test:**
```bash
# Create a checkout
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

---

## Development Workflow

### 1. Make Code Changes

Edit files in `src/` directory:
- `src/routes/` - API routes
- `src/controllers/` - Business logic
- `src/services/` - External integrations
- `src/jobs/` - Cron jobs

### 2. Test Changes

```bash
# Restart server
# Stop with Ctrl+C
npm start

# Run tests
npm test
```

### 3. Database Schema Changes

If you modify `prisma/schema.prisma`:

```bash
# Create migration
npm run prisma:migrate:dev

# Name your migration (e.g., "add_phone_field")

# Prisma will:
# - Generate SQL migration file
# - Apply to database
# - Regenerate client
```

### 4. View Database

```bash
npm run prisma:studio
```

Or connect with any PostgreSQL client:
- DBeaver
- pgAdmin
- TablePlus
- psql

---

## Common Issues & Solutions

### Issue: "Cannot connect to database"

**Check:**
```bash
# Is PostgreSQL running?
# macOS:
brew services list | grep postgresql

# Linux:
systemctl status postgresql

# Docker:
docker ps | grep postgres
```

**Fix:**
```bash
# Start PostgreSQL
# macOS:
brew services start postgresql@15

# Linux:
sudo systemctl start postgresql

# Docker:
docker start lacleoomnia-postgres
```

### Issue: "Prisma Client not generated"

**Fix:**
```bash
npm run prisma:generate
```

### Issue: "Migration failed"

**Reset database:**
```bash
# WARNING: This deletes all data
npm run prisma:migrate:dev -- --reset

# Or manually:
psql -U postgres
DROP DATABASE lacleoomnia;
CREATE DATABASE lacleoomnia;
\q

# Then run migrations:
npm run prisma:migrate:dev
```

### Issue: Port 3000 already in use

**Fix:**
```bash
# Find process using port 3000
# macOS/Linux:
lsof -i :3000

# Kill process:
kill -9 [PID]

# Or change port in .env:
PORT=3001
```

### Issue: "Module not found"

**Fix:**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

---

## Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `SHOPIFY_WEBHOOK_SECRET` | Verifies webhook authenticity | From Shopify admin |
| `SHOPIFY_STORE_DOMAIN` | Your store URL | `mystore.myshopify.com` |
| `SHOPIFY_ACCESS_TOKEN` | API access token | From Shopify admin |
| `SNOV_CLIENT_ID` | Snov.io API client ID | From Snov.io dashboard |
| `SNOV_CLIENT_SECRET` | Snov.io API secret | From Snov.io dashboard |
| `SNOV_CAMPAIGN_ABANDONED` | Abandoned cart campaign ID | From Snov.io campaigns |
| `SNOV_CAMPAIGN_UPSELL` | Upsell campaign ID | From Snov.io campaigns |
| `SNOV_CAMPAIGN_WELCOME` | Welcome campaign ID | From Snov.io campaigns |
| `MOCK_SNOV` | Use mock Snov.io API | `true` (dev) / `false` (prod) |

---

## Project Structure

```
lacleoOmnia-auto/
├── src/
│   ├── server.js              # Entry point - starts server & cron
│   ├── app.js                 # Express app configuration
│   │
│   ├── config/
│   │   ├── env.js             # Environment variables & validation
│   │   └── prisma.js          # Prisma client instance
│   │
│   ├── middleware/
│   │   └── verifyShopifyHmac.js  # HMAC signature verification
│   │
│   ├── routes/
│   │   ├── webhooks.js        # Production webhook endpoints
│   │   └── test.js            # Development test endpoints
│   │
│   ├── controllers/
│   │   └── webhookController.js  # Webhook request handlers
│   │
│   ├── services/
│   │   ├── snovService.js     # Snov.io API integration
│   │   ├── checkoutService.js # Checkout database operations
│   │   ├── orderService.js    # Order database operations
│   │   └── customerService.js # Customer database operations
│   │
│   ├── jobs/
│   │   └── abandonedCartJob.js  # Cron job for abandoned carts
│   │
│   └── utils/
│       └── logger.js          # Logging utility
│
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Auto-generated SQL migrations
│
├── test-suite.js              # Automated test suite
├── .env                       # Local environment variables
├── .env.example               # Environment template
├── package.json               # Dependencies & scripts
│
└── Documentation:
    ├── README.md              # Main documentation
    ├── QUICKSTART.md          # Quick start guide
    ├── TESTING.md             # Comprehensive testing guide
    ├── RENDER_DEPLOYMENT.md   # Production deployment guide
    └── LOCAL_SETUP.md         # This file
```

---

## Next Steps

1. ✅ Complete local setup (this guide)
2. 📝 Read `README.md` for full documentation
3. 🧪 Run tests with `npm test`
4. 🎯 Review `TESTING.md` for manual testing scenarios
5. 🚀 When ready, deploy using `RENDER_DEPLOYMENT.md`

---

## Useful Commands

```bash
# Development
npm start                      # Start server
npm test                       # Run test suite
npm run prisma:studio          # Open database GUI

# Database
npm run prisma:generate        # Generate Prisma client
npm run prisma:migrate:dev     # Create & apply migration
psql -U postgres -d lacleoomnia  # Connect to database

# Testing
curl http://localhost:3000/                    # Health check
curl http://localhost:3000/test/checkouts      # List checkouts
curl -X DELETE http://localhost:3000/test/reset  # Reset database

# Debugging
tail -f logs/app.log           # View logs (if logging to file)
# Server logs print to console by default
```

---

## Tips

1. **Keep `MOCK_SNOV=true`** during development to avoid hitting real Snov.io API
2. **Use Prisma Studio** to visualize database changes
3. **Check server logs** for all webhook and cron activity
4. **Reset database** with `/test/reset` endpoint between test runs
5. **Test HMAC verification** before connecting to real Shopify webhooks

---

**Happy Development! 🚀**

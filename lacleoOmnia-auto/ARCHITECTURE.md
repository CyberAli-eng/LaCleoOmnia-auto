# System Architecture - lacleoOmnia-auto

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SHOPIFY STORE                           │
│                                                                 │
│  Events: Checkout Created | Order Created | Customer Created   │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  │ Webhook (JSON + HMAC)
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    lacleoOmnia-auto SERVER                      │
│                         (Node.js + Express)                     │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   HMAC Verification                        │ │
│  │  (crypto.timingSafeEqual - Security Layer)                │ │
│  └───────────────────────┬───────────────────────────────────┘ │
│                          │                                      │
│                          ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │               Webhook Controllers                          │ │
│  │  • checkoutController  • orderController                  │ │
│  │  • customerController                                     │ │
│  └───────────────────────┬───────────────────────────────────┘ │
│                          │                                      │
│                          ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  Business Services                         │ │
│  │  • CheckoutService  • OrderService                        │ │
│  │  • CustomerService  • SnovService                         │ │
│  └───────────┬──────────────────────────┬────────────────────┘ │
│              │                          │                       │
└──────────────┼──────────────────────────┼───────────────────────┘
               │                          │
               ▼                          ▼
┌─────────────────────────────┐  ┌──────────────────────────────┐
│     PostgreSQL Database     │  │        Snov.io API           │
│      (Render Managed)       │  │   (Email Automation)         │
│                             │  │                              │
│  Tables:                    │  │  Campaigns:                  │
│  • Checkout                 │  │  • Abandoned Cart            │
│  • Order                    │  │  • Upsell                    │
│  • Customer                 │  │  • Welcome                   │
└─────────────┬───────────────┘  └──────────────────────────────┘
              │
              │ Queried by
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cron Job (node-cron)                         │
│                 Runs every 5 minutes                            │
│                                                                 │
│  Logic:                                                         │
│  1. Query checkouts where:                                     │
│     - status = 'pending'                                       │
│     - createdAt < (now - 45 minutes)                          │
│  2. Mark as 'abandoned'                                        │
│  3. Trigger Snov.io campaign                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Flow 1: Checkout Created → Abandoned Cart

```
Step 1: Customer adds to cart
┌─────────────┐
│   Shopify   │
│   Checkout  │
│   Created   │
└──────┬──────┘
       │
       │ Webhook POST /webhook/checkout
       │ Headers: x-shopify-hmac-sha256
       │
       ▼
┌─────────────────────┐
│  HMAC Verification  │
│  (Security Check)   │
└──────┬──────────────┘
       │ ✓ Valid
       ▼
┌─────────────────────┐
│ Checkout Controller │
│  Extract data:      │
│  - email            │
│  - name             │
│  - cart value       │
│  - recovery URL     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Checkout Service    │
│ UPSERT to DB:       │
│ status = 'pending'  │
└──────┬──────────────┘
       │
       └─────────► Database stored
                   (Awaiting 45 min threshold)


Step 2: Time passes (45+ minutes)
┌──────────────────────┐
│   Cron Job Triggers  │
│   (Every 5 minutes)  │
└──────┬───────────────┘
       │
       │ Query pending checkouts
       │ older than 45 min
       │
       ▼
┌──────────────────────┐
│  Found abandoned?    │
└──────┬───────────────┘
       │ Yes
       ▼
┌──────────────────────┐
│ Mark as 'abandoned'  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│   Snov.io Service    │
│   Send to campaign:  │
│   - Email            │
│   - Name             │
│   - Recovery URL     │
│   - Cart value       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Customer receives   │
│  abandoned cart      │
│  recovery email      │
└──────────────────────┘
```

### Flow 2: Order Completed → Upsell

```
Customer completes purchase
┌─────────────┐
│   Shopify   │
│    Order    │
│   Created   │
└──────┬──────┘
       │
       │ Webhook POST /webhook/order
       │
       ▼
┌─────────────────────┐
│  HMAC Verification  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Order Controller   │
└──────┬──────────────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌──────────────┐  ┌──────────────────┐
│ Save Order   │  │ Find Checkout by │
│ to Database  │  │ email & mark as  │
│              │  │ 'converted'      │
└──────────────┘  └──────┬───────────┘
                         │
                         ▼
                  ┌──────────────────┐
                  │ Snov.io Service  │
                  │ Upsell Campaign  │
                  └──────┬───────────┘
                         │
                         ▼
                  ┌──────────────────┐
                  │ Customer receives│
                  │ upsell email     │
                  └──────────────────┘
```

### Flow 3: Customer Created → Welcome

```
New customer signs up
┌─────────────┐
│   Shopify   │
│  Customer   │
│   Created   │
└──────┬──────┘
       │
       │ Webhook POST /webhook/customer
       │
       ▼
┌─────────────────────┐
│  HMAC Verification  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Customer Controller │
└──────┬──────────────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌──────────────┐  ┌──────────────────┐
│Save Customer │  │  Snov.io Service │
│ to Database  │  │ Welcome Campaign │
└──────────────┘  └──────┬───────────┘
                         │
                         ▼
                  ┌──────────────────┐
                  │ Customer receives│
                  │ welcome email    │
                  └──────────────────┘
```

---

## Component Interaction

```
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  server.js ────► app.js ────► Routes ────► Controllers         │
│     │                                           │               │
│     │                                           │               │
│     └─► Start Cron Job                         │               │
│                                                 │               │
│                                                 ▼               │
│                                            Services             │
│                                         ┌──────┴──────┐        │
│                                         │             │        │
│                                    Database      Snov.io       │
│                                    Service       Service       │
│                                         │             │        │
└─────────────────────────────────────────┼─────────────┼────────┘
                                          │             │
                                          ▼             ▼
                                    PostgreSQL     Snov.io API
```

---

## Security Layer

```
Incoming Webhook Request
        │
        ▼
┌─────────────────────────────────────────┐
│     Middleware: verifyShopifyHmac       │
│                                         │
│  1. Extract header:                    │
│     x-shopify-hmac-sha256              │
│                                         │
│  2. Capture raw body                   │
│                                         │
│  3. Generate HMAC:                     │
│     crypto.createHmac('sha256', secret)│
│     .update(rawBody)                   │
│     .digest('base64')                  │
│                                         │
│  4. Compare with timing-safe:          │
│     crypto.timingSafeEqual()           │
│                                         │
│  5. Result:                            │
│     ✓ Valid   → next()                 │
│     ✗ Invalid → 401 Unauthorized       │
└─────────────────────────────────────────┘
```

---

## Database Schema Relationships

```
┌─────────────────────────┐
│       Checkout          │
├─────────────────────────┤
│ id (PK)                 │
│ checkoutId (UNIQUE)     │
│ email                   │────────┐
│ firstName               │        │
│ lastName                │        │ email
│ recoveryUrl             │        │ (linked by email,
│ cartValue               │        │  not FK)
│ currency                │        │
│ status                  │        │
│ createdAt               │        │
│ updatedAt               │        │
└─────────────────────────┘        │
                                   │
                                   │
┌─────────────────────────┐        │
│        Order            │        │
├─────────────────────────┤        │
│ id (PK)                 │        │
│ orderId (UNIQUE)        │        │
│ email                   │◄───────┘
│ totalPrice              │
│ currency                │
│ createdAt               │
└─────────────────────────┘
                                   
                                   
┌─────────────────────────┐        
│       Customer          │        
├─────────────────────────┤        
│ id (PK)                 │        
│ shopifyCustomerId (UQ)  │        
│ email (UNIQUE)          │◄───────┐
│ firstName               │        │ email
│ lastName                │        │ (linked by email,
│ createdAt               │        │  not FK)
└─────────────────────────┘        │
                                   │
            All tables share ──────┘
            email as common field
```

---

## Deployment Architecture (Render)

```
┌───────────────────────────────────────────────────────────┐
│                      RENDER CLOUD                         │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │           Web Service (Node.js)                     │ │
│  │           lacleoomnia-auto                          │ │
│  │                                                     │ │
│  │  • Express server on port 3000                     │ │
│  │  • Auto-deploy on git push                         │ │
│  │  • Environment variables configured                │ │
│  │  • Health checks enabled                           │ │
│  │  • Auto-restart on crash                           │ │
│  └──────────────────┬──────────────────────────────────┘ │
│                     │                                     │
│                     │ Internal network                    │
│                     │                                     │
│  ┌──────────────────▼──────────────────────────────────┐ │
│  │         PostgreSQL Database                         │ │
│  │         lacleoomnia-db                              │ │
│  │                                                     │ │
│  │  • Managed by Render                               │ │
│  │  • Automatic backups (Pro plan)                    │ │
│  │  • Internal URL (fast & secure)                    │ │
│  │  • External URL (for admin access)                 │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
└───────────────────────────┬───────────────────────────────┘
                            │
                            │ HTTPS
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
    Shopify             Snov.io            Developers
    Webhooks            API                (Logs/Admin)
```

---

## Cron Job Architecture

```
Server Starts
     │
     ▼
┌──────────────────────────────────┐
│  abandonedCartJob.js             │
│                                  │
│  node-cron.schedule(             │
│    '*/5 * * * *',  ◄─────── Every 5 minutes
│    async () => {                 │
│      ...                         │
│    }                             │
│  )                               │
└──────────────┬───────────────────┘
               │
               │ Runs in background
               │ (doesn't block server)
               │
               ▼
     Every 5 minutes:
               │
               ▼
┌──────────────────────────────────┐
│  Query Database:                 │
│                                  │
│  SELECT * FROM Checkout          │
│  WHERE status = 'pending'        │
│    AND createdAt <               │
│      (NOW() - INTERVAL '45 min') │
└──────────────┬───────────────────┘
               │
               ▼
         Found checkouts?
               │
         ┌─────┴─────┐
         │           │
        Yes          No
         │           │
         │           └──► Log: "No abandoned"
         │                End cycle
         │
         ▼
┌──────────────────────────────────┐
│  For each checkout:              │
│  1. Mark as 'abandoned'          │
│  2. Trigger Snov.io campaign     │
│  3. Log result                   │
└──────────────────────────────────┘
         │
         ▼
    Next cycle in 5 min
```

---

## Error Handling Flow

```
Every async operation wrapped in try-catch:

Request
   │
   ▼
┌─────────────────────┐
│   try {             │
│     operation()     │
│   }                 │
└──────┬──────────────┘
       │
   ┌───┴───┐
   │       │
Success  Error
   │       │
   │       ▼
   │   ┌─────────────────────┐
   │   │   catch (error) {   │
   │   │     logger.error()  │
   │   │     return 500      │
   │   │   }                 │
   │   └─────────────────────┘
   │
   ▼
Return 200
Log success
```

---

## Testing Architecture

```
Developer
    │
    ├──► npm test ──► test-suite.js
    │                      │
    │                      └──► Automated tests
    │                           • Health check
    │                           • CRUD operations
    │                           • HMAC verification
    │                           • Idempotency
    │
    └──► Test Endpoints:
         • POST /test/checkout
         • POST /test/order
         • POST /test/customer
         • GET /test/checkouts
         • GET /test/orders
         • GET /test/customers
         • DELETE /test/reset
              │
              └──► Direct database operations
                   (bypasses HMAC)
                   
                   Perfect for:
                   • Local development
                   • Integration testing
                   • Debugging
```

---

This architecture ensures:
- ✅ Scalability
- ✅ Reliability
- ✅ Security
- ✅ Maintainability
- ✅ Testability

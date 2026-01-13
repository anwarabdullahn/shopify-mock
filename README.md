# Shopify Mock Service

A standalone local Shopify GraphQL API mock service for development and testing.

## Features

- Mock Shopify GraphQL API endpoint (`POST /graphql.json`)
- PostgreSQL database for persistent mock data
- Admin REST endpoints for seeding, resetting, and managing test data
- Support for orders, products, variants, and fulfillments
- Compatible with existing Shopify service integration patterns

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or pnpm

### Installation

```bash
npm install
# or
pnpm install
```

### Configuration

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Key environment variables:
- `PORT` - Service port (default: 3100)
- `DB_HOST` - PostgreSQL host
- `DB_NAME` - Database name
- `SHOPIFY_ACCESS_TOKEN` - Mock access token for validation

### Database Setup

**Note:** Shopify Mock uses PostgreSQL port **5433** to avoid conflicts with the main backend service (port 5432).

#### Option 1: Local Development (without Docker)

Create PostgreSQL database:

```bash
createdb shopify_mock
```

Update `.env`:
```
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=shopify_mock
```

Run migrations:

```bash
npm run migration:run
```

Seed test data:

```bash
npm run seed
```

#### Option 2: Docker Compose

```bash
docker-compose up
```

This starts PostgreSQL on port **5433** and the mock service on port **3100**.

## Running

### Development

```bash
npm run dev
```

Service will be available at `http://localhost:3100`

### Production

```bash
npm run build
npm start
```

## API Endpoints

### GraphQL Endpoint

```
POST http://localhost:3100/graphql.json
```

Supported queries:
- `orders` - List unshipped orders
- `order` - Get single order
- `productVariants` - List product variants

Supported mutations:
- `fulfillmentCreate` - Create fulfillment
- `inventorySetQuantities` - Update inventory

**Example request:**

```bash
curl -X POST http://localhost:3100/graphql.json \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Access-Token: shpat_1234567890abcdef" \
  -d '{
    "query": "{ orders(first: 10) { edges { node { id name } } } }"
  }'
```

### Admin Endpoints

- `POST /admin/seed` - Load test data
- `POST /admin/reset` - Clear all data
- `GET /admin/orders` - List all orders
- `GET /admin/orders/:id` - Get specific order
- `POST /admin/orders/:id/status` - Update order fulfillment status
- `GET /admin/shops` - List all shops

**Example:**

```bash
# Seed test data
curl -X POST http://localhost:3100/admin/seed

# List orders
curl http://localhost:3100/admin/orders

# Update order status
curl -X POST http://localhost:3100/admin/orders/:id/status \
  -H "Content-Type: application/json" \
  -d '{"fulfillment_status": "shipped"}'
```

## Integration with Backend

Point your `ShopifyService` to the mock endpoint:

```typescript
// In your ShopifyService or config
const SHOPIFY_GRAPHQL_URL = process.env.SHOPIFY_API_URL || 
  'http://localhost:3100/graphql.json';
```

## Database Schema

### Tables

- `mock_shops` - Shop information and access tokens
- `mock_products` - Product catalog
- `mock_variants` - Product variants with inventory
- `mock_orders` - Customer orders
- `mock_order_line_items` - Order line items
- `mock_fulfillments` - Order fulfillments with tracking

## Docker Compose (Optional)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: shopify_mock
    ports:
      - "5432:5432"

  shopify-mock:
    build: .
    ports:
      - "3100:3100"
    environment:
      DB_HOST: postgres
      DB_NAME: shopify_mock
    depends_on:
      - postgres
```

Run with: `docker-compose up`

## Development

### Create migrations

```bash
npm run migration:generate -- CreateOrdersTable
```

### TypeScript compilation

```bash
npm run build
```

## License

UNLICENSED

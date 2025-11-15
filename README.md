# API Rate Limiter

A powerful API rate-limiting application built with Next.js, PostgreSQL, and Redis. This application allows you to register tenants, configure rate-limiting rules, and test rate limiting through an intuitive interface.

## Features

- **Multi-tenant Support**: Register multiple tenants with independent rate-limiting configurations
- **Three Rate Limiting Types**:
  - **General**: Global rate limiting for all requests from a tenant
  - **IP-based**: Rate limiting per IP address
  - **API-based**: Rate limiting per API endpoint (supports wildcard patterns)
- **Fixed Window Counter Algorithm**: Simple and efficient rate limiting
- **PostgreSQL**: Persistent storage for tenants and rules
- **Redis**: High-performance caching for request counters
- **Docker Compose**: Easy containerized deployment
- **Modern UI**: Beautiful admin interface and testing dashboard

## Architecture

```
┌─────────────┐       ┌──────────────┐       ┌──────────────┐
│   Client    │──────▶│  Next.js API │──────▶│  PostgreSQL  │
│             │       │   (Proxy)    │       │  (Rules DB)  │
└─────────────┘       └──────────────┘       └──────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │    Redis     │
                      │  (Counters)  │
                      └──────────────┘
```

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose

## Quick Start

### 1. Clone and Install Dependencies

```bash
cd rate_limiter
npm install
```

### 2. Start Docker Services

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

The database schema will be automatically initialized from `scripts/init-db.sql`.

### 3. Configure Environment Variables

The `.env.local` file should already exist with the following configuration:

```env
DATABASE_URL=postgresql://ratelimiter:ratelimiter123@localhost:5432/ratelimiter
REDIS_URL=redis://localhost:6379
```

If you need to modify these values, update `.env.local` accordingly.

### 4. Start the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Usage Guide

### Home Page (`/`)

The home page provides navigation to:
- **Admin Panel**: Register tenants and configure rate-limiting rules
- **Test Page**: Test rate limiting by sending requests

### Admin Panel (`/admin`)

#### Registering a Tenant

1. Navigate to `/admin`
2. Enter a tenant name in the "Register Tenant" form
3. Click "Create Tenant"
4. Copy the generated tenant ID for later use

#### Creating Rate Limit Rules

1. Select a tenant from the dropdown
2. Choose a rule type:
   - **General**: Applies to all requests from the tenant
   - **IP**: Applies per client IP address
   - **API**: Applies to specific API endpoints (requires pattern)
3. Set the request limit (e.g., 10)
4. Set the time window in seconds (e.g., 60)
5. For API rules, enter a pattern (e.g., `/api/users/*` or `https://api.example.com/*`)
6. Click "Create Rule"

**Example Configurations:**

- General: 100 requests per 60 seconds
- IP: 10 requests per 30 seconds
- API: 50 requests per 60 seconds for `https://api.example.com/*`

### Test Page (`/test`)

1. Navigate to `/test`
2. Select a tenant from the dropdown
3. Enter an API URL (e.g., `https://api.example.com/users`)
4. Optionally modify the JSON payload
5. Click "Send Request" to send a single request
6. Or use "Send 5 Requests" / "Send 10 Requests" for bulk testing
7. Observe the results showing:
   - Success/failure status
   - Rate limit information (limit, remaining, reset time)
   - 429 errors when rate limited

### API Endpoints

#### POST /api/tenants

Create a new tenant.

**Request:**
```json
{
  "name": "My Tenant"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My Tenant",
    "created_at": "timestamp"
  }
}
```

#### GET /api/tenants

List all tenants with their rules.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "My Tenant",
      "created_at": "timestamp",
      "rules": [...]
    }
  ]
}
```

#### POST /api/tenants/[tenantId]/rules

Create a rate limit rule for a tenant.

**Request:**
```json
{
  "rule_type": "GENERAL|IP|API",
  "limit": 10,
  "window_seconds": 60,
  "api_pattern": "/api/*" // optional, required for API type
}
```

#### POST /api/proxy

Main proxy endpoint with rate limiting.

**Request:**
```json
{
  "tenant_id": "uuid",
  "api_url": "https://api.example.com/endpoint",
  "data": "additional payload"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Request processed successfully",
  "proxied_to": "https://api.example.com/endpoint",
  ...
}
```

**Rate Limited Response (429):**
```json
{
  "success": false,
  "error": "Rate limit exceeded for GENERAL rule. Limit: 10 requests per 60s",
  "rate_limit": {
    "limit": 10,
    "remaining": 0,
    "reset": 1234567890
  }
}
```

## Database Schema

### Tenants Table

| Column     | Type      | Description           |
|------------|-----------|-----------------------|
| id         | UUID      | Primary key           |
| name       | VARCHAR   | Tenant name           |
| created_at | TIMESTAMP | Creation timestamp    |

### Rate Limit Rules Table

| Column         | Type      | Description                        |
|----------------|-----------|------------------------------------|
| id             | UUID      | Primary key                        |
| tenant_id      | UUID      | Foreign key to tenants             |
| rule_type      | ENUM      | GENERAL, IP, or API                |
| limit          | INTEGER   | Max requests allowed               |
| window_seconds | INTEGER   | Time window in seconds             |
| api_pattern    | VARCHAR   | API pattern (for API type rules)   |
| created_at     | TIMESTAMP | Creation timestamp                 |

## Rate Limiting Algorithm

This application uses the **Fixed Window Counter** algorithm:

1. Time is divided into fixed windows (e.g., 60-second intervals)
2. Each request increments a counter in Redis for the current window
3. If counter exceeds the limit, requests are denied with 429 status
4. Counter resets at the start of the next window

**Redis Key Format:**
```
rate_limit:{tenant_id}:{rule_type}:{identifier}:{window}
```

**Example:**
```
rate_limit:abc123:IP:192.168.1.1:12345
```

## Development

### Project Structure

```
rate_limiter/
├── app/
│   ├── admin/              # Admin interface
│   ├── test/               # Test page
│   ├── api/
│   │   ├── tenants/        # Tenant management API
│   │   └── proxy/          # Rate-limited proxy endpoint
│   └── page.tsx            # Home page
├── lib/
│   ├── db.ts               # PostgreSQL connection
│   ├── redis.ts            # Redis client
│   └── rateLimiter.ts      # Rate limiting logic
├── scripts/
│   └── init-db.sql         # Database schema
├── docker-compose.yml      # Docker services
└── README.md
```

### Stopping Services

```bash
# Stop Docker services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# PostgreSQL only
docker-compose logs -f postgres

# Redis only
docker-compose logs -f redis
```

## Testing Scenarios

### Scenario 1: General Rate Limiting

1. Create a tenant "TestTenant"
2. Add a GENERAL rule: 5 requests per 30 seconds
3. Send 10 requests rapidly
4. Observe that after 5 requests, you get 429 errors

### Scenario 2: IP-based Rate Limiting

1. Create a tenant with IP rule: 3 requests per 20 seconds
2. Send requests from the same IP
3. After 3 requests, further requests are blocked

### Scenario 3: API-based Rate Limiting

1. Create a tenant with API rule: 10 requests per 60 seconds for `https://api.example.com/*`
2. Send requests to `https://api.example.com/users`
3. After 10 requests, that specific API is rate limited

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Redis Connection Issues

```bash
# Check if Redis is running
docker-compose ps

# Test Redis connection
docker-compose exec redis redis-cli ping

# Should return: PONG
```

### Port Conflicts

If ports 5432 or 6379 are already in use, modify `docker-compose.yml`:

```yaml
ports:
  - "5433:5432"  # Change host port
```

Then update `.env.local` accordingly.

## Production Considerations

- Add authentication to admin panel
- Implement rule deletion/editing endpoints
- Add monitoring and alerting
- Use Redis Cluster for high availability
- Implement distributed rate limiting for multiple app instances
- Add comprehensive logging
- Use environment-specific configurations
- Implement database migrations
- Add rate limit headers to all responses
- Consider sliding window or token bucket algorithms for more accurate limiting

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

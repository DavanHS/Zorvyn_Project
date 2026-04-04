# Finance Backend

A RESTful API for financial data processing and access control built with Hono, Prisma, and PostgreSQL.

## Features

- **Authentication**: JWT-based auth with access tokens (15min) and refresh tokens (7 days)
- **User Management**: Admin can create, update, and manage users with RBAC (viewer, analyst, admin)
- **Financial Records**: Full CRUD with soft-delete, pagination, filtering, and search
- **Dashboard**: Aggregated analytics with totals, category breakdown, and monthly trends
- **Security**: Rate limiting on login, CORS configuration, password hashing with bcrypt

## Tech Stack

- **Framework**: Hono (TypeScript)
- **Database**: PostgreSQL (via Neon)
- **ORM**: Prisma
- **Validation**: Zod
- **Auth**: JWT (jsonwebtoken)

## Prerequisites

- Node.js 18+
- PostgreSQL database (Neon or local)

## Setup

1. **Clone and install dependencies**:
```bash
npm install
```

2. **Configure environment variables**:
```bash
cp .env.example .env
```

Update `.env` with your database URL and JWT secret:
```
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-super-secret-key-at-least-32-characters
PORT=3000
CORS_ORIGIN=http://localhost:5173
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

3. **Setup database**:
```bash
npx prisma generate
npx prisma db push
```

4. **Seed the database** (creates test users and sample records):
```bash
npm run seed
```

## Test Credentials

After running the seed script:
- **Admin**: admin@zorvyn.com / admin123456
- **Analyst**: sarah@zorvyn.com / analyst123456
- **Viewer**: mike@zorvyn.com / viewer123456

## Running the Application

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout (invalidate refresh token)
- `POST /api/auth/reset-password` - Change password

### Users (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PATCH /api/users/:id` - Update user role/status
- `PATCH /api/users/:id/transfer-super-admin` - Transfer super admin status

### Records
- `GET /api/records` - List records with pagination/filters (analyst, admin)
- `GET /api/records/:id` - Get single record (analyst, admin)
- `POST /api/records` - Create record (admin only)
- `PATCH /api/records/:id` - Update record (admin only)
- `DELETE /api/records/:id` - Soft-delete record (admin only)

**Query Parameters for GET /api/records:**
- `page` - Page number (default: 1)
- `limit` - Records per page (default: 10)
- `type` - Filter by "income" or "expense"
- `category` - Filter by category
- `from` - Start date (YYYY-MM-DD)
- `to` - End date (YYYY-MM-DD)
- `search` - Search in notes

### Dashboard
- `GET /api/dashboard/summary` - Get aggregated dashboard data (all roles)

## API Request/Response Examples

### POST /api/auth/login
**Description:** Login with email and password to get access and refresh tokens

**Request:**
```json
{
  "email": "admin@zorvyn.com",
  "password": "admin123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "requiresPasswordReset": true
  }
}
```

---

### POST /api/auth/refresh
**Description:** Refresh access token using valid refresh token

**Request:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG..."
  }
}
```

---

### POST /api/auth/logout
**Description:** Logout and invalidate refresh token

**Request:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

---

### POST /api/auth/reset-password
**Description:** Change password for logged-in user

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "oldPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": { "message": "Password reset successfully" }
}
```

---

### GET /api/users
**Description:** List all users (Admin only)

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "user_123",
      "name": "System Administrator",
      "email": "admin@zorvyn.com",
      "role": "admin",
      "status": "active",
      "isSuperAdmin": true,
      "requiresPasswordReset": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### POST /api/users
**Description:** Create new user (Admin only)

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "name": "New User",
  "email": "newuser@zorvyn.com",
  "role": "analyst"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "user_456",
    "name": "New User",
    "email": "newuser@zorvyn.com",
    "role": "analyst",
    "requiresPasswordReset": true,
    "createdAt": "2024-01-15T00:00:00.000Z",
    "tempPassword": "abc123xyz"
  }
}
```

---

### PATCH /api/users/:id
**Description:** Update user role or status (Admin only)

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "role": "admin",
  "status": "active"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "name": "System Administrator",
    "email": "admin@zorvyn.com",
    "role": "admin",
    "status": "active",
    "isSuperAdmin": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T00:00:00.000Z"
  }
}
```

---

### PATCH /api/users/:id/transfer-super-admin
**Description:** Transfer super admin status to another admin (Super Admin only)

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "targetUserId": "target_user_id"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": { "message": "Super admin status transferred successfully" }
}
```

---

### GET /api/records
**Description:** List records with pagination and filters (Analyst, Admin)

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 10)
- `type` (optional: "income" or "expense")
- `category` (optional: "salaries", "rent", etc.)
- `from` (optional: "YYYY-MM-DD")
- `to` (optional: "YYYY-MM-DD")
- `search` (optional: searches in notes)

**Example:** `GET /api/records?page=1&limit=10&type=expense&category=rent`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "rec_abc123",
      "amount": 15000,
      "type": "expense",
      "category": "rent",
      "date": "2024-01-15T00:00:00.000Z",
      "notes": "Office rent payment",
      "createdBy": "user_xyz789",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 19,
    "totalPages": 2
  }
}
```

---

### GET /api/records/:id
**Description:** Get single record by ID (Analyst, Admin)

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "rec_abc123",
    "amount": 15000,
    "type": "expense",
    "category": "rent",
    "date": "2024-01-15T00:00:00.000Z",
    "notes": "Office rent payment",
    "createdBy": "user_xyz789",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Record not found"
}
```

---

### POST /api/records
**Description:** Create new financial record (Admin only)

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "amount": 15000,
  "type": "expense",
  "category": "rent",
  "date": "2024-01-15",
  "notes": "Office rent payment"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "rec_abc123",
    "amount": 15000,
    "type": "expense",
    "category": "rent",
    "date": "2024-01-15T00:00:00.000Z",
    "notes": "Office rent payment",
    "createdBy": "user_xyz789",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### PATCH /api/records/:id
**Description:** Update existing record (Admin only)

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "amount": 20000,
  "notes": "Updated: Office rent payment - January"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "rec_abc123",
    "amount": 20000,
    "type": "expense",
    "category": "rent",
    "date": "2024-01-15T00:00:00.000Z",
    "notes": "Updated: Office rent payment - January",
    "createdBy": "user_xyz789",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-16T09:00:00.000Z"
  }
}
```

---

### DELETE /api/records/:id
**Description:** Soft-delete a record (Admin only)

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": { "message": "Record deleted successfully" }
}
```

---

### GET /api/dashboard/summary
**Description:** Get aggregated dashboard data (All roles: Viewer, Analyst, Admin)

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total_income": 1235000,
    "total_expenses": 485000,
    "net_balance": 750000,
    "category_breakdown": [
      { "category": "client_payments", "amount": 700000, "percentage": 40.7 },
      { "category": "salaries", "amount": 310000, "percentage": 18.0 },
      { "category": "rent", "amount": 100000, "percentage": 5.8 }
    ],
    "monthly_trend": [
      { "month": "2024-04", "income": 365000, "expenses": 140000 },
      { "month": "2024-03", "income": 285000, "expenses": 117000 }
    ],
    "recent_activity": [
      {
        "id": "rec_123",
        "amount": 35000,
        "type": "expense",
        "category": "insurance",
        "date": "2024-04-20T00:00:00.000Z",
        "notes": "Business insurance premium"
      }
    ]
  }
}
```

---

### Error Responses

**Validation Error (400 Bad Request):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "amount": ["Amount must be a positive number"],
    "date": ["Date cannot be in the future"]
  }
}
```

**Authentication Error (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

**Forbidden Error (403 Forbidden):**
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

**Not Found Error (404 Not Found):**
```json
{
  "success": false,
  "error": "Record not found"
}
```

**Rate Limited (429 Too Many Requests):**
```json
{
  "success": false,
  "error": "Too many login attempts. Please try again later."
}
```

## Role-Based Access Control

| Endpoint | Viewer | Analyst | Admin |
|----------|--------|---------|-------|
| POST /api/records | 403 | 403 | ✓ |
| GET /api/records | 403 | ✓ | ✓ |
| GET /api/records/:id | 403 | ✓ | ✓ |
| PATCH /api/records/:id | 403 | 403 | ✓ |
| DELETE /api/records/:id | 403 | 403 | ✓ |
| GET /api/dashboard/summary | ✓ | ✓ | ✓ |
| POST /api/users | 403 | 403 | ✓ |
| GET /api/users | 403 | 403 | ✓ |
| POST /api/auth/login | ✓ | ✓ | ✓ |
| POST /api/auth/refresh | ✓ | ✓ | ✓ |

## Testing

```bash
npm test
```

## Project Structure

```
src/
├── index.ts              # Main application entry
├── middleware/           # Auth, rate limiting, error handling
│   ├── auth.ts          # JWT authentication & role middleware
│   ├── error-handler.ts # Global error handling
│   └── rate-limit.ts    # Login rate limiting
├── routes/              # API route handlers
│   ├── auth.routes.ts   # Authentication endpoints
│   ├── user.routes.ts   # User management endpoints
│   ├── record.routes.ts # Financial records endpoints
│   └── dashboard.routes.ts # Dashboard analytics
├── services/            # Business logic layer
│   ├── auth.service.ts  # Authentication logic
│   ├── user.service.ts  # User management logic
│   ├── record.service.ts # Records CRUD & listing
│   └── dashboard.service.ts # Aggregated analytics
├── tests/               # Integration tests
│   ├── test-setup.ts   # Test app configuration
│   └── integration.test.ts # API tests
├── types/              # TypeScript types
│   └── index.ts        # Shared type definitions
└── utils/              # Utilities
    ├── db.ts           # Prisma client
    ├── env.ts          # Environment validation
    ├── validations.ts  # Zod validation schemas
    ├── tokens.ts       # JWT utilities
    └── password.ts     # Bcrypt utilities
```

## Database Schema

### User
- `id` (String, CUID) - Primary key
- `name` (String) - User's full name
- `email` (String, unique) - User's email
- `passwordHash` (String) - Bcrypt hashed password
- `role` (Enum: viewer, analyst, admin) - User role
- `status` (Enum: active, inactive) - Account status
- `isSuperAdmin` (Boolean) - Super admin flag
- `requiresPasswordReset` (Boolean) - First-time login flag
- `createdAt`, `updatedAt` - Timestamps
- Relations: sessions[], records[]

### Session
- `id` (String, CUID) - Primary key
- `userId` (String) - Foreign key to User
- `token` (String, unique) - Refresh token
- `expiresAt` (DateTime) - Token expiration
- `createdAt` - Timestamp

### Record
- `id` (String, CUID) - Primary key
- `amount` (Integer) - Amount in paise (avoid floating point)
- `type` (Enum: income, expense) - Transaction type
- `category` (Enum) - Category (salaries, rent, etc.)
- `date` (DateTime) - Transaction date
- `notes` (String, optional) - Description
- `createdBy` (String) - Foreign key to User
- `isDeleted` (Boolean) - Soft delete flag
- `deletedAt` (DateTime) - Deletion timestamp
- `createdAt`, `updatedAt` - Timestamps

## Design Decisions

1. **Amount Storage**: Stored as integer paise in database, converted to rupees in API responses to avoid floating-point precision issues
2. **Soft Deletes**: Records marked as deleted rather than removed for audit purposes and data recovery
3. **Response Format**: Standardized envelope `{ success, data, error?, details?, pagination? }` for consistent API
4. **Categories Enum**: Fixed set of 13 categories matching business requirements for data consistency
5. **JWT Tokens**: Short-lived access tokens (15 min) with refresh tokens (7 days) for security
6. **SQL Aggregations**: Dashboard calculations done at database level using GROUP BY and SUM for efficiency

## Assumptions Made

1. **Financial Data Integrity**: Amounts stored as integer paise (not floats) to prevent precision issues common with decimal arithmetic in programming languages

2. **Date Validation**: Future dates are rejected for financial records as they represent real transactions that have occurred, not planned ones

3. **Fixed Categories**: Category is an enum (not free-form text) to ensure consistent data and enable reliable filtering/reporting

4. **Single Super Admin**: The system enforces exactly one super admin user who can transfer their status but cannot be deleted while they're the last one

5. **Soft Delete Only**: No hard deletes implemented - all deletions are soft deletes (isDeleted flag + deletedAt timestamp) to maintain audit trail and allow data recovery

6. **Token Expiry**: JWT access tokens expire in 15 minutes for security, refresh tokens last 7 days for convenience

7. **Single Database**: No multi-database or sharding approach - single PostgreSQL instance

8. **No Multi-tenancy**: System designed for single organization use, not multi-tenant SaaS

9. **Date Range Filtering**: When filtering by date range, from date must be before or equal to to date

10. **Search Scope**: Search functionality limited to notes field only, not all text fields, for performance

## Tradeoffs Considered

1. **Hono vs Express**: Chose Hono for its lightweight footprint and excellent TypeScript support, but sacrificed some middleware ecosystem availability compared to Express

2. **Prisma ORM**: Added some build-time overhead with code generation, but provides excellent type safety and simplifies database operations significantly

3. **Rate Limiting Scope**: Implemented rate limiting only on login endpoint (5 attempts/minute) rather than all endpoints to balance security with complexity - can be extended later

4. **Dashboard Pagination**: No pagination on dashboard summary since it's already aggregated data, limited to last 12 months of trends and 10 recent activities

5. **Search Implementation**: Used case-insensitive substring search on notes only instead of full-text search across all fields for simplicity and performance

6. **Soft Delete Approach**: Chose soft delete over hard delete for audit purposes, accepting the tradeoff of slightly more complex queries (filtering isDeleted=false)

7. **Validation Library**: Used Zod for schema validation - excellent for TypeScript integration but adds a runtime dependency compared to using pure TypeScript types

8. **No API Documentation Generator**: Skipped OpenAPI/Swagger integration due to zod version conflicts - manual API documentation provided instead

## Additional Features

- **Rate Limiting**: 5 login attempts per minute per IP address
- **Password Requirements**: Minimum 8 characters, bcrypt hashing with salt
- **Input Sanitization**: All inputs validated through Zod schemas
- **Environment Validation**: Required env vars checked on startup with clear error messages
- **Idempotent Seed**: Seed script can be run multiple times safely without duplicate data
- **Structured Error Responses**: Consistent error format across all endpoints

## Testing Coverage

The integration tests cover:
- Authentication (login with valid/invalid credentials)
- Role-based access control (viewer, analyst, admin permissions)
- CRUD operations on records
- Dashboard data access
- Input validation and error handling

Run tests with: `npm test`
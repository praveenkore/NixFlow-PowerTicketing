# SLA Tables Missing - Root Cause Analysis & Solution

## Problem Summary

The application is experiencing `PrismaClientKnownRequestError` code P2021 indicating that tables `public.SLAPolicy` and `public.SLAMetric` do not exist in the PostgreSQL database. This causes failures in:

- **Backend**: `sla.repository.js:115` - SLA dashboard repository logic
- **Worker**: `sla-monitoring.job.js:43` - Background SLA monitoring jobs

## Root Cause Analysis

### 1. Schema Drift Identified

**Current State:**
- **Prisma Schema** (`backend/prisma/schema.prisma`) ✅ Includes SLA models (lines 216-298):
  - `SLAPolicy` model
  - `SLAMetric` model
  - `SLABreach` model
  - Related enums: `SLAStatus`, `SLABreachType`

- **Database Schema** ❌ Missing SLA tables:
  - Only has basic tables from initial migration
  - No `SLAPolicy`, `SLAMetric`, or `SLABreach` tables exist

- **Migration History** (`backend/prisma/migrations/`):
  - Only one migration exists: `20240129000000_init`
  - This migration creates only basic tables (User, Ticket, Workflow, Stage, HistoryLog, Comment, TicketWatcher)
  - **No migration exists for SLA tables**

### 2. Why This Happened

The issue stems from a **development workflow gap**:

1. **Initial Migration** (`20240129000000_init`):
   - Created basic ticketing system tables
   - Applied to database successfully

2. **Schema Updates** (Later):
   - SLA models were added to `schema.prisma`
   - **No new migration was created** to reflect these changes
   - Prisma client was regenerated (so code compiles)
   - But database schema was never updated

3. **Deployment**:
   - Database initialized from existing data directory
   - Prisma checks `_prisma_migrations` table
   - Sees migration `20240129000000_init` as applied
   - Reports "No pending migrations to apply"
   - But actual tables don't match current schema

### 3. Why "No Pending Migrations" Message

Prisma's migration system works by:
1. Reading migrations from `prisma/migrations/` directory
2. Checking `_prisma_migrations` table in database
3. Comparing applied migrations vs available migrations
4. Applying only unapplied migrations

Since there's only one migration file and it's marked as applied, Prisma reports "No pending migrations" even though the schema is out of sync.

## Impact

### Affected Components:
1. **SLA Dashboard** - Cannot load SLA policies or metrics
2. **SLA Monitoring Jobs** - Worker jobs fail immediately
3. **SLA Breach Tracking** - Cannot record SLA violations
4. **SLA Compliance Reports** - Cannot generate compliance data

### Error Pattern:
```
PrismaClientKnownRequestError: 
Invalid `prisma.sLAPolicy.findMany()` invocation:
The table `public.SLAPolicy` does not exist in the current database.
```

## Solution

### Option 1: Create and Apply New Migration (Recommended)

This is the cleanest solution that maintains proper migration history.

#### Step 1: Create SLA Migration

```bash
cd backend
npx prisma migrate dev --name add_sla_tables
```

This will:
- Detect schema changes (SLA models)
- Generate migration SQL
- Apply migration to database
- Update `_prisma_migrations` table

#### Step 2: Verify Migration Applied

```bash
npx prisma migrate status
```

Expected output:
```
Migration name          Applied at
20240129000000_init    2026-01-30 ...
20240130000000_add_sla_tables  2026-01-30 ...
```

#### Step 3: Regenerate Prisma Client

```bash
npx prisma generate
```

#### Step 4: Verify Tables Exist

```bash
docker-compose exec db psql -U nixflow -d nixflow -c "\dt SLA*"
```

Expected output:
```
          List of relations
 Schema |   Name    | Type  |  Owner   
--------+-----------+-------+----------
 public | SLABreach | table | nixflow
 public | SLAMetric | table | nixflow
 public | SLAPolicy | table | nixflow
(3 rows)
```

### Option 2: Push Schema Changes (Quick Fix)

Use `db push` to sync schema without migration history. **Not recommended for production**.

```bash
cd backend
npx prisma db push
```

**Warning**: This bypasses migration history and can cause issues in team environments.

### Option 3: Reset Database (Fresh Start)

**Warning**: This deletes all data. Only use for development/testing.

```bash
cd backend
npx prisma migrate reset
```

## Step-by-Step Execution Guide

### For Docker Environment:

```bash
# 1. Stop all services
docker-compose down

# 2. Start database only
docker-compose up -d db

# 3. Wait for database to be ready
docker-compose logs -f db
# Wait until: "database system is ready to accept connections"

# 4. Create and apply migration
cd backend
npx prisma migrate dev --name add_sla_tables

# 5. Regenerate Prisma client
npx prisma generate

# 6. Verify tables exist
docker-compose exec db psql -U nixflow -d nixflow -c "\dt SLA*"

# 7. Start all services
cd ..
docker-compose up -d

# 8. Check logs
docker-compose logs -f backend worker
```

### For Local Development:

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and apply migration
npx prisma migrate dev --name add_sla_tables

# 3. Regenerate Prisma client
npx prisma generate

# 4. Restart backend and worker
npm run dev
```

## Verification

### 1. Check Backend Logs

```bash
docker-compose logs backend | grep -i "SLA"
```

Should see:
- No P2021 errors
- SLA policies loading successfully
- SLA metrics being tracked

### 2. Check Worker Logs

```bash
docker-compose logs worker | grep -i "SLA"
```

Should see:
- SLA monitoring jobs running successfully
- No table missing errors

### 3. Test API Endpoints

```bash
# Get SLA policies
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/sla/policies

# Get SLA metrics
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/sla/metrics
```

## Prevention

### Best Practices to Avoid Schema Drift:

1. **Always Create Migrations After Schema Changes**
   ```bash
   npx prisma migrate dev --name descriptive_name
   ```

2. **Commit Migration Files to Version Control**
   - All files in `prisma/migrations/` should be committed
   - Never modify migration SQL manually

3. **Use Migration Status Checks**
   ```bash
   npx prisma migrate status
   ```

4. **Never Use `db push` in Production**
   - Use only for local development
   - Always use `migrate dev` or `migrate deploy` for production

5. **Database Initialization in Docker**
   - Ensure migrations are applied during container startup
   - Don't rely on pre-existing data directories

## Expected Migration SQL

The new migration should create:

### Tables:
- `SLAPolicy` - SLA policy definitions
- `SLAMetric` - SLA performance tracking per ticket
- `SLABreach` - SLA violation records

### Enums:
- `SLAStatus` - WithinSLA, Warning, Breached
- `SLABreachType` - ResponseTime, ResolutionTime, ApprovalTime

### Indexes:
- Performance indexes on frequently queried fields
- Composite indexes for common query patterns

### Foreign Keys:
- Proper relationships between SLA tables and core tables
- Cascade deletes for data integrity

## Conclusion

The missing SLA tables are due to **schema drift** - the Prisma schema was updated but no migration was created to apply those changes to the database. The solution is to create and apply a new migration using `npx prisma migrate dev --name add_sla_tables`.

This is a common issue in development environments where schema changes are made without proper migration management. Following the best practices outlined above will prevent similar issues in the future.

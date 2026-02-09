# SLA Tables Missing - Resolution Guide

## Problem

The application is experiencing `PrismaClientKnownRequestError` code P2021 indicating that tables `public.SLAPolicy` and `public.SLAMetric` do not exist in the PostgreSQL database.

**Affected Components:**
- Backend: `sla.repository.js:115` - SLA dashboard repository logic
- Worker: `sla-monitoring.job.js:43` - Background SLA monitoring jobs

## Root Cause

**Schema Drift**: The Prisma schema defines SLA models (SLAPolicy, SLAMetric, SLABreach), but the database doesn't have these tables. This occurred because:

1. Initial migration (`20240129000000_init`) created only basic tables
2. SLA models were added to `schema.prisma` later
3. **No migration was created** to apply these schema changes to the database
4. Prisma reports "No pending migrations" because only one migration exists and it's marked as applied
5. But the actual database schema doesn't match the current Prisma schema

## Solution Overview

We've created a new migration `20240130000000_add_sla_tables` that adds all missing tables including:

- **SLA Tables**: SLAPolicy, SLAMetric, SLABreach
- **Knowledge Base Tables**: KnowledgeCategory, KnowledgeTag, KnowledgeArticle, etc.
- **Form Builder Tables**: CustomForm, FormField, FormSubmission, etc.
- **Email Integration Tables**: EmailAccount, EmailMessage, EmailAttachment, etc.
- **Event Log Table**: EventLog for EDA audit trail

## Quick Fix (Windows)

Since you're on Windows, use the batch script:

```cmd
apply_sla_migration.bat
```

This script will:
1. Stop backend and worker services
2. Apply the migration to database
3. Record migration in migration history
4. Regenerate Prisma client
5. Verify tables exist
6. Restart services
7. Check logs for errors

## Quick Fix (Linux/Mac)

```bash
chmod +x apply_sla_migration.sh
./apply_sla_migration.sh
```

## Manual Fix (Step-by-Step)

If you prefer to run commands manually:

### 1. Stop Services

```cmd
docker-compose stop backend worker
```

### 2. Apply Migration

```cmd
cd backend
type prisma\migrations\20240130000000_add_sla_tables\migration.sql | docker-compose exec -T db psql -U nixflow -d nixflow
```

### 3. Record Migration

```cmd
docker-compose exec -T db psql -U nixflow -d nixflow -c "INSERT INTO ""_prisma_migrations"" (""migration_name"", ""rolled_back_at"", ""started_at"", ""applied_steps_count"") VALUES ('20240130000000_add_sla_tables', NULL, NOW(), 1) ON CONFLICT (""migration_name"") DO NOTHING;"
```

### 4. Regenerate Prisma Client

```cmd
npx prisma generate
```

### 5. Verify Tables

```cmd
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

### 6. Restart Services

```cmd
cd ..
docker-compose up -d backend worker
```

## Verification

### Check Backend Logs

```cmd
docker-compose logs backend --tail 50
```

Look for:
- ✅ No P2021 errors
- ✅ SLA policies loading successfully
- ✅ SLA metrics being tracked

### Check Worker Logs

```cmd
docker-compose logs worker --tail 50
```

Look for:
- ✅ SLA monitoring jobs running successfully
- ✅ No table missing errors

### Test API Endpoints

```cmd
REM Get SLA policies
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/sla/policies

REM Get SLA metrics
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/sla/metrics
```

## What the Migration Creates

### SLA Tables
- **SLAPolicy**: SLA policy definitions with response/resolution time targets
- **SLAMetric**: Per-ticket SLA performance tracking
- **SLABreach**: SLA violation records with acknowledgment workflow

### Knowledge Base Tables
- KnowledgeCategory, KnowledgeTag, KnowledgeArticle
- KnowledgeArticleVersion, KnowledgeArticleRating, KnowledgeArticleView
- KnowledgeArticleFeedback, KnowledgeArticleAttachment, KnowledgeSearchHistory

### Form Builder Tables
- CustomForm, FormField, FormSubmission
- FormSubmissionAttachment

### Email Integration Tables
- EmailAccount, EmailMessage, EmailAttachment, EmailThread

### Event Log Table
- EventLog: Tracks all EDA events for audit trail

## Prevention

### Best Practices to Avoid Schema Drift

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

## Troubleshooting

### Migration Fails

**Error**: `relation "SLAPolicy" does not exist`

**Solution**: The migration SQL has foreign key constraints that reference tables being created. The migration is designed to be run in one transaction. If it fails, check that the initial migration was applied:

```cmd
docker-compose exec db psql -U nixflow -d nixflow -c "SELECT * FROM _prisma_migrations;"
```

### Services Won't Start

**Error**: Services crash after migration

**Solution**: Check logs for specific errors:

```cmd
docker-compose logs backend --tail 100
docker-compose logs worker --tail 100
```

Common issues:
- Missing environment variables in `.env`
- Database connection issues
- Port conflicts

### Tables Still Missing After Migration

**Error**: `\dt SLA*` shows no tables

**Solution**: Verify migration was recorded:

```cmd
docker-compose exec db psql -U nixflow -d nixflow -c "SELECT * FROM _prisma_migrations WHERE migration_name = '20240130000000_add_sla_tables';"
```

If not recorded, manually insert the migration record (see Step 3 above).

## Additional Resources

- **Full Analysis**: See `SLA_TABLES_MISSING_ANALYSIS.md` for detailed root cause analysis
- **Migration Files**: Located in `backend/prisma/migrations/20240130000000_add_sla_tables/`
- **Prisma Schema**: `backend/prisma/schema.prisma` - Lines 216-298 define SLA models

## Support

If you encounter issues not covered in this guide:

1. Check the detailed analysis in `SLA_TABLES_MISSING_ANALYSIS.md`
2. Review the migration SQL in `backend/prisma/migrations/20240130000000_add_sla_tables/migration.sql`
3. Check Docker Compose logs: `docker-compose logs`
4. Verify database connectivity: `docker-compose exec db psql -U nixflow -d nixflow`

## Summary

The missing SLA tables issue is caused by **schema drift** - the Prisma schema was updated to include SLA models, but no migration was created to apply those changes to the database. 

The solution is to apply the new migration `20240130000000_add_sla_tables` using either:
- Windows batch script: `apply_sla_migration.bat` (recommended)
- Linux/Mac shell script: `./apply_sla_migration.sh`
- Manual execution of SQL commands

After applying the migration, the SLA dashboard, monitoring jobs, and all SLA-related features will work correctly.

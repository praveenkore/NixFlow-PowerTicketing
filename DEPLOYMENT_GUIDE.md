# NixFlow Ticketing System - Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start (Docker Compose)](#quick-start-docker-compose)
4. [Development Setup](#development-setup)
5. [Production Deployment](#production-deployment)
6. [Configuration](#configuration)
7. [Security Considerations](#security-considerations)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Scaling Strategies](#scaling-strategies)

---

## Overview

NixFlow is an enterprise-grade ticketing system with Event-Driven Architecture (EDA), comprehensive SLA management, Knowledge Base, Web Form Builder, and Email Integration. The system is containerized and designed for easy deployment and scaling.

### System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │◄───▶│    Backend      │◄───▶│   Database      │     │   Worker        │
│   (React 19)   │     │  (Express API)  │     │  (PostgreSQL)   │     │   (BullMQ)      │
│   Port: 5173   │     │   Port: 3000    │     │   Port: 5432    │     │   Port: N/A     │
└─────────────────┘     └────────┬────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Redis Queue   │
                       │   Port: 6379    │
                       └─────────────────┘
```

### Services

| Service | Technology | Port | Purpose |
|---------|-----------|------|---------|
| **Frontend** | React 19 + Vite | 5173 | User interface |
| **Backend** | Express + TypeScript | 3000 | REST API + Socket.IO |
| **Database** | PostgreSQL 15 | 5432 | Data persistence |
| **Redis** | Redis 7 | 6379 | Event Bus + Job Queues |
| **Worker** | BullMQ + TypeScript | N/A | Background job processing |

---

## Prerequisites

### Required Software

- **Docker**: 20.10+ (for containerized deployment)
- **Docker Compose**: 2.0+ (for orchestration)
- **Node.js**: 18+ (for frontend), 20+ (for backend/worker)
- **Git**: Latest version (for cloning repository)

### System Requirements

#### Minimum Requirements (Development)
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Disk**: 20 GB
- **Network**: 100 Mbps

#### Recommended Requirements (Production)
- **CPU**: 4+ cores
- **RAM**: 8+ GB
- **Disk**: 50+ GB SSD
- **Network**: 1 Gbps

### Operating System Support

- Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+)
- macOS 11+ (Big Sur)
- Windows 10/11 with WSL2

---

## Quick Start (Docker Compose)

This is the fastest way to get NixFlow up and running.

### Pre-Deployment Checklist

Before starting deployment, ensure the following:

- [ ] **package-lock.json exists** in all directories (`backend/`, `project/`, `worker/`)
- [ ] **Docker and Docker Compose installed** (version 20.10+ and 2.0+)
- [ ] **Ports 3000, 5173, 5432, 6379 are available**
- [ ] **At least 4GB RAM available** for Docker containers
- [ ] **Environment variables configured** (see Configuration section)

**Note**: If `package-lock.json` is missing, run `npm install` in the respective directory to generate it:
```bash
cd backend && npm install
cd ../project && npm install
cd ../worker && npm install
```

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd powered-ticketing-system-v1-containerized
```

### Step 2: Configure Environment Variables

The project now uses a `.env` file for environment variables. Review and update the values in [`.env`](.env:1):

```env
# Database Credentials
POSTGRES_USER=nixflow
POSTGRES_PASSWORD=nixflow
POSTGRES_DB=nixflow

# Backend Configuration
DATABASE_URL=postgres://nixflow:nixflow@db:5432/nixflow
FRONTEND_URL=http://localhost:5173
JWT_SECRET=9b81518b074173b0a0d32fe448aab38a3ba3b883c5396933aa7f41802355c94b40
REDIS_URL=redis://redis:6379
ENCRYPTION_KEY=a554470d03e31199217943349714d20b
EMAIL_ATTACHMENTS_DIR=/app/uploads/email-attachments

# Frontend Configuration
VITE_API_URL=http://backend:3000

# Worker Configuration
SLA_CHECK_INTERVAL_MINUTES=1
```

**⚠️ SECURITY NOTE**: The `.env` file is included in [`.gitignore`](.gitignore:1) to prevent committing secrets to version control. For production deployment:

1. Generate new secure secrets:
   ```bash
   # Generate JWT secret (64 hex chars)
   openssl rand -hex 32

   # Generate encryption key (32 hex chars)
   openssl rand -hex 16
   ```

2. Update `.env` with production values
3. Never commit `.env` to version control
4. Use environment variable injection in production (Kubernetes Secrets, AWS Secrets Manager, etc.)

### Step 3: Start All Services

```bash
# Start all services in detached mode
docker-compose up -d

# Or start with logs visible
docker-compose up
```

### Step 4: Verify Services are Running

```bash
# Check service status
docker-compose ps

# Expected output:
# NAME                STATUS              PORTS
# db                  Up (healthy)        0.0.0.0:5432->5432/tcp
# redis               Up (healthy)        0.0.0.0:6379->6379/tcp
# backend             Up                  0.0.0.0:3000->3000/tcp
# frontend            Up                  0.0.0.0:5173->5173/tcp
# worker              Up
```

### Step 5: Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Health Check**: http://localhost:3000/api/health (if implemented)

### Step 6: Initial Login

The system will be seeded with initial users. Check the seed script for default credentials:

```bash
# View seed data
cat backend/prisma/seed.ts
```

Default credentials (example):
- Email: `admin@nixflow.com`
- Password: `admin123` (change immediately after first login)

### Step 7: Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

---

## Development Setup

For local development without Docker, follow these steps.

### Step 1: Install Dependencies

#### Backend

```bash
cd backend
npm install
```

#### Frontend

```bash
cd project
npm install
```

#### Worker

```bash
cd worker
npm install
```

### Step 2: Set Up PostgreSQL

#### Option A: Use Docker for Database Only

```bash
docker run -d \
  --name nixflow-db \
  -e POSTGRES_USER=nixflow \
  -e POSTGRES_PASSWORD=nixflow \
  -e POSTGRES_DB=nixflow \
  -p 5432:5432 \
  postgres:15-alpine
```

#### Option B: Install PostgreSQL Locally

```bash
# Ubuntu/Debian
sudo apt-get install postgresql-15 postgresql-client-15

# macOS
brew install postgresql@15

# Windows
# Download from https://www.postgresql.org/download/windows/
```

Create database and user:

```bash
sudo -u postgres psql
```

```sql
CREATE USER nixflow WITH PASSWORD 'nixflow';
CREATE DATABASE nixflow OWNER nixflow;
GRANT ALL PRIVILEGES ON DATABASE nixflow TO nixflow;
\q
```

### Step 3: Set Up Redis

#### Option A: Use Docker for Redis Only

```bash
docker run -d \
  --name nixflow-redis \
  -p 6379:6379 \
  redis:7-alpine
```

#### Option B: Install Redis Locally

```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Start Redis
redis-server
```

### Step 4: Configure Environment Variables

#### Backend (`.env`)

```env
DATABASE_URL=postgres://nixflow:nixflow@localhost:5432/nixflow
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-secret-key-change-in-production
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=your-encryption-key-32-chars-long!!
EMAIL_ATTACHMENTS_DIR=./uploads/email-attachments
PORT=3000
```

#### Frontend (`.env.local`)

```env
VITE_API_URL=http://localhost:3000
```

#### Worker (`.env`)

```env
DATABASE_URL=postgres://nixflow:nixflow@localhost:5432/nixflow
REDIS_URL=redis://localhost:6379
SLA_CHECK_INTERVAL_MINUTES=1
```

### Step 5: Run Database Migrations

```bash
cd backend
npx prisma migrate dev
```

### Step 6: Seed Database

```bash
cd backend
npm run seed
```

### Step 7: Start Development Servers

#### Terminal 1: Backend

```bash
cd backend
npm run dev
```

Backend will run on http://localhost:3000

#### Terminal 2: Frontend

```bash
cd project
npm run dev
```

Frontend will run on http://localhost:5173

#### Terminal 3: Worker

```bash
cd worker
npm run dev
```

Worker will process background jobs

### Step 8: Verify Services

```bash
# Test backend
curl http://localhost:3000/api/health

# Test frontend
curl http://localhost:5173
```

---

## Production Deployment

### Option 1: Docker Compose (Single Server)

#### Step 1: Prepare Production Environment

```bash
# Clone repository
git clone <repository-url>
cd powered-ticketing-system-v1-containerized

# Create production environment file
cat > .env.production << EOF
# Database
POSTGRES_USER=nixflow_prod
POSTGRES_PASSWORD=$(openssl rand -base64 32)
POSTGRES_DB=nixflow_prod

# Backend
DATABASE_URL=postgres://nixflow_prod:$(openssl rand -base64 32)@db:5432/nixflow_prod
FRONTEND_URL=https://your-domain.com
JWT_SECRET=$(openssl rand -base64 64)
REDIS_URL=redis://redis:6379
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Frontend
VITE_API_URL=https://api.your-domain.com

# Worker
SLA_CHECK_INTERVAL_MINUTES=1
EOF
```

#### Step 2: Update Docker Compose for Production

Create [`docker-compose.prod.yml`](docker-compose.prod.yml:1):

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      FRONTEND_URL: ${FRONTEND_URL}
      JWT_SECRET: ${JWT_SECRET}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      EMAIL_ATTACHMENTS_DIR: /app/uploads/email-attachments
      NODE_ENV: production
    ports:
      - "3000:3000"
    volumes:
      - email_attachments:/app/uploads/email-attachments
      - ./logs:/app/logs
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: sh -c "npx prisma migrate deploy && npm run seed && node dist/index.js"
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  frontend:
    build:
      context: ./project
      dockerfile: Dockerfile
    ports:
      - "80:5173"
    depends_on:
      - backend
    environment:
      VITE_API_URL: ${VITE_API_URL}
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  worker:
    build:
      context: .
      dockerfile: ./worker/Dockerfile
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      SLA_CHECK_INTERVAL_MINUTES: 1
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  postgres_data:
  redis_data:
  email_attachments:
```

#### Step 3: Start Production Services

```bash
# Load environment variables
export $(cat .env.production | xargs)

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### Option 2: Kubernetes (Multi-Server/Cloud)

#### Step 1: Prepare Kubernetes Manifests

Create [`k8s/namespace.yaml`](k8s/namespace.yaml:1):

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: nixflow
```

Create [`k8s/configmap.yaml`](k8s/configmap.yaml:1):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nixflow-config
  namespace: nixflow
data:
  FRONTEND_URL: "https://your-domain.com"
  VITE_API_URL: "https://api.your-domain.com"
  SLA_CHECK_INTERVAL_MINUTES: "1"
```

Create [`k8s/secret.yaml`](k8s/secret.yaml:1):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: nixflow-secrets
  namespace: nixflow
type: Opaque
stringData:
  POSTGRES_PASSWORD: "your-secure-password"
  JWT_SECRET: "your-jwt-secret"
  ENCRYPTION_KEY: "your-encryption-key-32-chars-long!!"
  REDIS_PASSWORD: "your-redis-password"
```

Create [`k8s/deployment.yaml`](k8s/deployment.yaml:1):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: nixflow
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: your-registry/nixflow-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: nixflow-secrets
              key: DATABASE_URL
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: nixflow-secrets
              key: JWT_SECRET
        - name: FRONTEND_URL
          valueFrom:
            configMapKeyRef:
              name: nixflow-config
              key: FRONTEND_URL
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

Create [`k8s/service.yaml`](k8s/service.yaml:1):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: nixflow
spec:
  selector:
    app: backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

Create [`k8s/ingress.yaml`](k8s/ingress.yaml:1):

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nixflow-ingress
  namespace: nixflow
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - your-domain.com
    - api.your-domain.com
    secretName: nixflow-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
  - host: api.your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 80
```

#### Step 2: Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Apply configurations
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# Deploy applications
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Check status
kubectl get pods -n nixflow
kubectl get services -n nixflow
kubectl get ingress -n nixflow
```

### Option 3: Cloud Platform Deployment

#### AWS (ECS/EKS)

1. **Push Docker Images to ECR**:
   ```bash
   aws ecr create-repository --repository-name nixflow-backend
   aws ecr create-repository --repository-name nixflow-frontend
   aws ecr create-repository --repository-name nixflow-worker

   docker build -t nixflow-backend ./backend
   docker tag nixflow-backend:latest <aws-account-id>.dkr.ecr.<region>.amazonaws.com/nixflow-backend:latest
   docker push <aws-account-id>.dkr.ecr.<region>.amazonaws.com/nixflow-backend:latest
   ```

2. **Create RDS PostgreSQL instance**:
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier nixflow-db \
     --db-instance-class db.t3.medium \
     --engine postgres \
     --engine-version 15.4 \
     --master-username nixflow \
     --master-user-password <secure-password> \
     --allocated-storage 20
   ```

3. **Create ElastiCache Redis instance**:
   ```bash
   aws elasticache create-cache-cluster \
     --cache-cluster-id nixflow-redis \
     --engine redis \
     --cache-node-type cache.t3.medium \
     --num-cache-nodes 1
   ```

4. **Deploy to ECS**:
   - Create ECS task definitions
   - Create ECS services
   - Configure Application Load Balancer

#### Google Cloud (GKE)

1. **Push Docker Images to GCR**:
   ```bash
   gcloud auth configure-docker
   docker build -t gcr.io/<project-id>/nixflow-backend ./backend
   docker push gcr.io/<project-id>/nixflow-backend
   ```

2. **Create Cloud SQL PostgreSQL instance**:
   ```bash
   gcloud sql instances create nixflow-db \
     --tier=db-f1-micro \
     --database-version=POSTGRES_15 \
     --region=us-central1
   ```

3. **Create Memorystore Redis instance**:
   ```bash
   gcloud redis instances create nixflow-redis \
     --size=1 \
     --region=us-central1 \
     --redis-version=redis_7
   ```

4. **Deploy to GKE**:
   ```bash
   gcloud container clusters create nixflow-cluster \
     --num-nodes=3 \
     --machine-type=e2-medium \
     --region=us-central1

   kubectl apply -f k8s/
   ```

#### Azure (AKS)

1. **Push Docker Images to ACR**:
   ```bash
   az acr create --resource-group nixflow-rg --name nixflowacr --sku Basic
   az acr login --name nixflowacr
   docker build -t nixflowacr.azurecr.io/nixflow-backend ./backend
   docker push nixflowacr.azurecr.io/nixflow-backend
   ```

2. **Create Azure Database for PostgreSQL**:
   ```bash
   az postgres server create \
     --name nixflow-db \
     --resource-group nixflow-rg \
     --sku B_Gen5_1 \
     --location eastus \
     --admin-user nixflow \
     --admin-password <secure-password>
   ```

3. **Create Azure Cache for Redis**:
   ```bash
   az redis create \
     --name nixflow-redis \
     --resource-group nixflow-rg \
     --location eastus \
     --sku Basic \
     --vm-size C0
   ```

4. **Deploy to AKS**:
   ```bash
   az aks create \
     --resource-group nixflow-rg \
     --name nixflow-cluster \
     --node-count 3 \
     --node-vm-size Standard_B2s \
     --generate-ssh-keys

   kubectl apply -f k8s/
   ```

---

## Configuration

### Backend Configuration

#### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `FRONTEND_URL` | Yes | - | Frontend URL for CORS |
| `JWT_SECRET` | Yes | - | Secret key for JWT signing |
| `REDIS_URL` | Yes | - | Redis connection string |
| `ENCRYPTION_KEY` | Yes | - | 32-character key for AES-256 encryption |
| `EMAIL_ATTACHMENTS_DIR` | Yes | `./uploads/email-attachments` | Directory for email attachments |
| `PORT` | No | `3000` | Backend server port |

#### Rate Limiting

Configure rate limits in [`backend/src/index.ts`](backend/src/index.ts:1):

```typescript
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later.',
});
```

### Frontend Configuration

#### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | - | Backend API URL |

### Worker Configuration

#### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `REDIS_URL` | Yes | - | Redis connection string |
| `SLA_CHECK_INTERVAL_MINUTES` | No | `1` | SLA monitoring interval |

#### Job Queue Configuration

Configure queues in [`worker/src/config/queue.config.ts`](worker/src/config/queue.config.ts:1):

```typescript
export const queueConfig = {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
};
```

---

## Security Considerations

### 1. Change Default Credentials

**⚠️ CRITICAL**: Change all default passwords and secrets before production deployment.

```bash
# Generate secure secrets
JWT_SECRET=$(openssl rand -base64 64)
ENCRYPTION_KEY=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
```

### 2. Enable HTTPS

#### Using Nginx Reverse Proxy

Create [`nginx.conf`](nginx.conf:1):

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Using Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (certbot sets this up automatically)
sudo certbot renew --dry-run
```

### 3. Configure Firewall

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# iptables
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -j DROP
```

### 4. Database Security

- Restrict database access to localhost only
- Use strong passwords
- Enable SSL connections
- Regular backups

```yaml
# docker-compose.yml - Bind PostgreSQL to localhost
ports:
  - "127.0.0.1:5432:5432"
```

### 5. Redis Security

- Enable authentication
- Bind to localhost
- Disable dangerous commands

```yaml
# docker-compose.yml - Redis with password
command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
```

### 6. CORS Configuration

Update CORS settings in [`backend/src/index.ts`](backend/src/index.ts:1):

```typescript
app.use(cors({
  origin: [
    'https://your-domain.com',
    'https://api.your-domain.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### 7. Security Headers

Add security headers middleware:

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

---

## Monitoring & Maintenance

### 1. Health Checks

Add health check endpoints:

```typescript
// backend/src/index.ts
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis connection
    await redis.ping();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});
```

### 2. Logging

Configure Winston logger:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

### 3. Database Backups

#### Automated Backup Script

Create [`scripts/backup.sh`](scripts/backup.sh:1):

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="nixflow_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=7

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
docker exec nixflow-db-1 pg_dump -U nixflow nixflow | gzip > $BACKUP_DIR/$BACKUP_FILE

# Remove old backups
find $BACKUP_DIR -name "nixflow_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_FILE"
```

#### Cron Job

```bash
# Add to crontab (daily at 2 AM)
0 2 * * * /path/to/scripts/backup.sh >> /var/log/nixflow-backup.log 2>&1
```

### 4. Monitoring with Prometheus

Add Prometheus metrics:

```typescript
import promClient from 'prom-client';

const register = new promClient.Registry();

// HTTP request duration
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.observe(
      { method: req.method, route: req.route?.path || req.path, status_code: res.statusCode },
      duration
    );
  });
  next();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 5. Log Aggregation with ELK Stack

```yaml
# docker-compose.elk.yml
version: '3.8'

services:
  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  logstash:
    image: logstash:8.11.0
    ports:
      - "5000:5000"
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

  kibana:
    image: kibana:8.11.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Symptoms**:
```
Error: Can't reach database server at `db:5432`
```

**Solutions**:
```bash
# Check if database is running
docker-compose ps db

# Check database logs
docker-compose logs db

# Verify database health
docker-compose exec db pg_isready -U nixflow

# Restart database
docker-compose restart db
```

#### 2. Redis Connection Failed

**Symptoms**:
```
Error: Redis connection failed
```

**Solutions**:
```bash
# Check if Redis is running
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Test Redis connection
docker-compose exec redis redis-cli ping

# Restart Redis
docker-compose restart redis
```

#### 3. Worker Not Processing Jobs

**Symptoms**:
- SLA breaches not being detected
- Background jobs not completing

**Solutions**:
```bash
# Check worker logs
docker-compose logs worker

# Check BullMQ queues
docker-compose exec redis redis-cli

# In Redis CLI
> KEYS bull:*
> LLEN bull:sla:waiting
> LLEN bull:sla:active

# Restart worker
docker-compose restart worker
```

#### 4. Frontend Cannot Connect to Backend

**Symptoms**:
```
Network Error: Failed to fetch
```

**Solutions**:
```bash
# Check backend is running
docker-compose ps backend

# Check backend logs
docker-compose logs backend

# Verify CORS configuration
# Check backend/src/index.ts for CORS settings

# Test backend API directly
curl http://localhost:3000/api/health
```

#### 5. Out of Memory Errors

**Symptoms**:
```
JavaScript heap out of memory
```

**Solutions**:
```yaml
# Increase memory limit in docker-compose.yml
services:
  backend:
    mem_limit: 2g
    memswap_limit: 2g

# Or in Kubernetes
resources:
  limits:
    memory: "2Gi"
```

#### 6. Database Migration Failed

**Symptoms**:
```
Error: Migration failed
```

**Solutions**:
```bash
# Check migration status
docker-compose exec backend npx prisma migrate status

# Reset database (⚠️ DELETES ALL DATA)
docker-compose exec backend npx prisma migrate reset

# Manually run migration
docker-compose exec backend npx prisma migrate deploy
```

#### 7. Docker Build Error - npm ci Failed

**Symptoms**:
```
ERROR: The `npm ci` command can only install with an existing package-lock.json
```

**Cause**: The Dockerfile is trying to run `npm ci` but `package-lock.json` is not being copied into the Docker context correctly.

**Solutions**:

**Option 1**: Ensure `package-lock.json` exists in the project directory:
```bash
# Check if package-lock.json exists
ls -la worker/package-lock.json

# If not present, generate it
cd worker
npm install
```

**Option 2**: The worker Dockerfile has been updated to handle missing `package-lock.json` gracefully. If you're still experiencing issues, verify the Dockerfile paths:

```dockerfile
# worker/Dockerfile should use these paths:
COPY worker/package*.json ./
COPY worker/src ./src
COPY worker/tsconfig.json ./
COPY backend/prisma/schema.prisma ./prisma/schema.prisma
COPY backend/prisma/migrations ./prisma/migrations
```

**Option 3**: Rebuild Docker images with no cache:
```bash
docker-compose build --no-cache
docker-compose up -d
```

**Option 4**: Check docker-compose.yml build context:
```yaml
worker:
  build:
    context: .  # Build context is root directory
    dockerfile: ./worker/Dockerfile
```

### Debug Mode

Enable debug logging:

```bash
# Set DEBUG environment variable
export DEBUG=*

# Or in docker-compose.yml
services:
  backend:
    environment:
      - DEBUG=*
```

### Container Shell Access

```bash
# Access backend container
docker-compose exec backend sh

# Access database container
docker-compose exec db psql -U nixflow -d nixflow

# Access Redis container
docker-compose exec redis redis-cli
```

---

## Scaling Strategies

### 1. Horizontal Scaling

#### Multiple Backend Instances

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  backend:
    deploy:
      replicas: 3
    # ... rest of configuration
```

```bash
docker-compose -f docker-compose.scale.yml up -d --scale backend=3
```

#### Kubernetes Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: nixflow
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 2. Database Scaling

#### Read Replicas

```yaml
# docker-compose.replica.yml
services:
  db-primary:
    image: postgres:15-alpine
    command: postgres -c max_replication_slots=5

  db-replica:
    image: postgres:15-alpine
    command: postgres -c hot_standby=on
    depends_on:
      - db-primary
```

#### Connection Pooling with PgBouncer

```yaml
services:
  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    environment:
      DATABASES_HOST: db
      DATABASES_PORT: 5432
      DATABASES_USER: nixflow
      DATABASES_PASSWORD: nixflow
      DATABASES_DBNAME: nixflow
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 1000
    ports:
      - "6432:6432"
```

### 3. Redis Scaling

#### Redis Cluster

```yaml
services:
  redis-node-1:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf

  redis-node-2:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf

  redis-node-3:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf
```

### 4. CDN for Static Assets

Configure CDN for frontend static files:

```nginx
# nginx.conf
location /static/ {
    proxy_pass https://your-cdn.cloudfront.net/static/;
    proxy_cache_valid 200 1y;
    add_header Cache-Control "public, immutable";
}
```

### 5. Load Balancing

#### Nginx Load Balancer

```nginx
upstream backend {
    least_conn;
    server backend1:3000;
    server backend2:3000;
    server backend3:3000;
}

server {
    location /api/ {
        proxy_pass http://backend;
    }
}
```

#### Kubernetes Service with LoadBalancer

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: nixflow
spec:
  type: LoadBalancer
  selector:
    app: backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
```

---

## Appendix

### A. Useful Commands

```bash
# Docker Compose
docker-compose up -d              # Start services
docker-compose down               # Stop services
docker-compose ps                 # List services
docker-compose logs <service>     # View logs
docker-compose exec <service> sh  # Access container shell

# Docker
docker ps                         # List running containers
docker logs <container-id>        # View container logs
docker stats                      # Container resource usage
docker system prune              # Remove unused resources

# Database
docker-compose exec db psql -U nixflow -d nixflow  # Access database
pg_dump -U nixflow nixflow > backup.sql           # Backup database
psql -U nixflow nixflow < backup.sql             # Restore database

# Redis
docker-compose exec redis redis-cli               # Access Redis CLI
redis-cli KEYS bull:*                             # List BullMQ queues
redis-cli LLEN bull:sla:waiting                   # Check queue length

# Kubernetes
kubectl get pods -n nixflow                       # List pods
kubectl logs <pod-name> -n nixflow               # View pod logs
kubectl exec -it <pod-name> -n nixflow -- sh     # Access pod shell
kubectl scale deployment backend -n nixflow --replicas=3  # Scale deployment
```

### B. Port Mapping

| Service | Internal Port | External Port |
|---------|---------------|---------------|
| Frontend | 5173 | 5173 (or 80 for production) |
| Backend | 3000 | 3000 (or 80 via reverse proxy) |
| Database | 5432 | 5432 (bind to localhost only) |
| Redis | 6379 | 6379 (bind to localhost only) |

### C. Volume Mounts

| Volume | Path | Purpose |
|--------|------|---------|
| `postgres_data` | `/var/lib/postgresql/data` | PostgreSQL data persistence |
| `redis_data` | `/data` | Redis persistence |
| `email_attachments` | `/app/uploads/email-attachments` | Email attachment storage |

### D. Default Credentials

⚠️ **Change these immediately after first deployment!**

| Service | Username | Password |
|---------|----------|----------|
| PostgreSQL | nixflow | nixflow |
| Admin User | admin@nixflow.com | admin123 |

### E. Support and Resources

- **Documentation**: Check `.kilocode/rules/memory-bank/` for detailed architecture and implementation guides
- **Issue Tracker**: Report bugs and feature requests
- **Community**: Join discussions and get help from the community

---

## Changelog

### Version 1.0.2 (2026-01-30)
- Moved all secrets from docker-compose.yml to .env file
- Updated docker-compose.yml to use ${VARIABLE} syntax for all environment variables
- Created .gitignore file to prevent committing secrets to version control
- Added security recommendations for production deployment
- Updated environment variable configuration documentation

### Version 1.0.1 (2025-01-30)
- Fixed worker Dockerfile to handle missing package-lock.json gracefully
- Updated COPY paths to work with docker-compose.yml build context
- Added conditional npm ci/npm install fallback for better compatibility
- Added pre-deployment checklist for package-lock.json verification
- Added troubleshooting section for Docker build errors

### Version 1.0.0 (2025-01-30)
- Initial deployment guide
- Docker Compose deployment
- Kubernetes deployment
- Cloud platform deployment guides (AWS, GCP, Azure)
- Security best practices
- Monitoring and maintenance procedures
- Troubleshooting guide
- Scaling strategies

---

**Last Updated**: January 30, 2026
**Document Version**: 1.0.2

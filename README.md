# NixFlow PowerTicketing System

NixFlow is an enterprise-grade, containerized ticketing system designed for streamlined request management, multi-stage approvals, and automated service level agreement (SLA) enforcement.

## 🚀 Key Features

- **Advanced Ticket Management**: Multi-category creation with priority levels and dependencies.
- **Approval Workflows**: Configurable multi-stage approval processes.
- **Automation Engine**: 
    - Auto-assignment (Round-robin)
    - Dynamic prioritization based on keywords
    - SLA-based auto-escalation
- **Role-Based Access Control (RBAC)**: Fine-grained permissions (Engineer, Manager, Admin, etc.).
- **Security First**: 
    - JWT-based authentication
    - Rate limiting and XSS protection
    - Encrypted database communications
- **Real-time Monitoring**: Dashboard with live statistics and comprehensive audit trails.

## 🛠️ Technology Stack

- **Frontend**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/)
- **Backend**: [Express.js](https://expressjs.com/), [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL 15](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
- **Cache/Queue**: [Redis](https://redis.io/)
- **Infrastructure**: [Docker](https://www.docker.com/), [Docker Compose](https://docs.docker.com/compose/)

## 📂 Project Structure

```text
├── backend/          # Express API server
├── project/          # React frontend application
├── worker/           # Background process for SLA/Tasks
├── docker-compose.yml # Orchestration configuration
└── .gitignore        # Optimized Git exclusion rules
```

## ⚙️ Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js (for local development)

### Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/praveenkore/NixFlow-PowerTicketing.git
   cd NixFlow-PowerTicketing
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the root directory (refer to `.env.example` if available or use the docker-compose defaults).

3. **Launch with Docker Compose**:
   ```bash
   docker-compose up --build
   ```

4. **Access the Application**:
   - **Frontend**: `http://localhost:5173`
   - **Backend API**: `http://localhost:3000`

## 🔒 Security & Performance

- **Rate Limiting**: 100 requests per 15 minutes.
- **XSS Protection**: Sanitized via DOMPurify.
- **Audit Logs**: Every action is recorded for compliance.
- **Scalable Architecture**: Stateless backend design supports horizontal scaling.

---
© 2026 Nixsoft Technologies Private Limited. All rights reserved.

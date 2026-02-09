# Security Fixes Summary

## Overview
This document summarizes the Critical/High security fixes applied to the NixFlow Ticketing System.

## Changes Made

### 1. Backend Dependencies ([`backend/package.json`](backend/package.json))
Added security-related dependencies:
- `bcryptjs`: For secure password hashing
- `jsonwebtoken`: For JWT-based authentication
- `express-rate-limit`: For rate limiting and brute force protection

### 2. Frontend Dependencies ([`project/package.json`](project/package.json))
Added security-related dependency:
- `dompurify`: For XSS protection by sanitizing HTML content

### 3. Password Hashing ([`backend/prisma/seed.ts`](backend/prisma/seed.ts))
**Before:** Passwords stored in plain text
```typescript
{ name: 'Alice', email: 'alice@example.com', password: 'password', role: Role.Engineer }
```

**After:** Passwords hashed using bcrypt with salt rounds of 10
```typescript
import bcrypt from 'bcryptjs';
const hashedPassword = await bcrypt.hash(userData.password, 10);
await prisma.user.upsert({
  where: { email: userData.email },
  update: {},
  create: { ...userData, password: hashedPassword },
});
```

### 4. Backend Security Enhancements ([`backend/src/index.ts`](backend/src/index.ts))

#### A. CORS Configuration
**Before:** Open CORS allowing all origins
```typescript
app.use(cors());
```

**After:** Configured CORS with specific origin
```typescript
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
```

#### B. Rate Limiting
**Before:** No rate limiting

**After:** Two-tier rate limiting
```typescript
// General API rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests from this IP, please try again later.' },
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per window
  message: { error: 'Too many login attempts, please try again later.' },
});
app.use('/api/login', authLimiter);
```

#### C. JWT Authentication Middleware
**Before:** No authentication on any endpoints

**After:** JWT-based authentication middleware
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authenticate = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

#### D. Login Endpoint
**Before:** No login endpoint, no password verification

**After:** Secure login with bcrypt password verification
```typescript
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  const { password: _, ...userWithoutPassword } = user;
  res.json({ token, user: userWithoutPassword });
});
```

#### E. Protected Endpoints
All API endpoints now require authentication:
- `/api/users` (GET, POST)
- `/api/workflows` (GET)
- `/api/workflows/:id` (GET)
- `/api/tickets` (GET, POST)
- `/api/tickets/:id` (GET)
- `/api/tickets/:id/approve` (POST)
- `/api/tickets/:id/reject` (POST)
- `/api/tickets/:id/watchers` (POST)

#### F. Password Hashing on User Creation
**Before:** Plain text passwords stored on user creation
```typescript
const user = await prisma.user.create({ data: { name, email, password, role } });
```

**After:** Passwords hashed before storage
```typescript
const hashedPassword = await bcrypt.hash(password, 10);
const user = await prisma.user.create({
  data: { name, email, password: hashedPassword, role },
  select: { id: true, name: true, email: true, role: true },
});
```

#### G. Sensitive Data Exclusion
**Before:** All user data including password returned in API responses

**After:** Passwords excluded from all API responses
```typescript
select: { id: true, name: true, email: true, role: true }
// Password field is never included in select
```

### 5. Frontend XSS Protection ([`project/components/TicketDetail.tsx`](project/components/TicketDetail.tsx))

**Before:** Raw HTML rendered without sanitization
```typescript
<div dangerouslySetInnerHTML={{ __html: ticket.description }} />
```

**After:** HTML sanitized using DOMPurify
```typescript
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ticket.description) }} />
```

### 6. Frontend Authentication ([`project/components/Login.tsx`](project/components/Login.tsx))

**Before:** Dummy password check on frontend
```typescript
if (selectedUser && selectedUser.password === password) {
  onLogin(selectedUser);
}
```

**After:** Real API authentication with JWT token handling
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const handleLogin = async (e: React.FormEvent) => {
  const response = await fetch(`${API_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: selectedUser.email, password }),
  });
  const data = await response.json();
  localStorage.setItem('authToken', data.token);
  localStorage.setItem('currentUser', JSON.stringify(data.user));
  onLogin(data.user, data.token);
};
```

### 7. Frontend API Helper ([`project/App.tsx`](project/App.tsx))

Added authenticated API call helper:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken');
  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
};
```

## Next Steps

### 1. Install Dependencies
Run the following commands to install the new dependencies:

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd project
npm install
```

### 2. Environment Variables
Add the following environment variables:

**Backend (.env):**
```
DATABASE_URL=postgres://nixflow:nixflow@db:5432/nixflow
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-secret-key-change-in-production
```

**Frontend (.env.local):**
```
VITE_API_URL=http://localhost:3000
```

### 3. Re-seed Database
After installing dependencies and running migrations:
```bash
cd backend
npm run seed
```

### 4. Test Authentication Flow
1. Start the backend server
2. Start the frontend development server
3. Try to login with any user (password: "password")
4. Verify that the JWT token is stored in localStorage
5. Verify that API calls include the Authorization header

## Security Improvements Summary

| Issue | Before | After |
|-------|---------|--------|
| **Password Storage** | Plain text | Bcrypt hashed (10 rounds) |
| **Authentication** | None | JWT tokens with 24h expiry |
| **CORS** | Open to all | Restricted to specific origin |
| **Rate Limiting** | None | 100 req/15min, 5 login/15min |
| **XSS Protection** | None | DOMPurify sanitization |
| **Password Exclusion** | Returned in API | Excluded from all responses |
| **Auth Middleware** | None | JWT verification on all endpoints |

## Additional Recommendations

1. **Use HTTPS in production** - Ensure all API calls use HTTPS
2. **Stronger JWT secret** - Use a cryptographically strong random string for JWT_SECRET
3. **Password complexity requirements** - Add validation for password strength
4. **Account lockout** - Implement temporary lockout after failed login attempts
5. **CSRF protection** - Add CSRF tokens for state-changing requests
6. **Security headers** - Add Helmet.js for security headers (CSP, X-Frame-Options, etc.)
7. **Input validation** - Add schema validation (e.g., Zod, Joi) for all API inputs
8. **Audit logging** - Log all authentication attempts and sensitive actions
9. **Session management** - Implement refresh token mechanism for better security
10. **Environment-specific configs** - Use different configurations for dev/staging/production

# NixFlow PowerTicketing: Open-Core Architectural Design

This document provides actionable engineering guidance for maintaining the open-core boundary.

## 1. File Headers & SPDX Identifiers

### Community Edition (Apache 2.0)
Place this at the top of every file in `backend/`, `project/`, and `worker/`.

```typescript
/**
 * NixFlow PowerTicketing System
 * Copyright (c) 2026 Nixsoft Technologies Private Limited
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * SPDX-License-Identifier: Apache-2.0
 */
```

### Enterprise Edition (Proprietary)
Place this at the top of every file in the `ee/` directory.

```typescript
/**
 * NixFlow PowerTicketing System - Enterprise Edition
 * Copyright (c) 2026 Nixsoft Technologies Private Limited
 *
 * This source code is proprietary and confidential.
 * Unauthorized copying or distribution is strictly prohibited.
 * SPDX-License-Identifier: LicenseRef-Proprietary-Nixsoft
 */
```

## 2. Feature Gating Mechanism

### Gating via License Key
We recommend a "Graceful Enhancement" pattern where the core app remains functional without EE modules.

```typescript
// backend/src/services/LicenseService.ts (Community)
export interface LicenseStatus {
  isEnterprise: boolean;
  features: string[];
}

export class CoreLicenseService {
  async getStatus(): Promise<LicenseStatus> {
    return { isEnterprise: false, features: [] };
  }
}

// ee/src/services/EnterpriseLicenseService.ts (Proprietary)
export class EnterpriseLicenseService extends CoreLicenseService {
  async getStatus(): Promise<LicenseStatus> {
    const key = process.env.EE_LICENSE_KEY;
    const isValid = await this.validateKey(key);
    return {
      isEnterprise: isValid,
      features: isValid ? ['sso', 'ai_insights', 'multitenancy'] : []
    };
  }
}
```

### Plugin Loading Strategy
Use a dynamic import in the main server initialization to load EE modules if they exist.

```typescript
// backend/src/index.ts
let licenseService = new CoreLicenseService();

try {
  // EE-specific dynamic import
  const { EnterpriseLicenseService } = await import('../../ee/src/services/EnterpriseLicenseService');
  licenseService = new EnterpriseLicenseService();
  console.log('NixFlow Enterprise Edition detected.');
} catch (e) {
  console.log('NixFlow Community Edition running.');
}
```

## 3. Contributor & Compliance

### Contributor License Agreement (CLA)
All contributors must sign the Nixsoft CLA before their code can be merged into the core. This ensures Nixsoft retains the right to dual-license the code.

### Dependency Hygiene
- **Allowed Licenses**: MIT, Apache 2.0, BSD-3-Clause.
- **Prohibited Licenses**: AGPL, GPL (unless isolated via microservices).
- **Automation**: Use `license-checker` in CI to prevent accidental "copyleft" contamination.

## 4. Future-Proofing for SaaS & Analytics

- **SaaS Isolation**: The `ee/` layer should handle organization-specific partitioning (multi-tenancy) via schema-based separation or `org_id` filtering.
- **AI Modules**: Advanced analytics should live in `ee/worker/`, consuming events via Redis but utilizing proprietary models not bundled in the core.

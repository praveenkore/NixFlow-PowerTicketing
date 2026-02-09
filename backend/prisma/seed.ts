/*
 * Seed script for the NixFlow backend.
 *
 * This script populates the database with some initial data:
 *  - A set of users with various roles.
 *  - Three default workflows corresponding to the New Hardware, Old Hardware, and Application/Production Change flows.
 *  - Each workflow is populated with ordered stages reflecting the approver roles.
 *
 * You can run this seed script with `npm run seed` once the database and Prisma client are ready.
 */
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create users with hashed passwords
  const usersData = [
    { name: 'Alice (Engineer)', email: 'alice@example.com', password: 'password', role: Role.Engineer },
    { name: 'Bob (Manager)', email: 'bob@example.com', password: 'password', role: Role.Manager },
    { name: 'Charlie (Director)', email: 'charlie@example.com', password: 'password', role: Role.Director },
    { name: 'Eve (Admin)', email: 'eve@example.com', password: 'password', role: Role.Admin },
    { name: 'Frank (CIO)', email: 'frank@example.com', password: 'password', role: Role.CIO },
    { name: 'Ian (Infra Head)', email: 'ian@example.com', password: 'password', role: Role.InfraHead },
    { name: 'Carol (CISO)', email: 'carol@example.com', password: 'password', role: Role.CISO },
    { name: 'Hank (Hardware Engineer)', email: 'hank@example.com', password: 'password', role: Role.HardwareEngineer },
    { name: 'Annie (CTO App Owner)', email: 'annie@example.com', password: 'password', role: Role.CTOAppOwner },
    { name: 'Simon (CTO Infra Head)', email: 'simon@example.com', password: 'password', role: Role.CTOInfraHead },
    { name: 'Tina (CTO)', email: 'tina@example.com', password: 'password', role: Role.CTO },
  ];
  for (const userData of usersData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: { ...userData, password: hashedPassword },
    });
  }

  // Create workflows with stages
  // Workflow 1: New Hardware Request
  const newHardware = await prisma.workflow.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'New Hardware Request',
      description: 'Engineer → Infra Head → CIO → CISO',
      stages: {
        create: [
          { name: 'Infra Head Approval', approverRole: Role.InfraHead, order: 1 },
          { name: 'CIO Approval', approverRole: Role.CIO, order: 2 },
          { name: 'CISO Approval', approverRole: Role.CISO, order: 3 },
        ],
      },
    },
    include: { stages: true },
  });

  // Workflow 2: Old Hardware Replacement
  const oldHardware = await prisma.workflow.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Old Hardware Replacement',
      description: 'Engineer → Infra Head → CIO (Notification only) → Hardware Engineer',
      stages: {
        create: [
          { name: 'Infra Head Approval', approverRole: Role.InfraHead, order: 1 },
          // no explicit CIO approval stage since it is notify-only
        ],
      },
    },
    include: { stages: true },
  });

  // Workflow 3: Application/Production Change
  const appProd = await prisma.workflow.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'Application/Production Change',
      description: 'Engineer → CTO App Owner → CTO Infra Head → CISO → CTO → CISO (Notification only)',
      stages: {
        create: [
          { name: 'CTO App Owner Approval', approverRole: Role.CTOAppOwner, order: 1 },
          { name: 'CTO Infra Head Approval', approverRole: Role.CTOInfraHead, order: 2 },
          { name: 'CISO Approval', approverRole: Role.CISO, order: 3 },
          { name: 'CTO Approval', approverRole: Role.CTO, order: 4 },
        ],
      },
    },
    include: { stages: true },
  });

  console.log('Seed completed. Workflows and users have been created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
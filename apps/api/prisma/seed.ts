import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password';
import { DEFAULT_ROLES } from '../src/auth/permissions';

const prisma = new PrismaClient();

/**
 * Ensures the default roles exist and creates the first admin account from
 * ADMIN_EMAIL / ADMIN_PASSWORD. Runs on every container start and never
 * overwrites existing roles or accounts.
 */
async function main() {
  // Default roles (never changes roles that already exist).
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { label: role.label },
      update: {},
      create: role,
    });
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('ADMIN_EMAIL / ADMIN_PASSWORD not set; skipping admin seed.');
    return;
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });
  if (existing) {
    console.log(`Admin ${email} already exists; leaving it unchanged.`);
    return;
  }

  await prisma.user.create({
    data: {
      first_name: process.env.ADMIN_NAME || 'Admin',
      email,
      password: await hashPassword(password),
      role: {
        connect: { label: 'Administrator' },
      },
    },
  });

  console.log(`Created admin ${email}.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

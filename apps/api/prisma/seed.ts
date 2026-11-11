import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password';

const prisma = new PrismaClient();

/**
 * Creates the first admin account from ADMIN_EMAIL / ADMIN_PASSWORD.
 * Runs on every container start; it never overwrites an existing account.
 */
async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('ADMIN_EMAIL / ADMIN_PASSWORD not set; skipping admin seed.');
    return;
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
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
        connectOrCreate: {
          where: { label: 'Administrator' },
          create: { label: 'Administrator', permissions: ['*'] },
        },
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

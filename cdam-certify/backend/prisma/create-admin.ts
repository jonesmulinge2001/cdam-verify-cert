import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const [email, password, fullName] = process.argv.slice(2);

  if (!email || !password || !fullName) {
    console.error(
      'Usage: npx ts-node prisma/create-admin.ts <email> <password> <fullName>',
    );
    process.exit(1);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.error(`User already exists: ${email}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log('Admin created successfully.');
  console.log(`Email: ${user.email}`);
  console.log(`Name: ${user.fullName}`);
  console.log(`Role: ${user.role}`);
}

main()
  .catch((error) => {
    console.error('Failed to create admin:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
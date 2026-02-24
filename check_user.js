const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const user = await prisma.user.findUnique({
    where: { email: 'testuser2@example.com' },
  });
  console.log('User:', user);
  await prisma.$disconnect();
})();

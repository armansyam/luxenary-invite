const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const themes = await prisma.theme.findMany();
  console.log(themes.map(t => t.id));
}
run().finally(() => prisma.$disconnect());

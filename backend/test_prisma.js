const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    await prisma.$connect();
    console.log("Prisma Connected");
  } catch (err) {
    console.error("Prisma Error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();

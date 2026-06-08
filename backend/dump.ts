import { prisma } from './src/prisma';

async function main() {
  const users = await prisma.user.findMany();
  console.log(users);
}
main();

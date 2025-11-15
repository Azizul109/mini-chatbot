import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { id: 'workspace-1' },
    update: {},
    create: {
      id: 'workspace-1',
      name: 'Demo Workspace',
    },
  });

  const bot = await prisma.bot.upsert({
    where: { id: 'bot-1' },
    update: {},
    create: {
      id: 'bot-1',
      workspaceId: 'workspace-1',
      name: 'Customer Support Bot',
      modelProvider: 'ollama',
      modelName: 'llama2.7b',
      temperature: 0.3,
    },
  });

  console.log({ workspace, bot });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

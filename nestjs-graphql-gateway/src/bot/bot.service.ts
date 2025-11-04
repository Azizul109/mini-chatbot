import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BotService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.bot.findUnique({
      where: { id },
      include: {
        documents: true,
        sessions: {
          include: {
            messages: true,
          },
        },
      },
    });
  }

  async create(input: any) {
    return this.prisma.bot.create({
      data: input,
    });
  }

  async updateDocumentStatus(botId: string, documents: any[], status: string) {
    console.log(`Updating document status for bot ${botId} to ${status}`);
    return Promise.resolve();
  }
}
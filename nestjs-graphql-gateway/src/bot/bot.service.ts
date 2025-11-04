// src/bot/bot.service.ts
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
    // Implementation for updating document status
    console.log(`Updating document status for bot ${botId} to ${status}`);
    // You can implement actual database updates here
    return Promise.resolve();
  }
}
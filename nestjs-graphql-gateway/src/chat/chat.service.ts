import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatSession, MessageConnection, Message } from '../graphql.types';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  private mapPrismaSessionToGraphQL(session: any): ChatSession {
    return {
      ...session,
      userId: session.userId || undefined,
      messages: session.messages?.map(this.mapPrismaMessageToGraphQL) || [],
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  private mapPrismaMessageToGraphQL(message: any): Message {
    return {
      ...message,
      tokensUsed: message.tokensUsed || undefined,
      createdAt: message.createdAt.toISOString(),
    };
  }

  async createSession(botId: string, userId?: string): Promise<ChatSession> {
    const session = await this.prisma.chatSession.create({
      data: {
        botId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    
    return this.mapPrismaSessionToGraphQL(session);
  }

  async getSession(id: string): Promise<ChatSession | null> {
    const session = await this.prisma.chatSession.findUnique({
      where: { id },
      include: { 
        messages: { 
          orderBy: { createdAt: 'asc' } 
        } 
      },
    });

    return session ? this.mapPrismaSessionToGraphQL(session) : null;
  }

  async getBot(id: string) {
    return this.prisma.bot.findUnique({
      where: { id },
    });
  }

  async createMessage(data: any) {
    return this.prisma.message.create({
      data,
    });
  }

  async getMessages(sessionId: string, limit?: number) {
    const messages = await this.prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return messages.map(this.mapPrismaMessageToGraphQL);
  }

  async getMessagesPaginated(
    sessionId: string, 
    limit = 20, 
    cursor?: string
  ): Promise<MessageConnection> {
    const messages = await this.prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
    });

    const hasNextPage = messages.length > limit;
    const edges = hasNextPage ? messages.slice(0, -1) : messages;

    return {
      edges: edges.reverse().map(this.mapPrismaMessageToGraphQL),
      nextCursor: hasNextPage ? messages[messages.length - 2]?.id || undefined : undefined,
    };
  }
}
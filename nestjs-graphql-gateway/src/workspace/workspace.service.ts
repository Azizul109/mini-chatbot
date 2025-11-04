// src/workspace/workspace.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkspaceService {
  constructor(private prisma: PrismaService) {}

  private mapPrismaWorkspaceToGraphQL(workspace: any) {
    return {
      ...workspace,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
      bots: workspace.bots?.map((bot: any) => ({
        ...bot,
        createdAt: bot.createdAt.toISOString(),
        updatedAt: bot.updatedAt.toISOString(),
        documents: bot.documents?.map((doc: any) => ({
          ...doc,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
        })) || [],
        sessions: bot.sessions?.map((session: any) => ({
          ...session,
          userId: session.userId || undefined,
          createdAt: session.createdAt.toISOString(),
          updatedAt: session.updatedAt.toISOString(),
          messages: session.messages?.map((message: any) => ({
            ...message,
            tokensUsed: message.tokensUsed || undefined,
            createdAt: message.createdAt.toISOString(),
          })) || [],
        })) || [],
      })) || [],
    };
  }

  async findById(id: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        bots: {
          include: {
            documents: true,
            sessions: {
              include: {
                messages: true,
              },
            },
          },
        },
      },
    });

    return workspace ? this.mapPrismaWorkspaceToGraphQL(workspace) : null;
  }
}
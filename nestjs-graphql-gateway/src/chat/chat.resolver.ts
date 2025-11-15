import { Resolver, Query, Mutation, Args, Subscription } from '@nestjs/graphql';
import { ChatService } from './chat.service';
import { RAGService } from '../rag/rag.service';
import { PubSub } from 'graphql-subscriptions';
import { UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  ChatSession,
  MessageConnection,
  ChatResult,
  ChatInput,
} from '../graphql.types';

const pubSub = new PubSub();

@Resolver(() => ChatSession)
export class ChatResolver {
  constructor(
    private chatService: ChatService,
    private ragService: RAGService,
  ) {}

  @Mutation(() => ChatSession, { name: 'createSession' })
  async createSession(
    @Args('botId') botId: string,
    @Args('userId', { nullable: true }) userId?: string,
  ) {
    return this.chatService.createSession(botId, userId);
  }

  @Query(() => ChatSession, { nullable: true, name: 'session' })
  async getSession(@Args('id') id: string) {
    return this.chatService.getSession(id);
  }

  @Query(() => MessageConnection, { name: 'messages' })
  async getMessages(
    @Args('sessionId') sessionId: string,
    @Args('limit', { nullable: true }) limit?: number,
    @Args('cursor', { nullable: true }) cursor?: string,
  ) {
    return this.chatService.getMessagesPaginated(sessionId, limit, cursor);
  }

  @Mutation(() => ChatResult, { name: 'chat' })
  async chat(@Args('input') input: ChatInput) {
    const { sessionId, message, topK = 5 } = input;

    const session = await this.chatService.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const bot = await this.chatService.getBot(session.botId);
    if (!bot) {
      throw new Error('Bot not found');
    }

    const messages = await this.chatService.getMessages(sessionId, 10);
    const conversationHistory = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    await this.chatService.createMessage({
      sessionId,
      role: 'user',
      content: message,
    });

    const result = await this.ragService.generateAnswer(
      bot.id,
      message,
      conversationHistory,
      bot.temperature || 0.3,
      topK,
    );

    await this.chatService.createMessage({
      sessionId,
      role: 'assistant',
      content: result.answer,
      tokensUsed: result.tokensUsed,
    });

    return result;
  }

  @Subscription(() => String, { name: 'chatStream' })
  chatStream(@Args('sessionId') sessionId: string) {
    return pubSub.asyncIterator(`chatStream.${sessionId}`);
  }

  @Query(() => String, { name: 'health' })
  health(): string {
    return 'OK';
  }

  @Query(() => String, { name: 'ollamaHealth' })
  async ollamaHealth(): Promise<string> {
    try {
      const llmProvider = (this.ragService as any).llmProvider;
      if (llmProvider && llmProvider.healthCheck) {
        const health = await llmProvider.healthCheck();
        return JSON.stringify(health, null, 2);
      }
      return 'Ollama provider not available or health check not supported';
    } catch (error: any) {
      return `Ollama health check failed: ${error.message}`;
    }
  }
}

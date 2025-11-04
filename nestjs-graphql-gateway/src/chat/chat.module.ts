import { Module } from '@nestjs/common';
import { ChatResolver } from './chat.resolver';
import { ChatService } from './chat.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RAGService } from '../rag/rag.service';
import { LLM_PROVIDERS } from '../llm/llm.provider';

@Module({
  imports: [PrismaModule],
  providers: [
    ChatResolver,
    ChatService,
    RAGService,
    {
      provide: 'LLM_PROVIDER',
      useClass: LLM_PROVIDERS[process.env.MODEL_PROVIDER || 'mock'],
    },
  ],
  exports: [ChatService],
})
export class ChatModule {}
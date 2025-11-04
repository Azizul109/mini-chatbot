// src/bot/bot.resolver.ts
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { BotService } from './bot.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { 
  Bot, 
  IngestResult, 
  CreateBotInput, 
  DocumentInput 
} from '../graphql.types';

@Resolver(() => Bot)
export class BotResolver {
  constructor(
    private botService: BotService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  @Query(() => Bot, { nullable: true, name: 'bot' })
  async getBot(@Args('id') id: string) {
    return this.botService.findById(id);
  }

  @Mutation(() => Bot, { name: 'createBot' })
  async createBot(@Args('input') input: CreateBotInput) {
    return this.botService.create(input);
  }

  @Mutation(() => IngestResult, { name: 'ingestDocuments' })
  async ingestDocuments(
    @Args('botId') botId: string,
    @Args('input', { type: () => [DocumentInput] }) input: DocumentInput[],
    @Args('chunkSize', { nullable: true }) chunkSize?: number,
    @Args('overlap', { nullable: true }) overlap?: number,
  ) {
    const ingestionUrl = 'http://localhost:8001/ingest';
    
    const payload = {
      botId,
      documents: input,
      chunkSize,
      overlap,
    };

    try {
      const response = await this.httpService.axiosRef.post(ingestionUrl, payload);
      
      // Update document status in database
      await this.botService.updateDocumentStatus(botId, input, 'completed');
      
      return response.data;
    } catch (error: any) {
      await this.botService.updateDocumentStatus(botId, input, 'failed');
      throw new Error(`Ingestion failed: ${error.message}`);
    }
  }
}
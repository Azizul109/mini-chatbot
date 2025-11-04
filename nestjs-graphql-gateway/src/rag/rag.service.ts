import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LLMProvider } from '../llm/llm.provider';

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);
  private chroma: any;

  constructor(
    private configService: ConfigService,
    @Inject('LLM_PROVIDER') private llmProvider: LLMProvider,
  ) {
    this.initializeChroma();
  }

  private async initializeChroma() {
    try {
      const { ChromaClient } = await import('chromadb');
      this.chroma = new ChromaClient({
        path: this.configService.get('CHROMA_URL') || 'http://localhost:8001',
      });
      this.logger.log('ChromaDB client initialized');
    } catch (error) {
      this.logger.error('Failed to initialize ChromaDB:', error);
    }
  }

  async retrieveRelevantChunks(botId: string, query: string, topK = 5) {
    try {
      if (!this.chroma) {
        this.logger.warn('ChromaDB client not initialized, waiting...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const collectionName = `bot_${botId}`;
      this.logger.log(`Querying collection: ${collectionName}`);

      const collection = await this.chroma.getCollection({
        name: collectionName,
      });

      this.logger.log(`Querying with: "${query}", topK: ${topK}`);

      const results = await collection.query({
        queryTexts: [query],
        nResults: topK,
      });

      this.logger.log(`Retrieved ${results.documents[0]?.length || 0} chunks`);

      if (!results.documents[0] || results.documents[0].length === 0) {
        this.logger.warn('No documents found in ChromaDB');
        return [];
      }

      return results.documents[0].map((doc: string, index: number) => ({
        content: doc,
        filename: results.metadatas[0][index]?.filename || 'unknown',
        documentId: results.metadatas[0][index]?.document_index || 0,
        score: results.distances ? results.distances[0][index] : 0.5,
      }));
    } catch (error) {
      this.logger.error('Chroma retrieval error:', error);
      return [];
    }
  }

  async generateAnswer(
    botId: string,
    query: string,
    conversationHistory: any[],
    temperature = 0.3,
    topK = 5,
  ) {
    this.logger.log(`Generating answer for bot: ${botId}, query: "${query}"`);

    const relevantChunks = await this.retrieveRelevantChunks(botId, query, topK);
    
    this.logger.log(`Found ${relevantChunks.length} relevant chunks`);

    const context = relevantChunks
      .map((chunk: any) => `From ${chunk.filename}: ${chunk.content}`)
      .join('\n\n');

    const systemPrompt = context 
      ? `You are a helpful customer support assistant. Use the following context to answer the user's question. Be specific and helpful.

Context:
${context}

Please provide a helpful answer based ONLY on the context above. If the context doesn't contain the answer, say "I don't have information about that in my knowledge base."`
      : `You are a helpful customer support assistant. The user is asking about shipping options, but I couldn't find relevant information in the knowledge base. Please provide a general helpful response.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: query },
    ];

    this.logger.log('Calling LLM provider...');
    const response = await this.llmProvider.generateCompletion(messages, temperature);
    
    const citations = relevantChunks.map((chunk: any) => ({
      documentId: `doc_${chunk.documentId}`,
      filename: chunk.filename,
      score: chunk.score,
    }));

    this.logger.log(`Generated answer with ${citations.length} citations`);

    return {
      answer: response.content,
      citations,
      tokensUsed: response.tokensUsed,
    };
  }
}
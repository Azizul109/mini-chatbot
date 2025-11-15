import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMResponse, LLMProvider } from './llm.provider';

@Injectable()
export class OllamaProvider implements LLMProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private ollamaBaseUrl: string;
  private availableModels: string[] = [];

  constructor(private configService: ConfigService) {
    this.ollamaBaseUrl = this.configService.get('OLLAMA_BASE_URL') || 'http://localhost:11434';
    this.logger.log('Ollama Provider initialized');
    this.initializeModels();
  }

  private async initializeModels(): Promise<void> {
    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        this.availableModels = data.models?.map((model: any) => model.name) || [];
        this.logger.log(`Available Ollama models: ${this.availableModels.join(', ')}`);
        
        if (this.availableModels.length === 0) {
          this.logger.warn('No Ollama models found. Please run: ollama pull llama2:7b');
        }
      }
    } catch (error) {
      this.logger.warn('Could not fetch available models from Ollama. Make sure Ollama is running.');
    }
  }

  async generateCompletion(messages: any[], temperature = 0.3): Promise<LLMResponse> {
    try {
      this.logger.log('Using Ollama for local LLM generation');

      const prompt = this.formatMessagesToPrompt(messages);
      
      const model = await this.getAvailableModel();
      this.logger.log(`Using model: ${model}`);
      
      const response = await this.callOllama(prompt, temperature, model);
      
      return {
        content: response,
        tokensUsed: Math.floor(response.length / 4),
      };
    } catch (error: any) {
      this.logger.error('Ollama error:', error.message);
      
      if (error.message.includes('not found')) {
        throw new Error(`Ollama model not found. Available models: ${this.availableModels.join(', ') || 'none'}. Please run: ollama pull llama2:7b`);
      }
      
      throw new Error(`Ollama failed: ${error.message}`);
    }
  }

  private async getAvailableModel(): Promise<string> {
    await this.initializeModels();

    if (this.availableModels.includes('llama2:7b')) {
      return 'llama2:7b';
    }

    const preferredModels = [
      'llama2:7b',
      'llama2',
      'mistral',
      'phi',
      'mistral:7b', 
      'phi:2.7b'
    ];

    for (const model of preferredModels) {
      if (this.availableModels.includes(model)) {
        return model;
      }
    }

    if (this.availableModels.length > 0) {
      return this.availableModels[0];
    }

    return 'llama2:7b';
  }

  private formatMessagesToPrompt(messages: any[]): string {
    let prompt = '';
    
    for (const message of messages) {
      switch (message.role) {
        case 'system':
          prompt += `[INST] System: ${message.content} [/INST]\n\n`;
          break;
        case 'user':
          prompt += `[INST] User: ${message.content} [/INST]\n\n`;
          break;
        case 'assistant':
          prompt += `Assistant: ${message.content}\n\n`;
          break;
      }
    }
    
    prompt += 'Assistant: ';
    return prompt;
  }

  private async callOllama(prompt: string, temperature: number, model: string): Promise<string> {
    this.logger.log(`Calling Ollama with model: ${model}`);
    
    const response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: Math.max(0.1, Math.min(1.0, temperature)),
          num_predict: 800,
          top_k: 40,
          top_p: 0.9,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    this.logger.log('Ollama response received successfully');
    return data.response;
  }

  async healthCheck(): Promise<{ healthy: boolean; models?: string[] }> {
    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        const models = data.models?.map((model: any) => model.name) || [];
        return { 
          healthy: true, 
          models: models 
        };
      }
      return { healthy: false };
    } catch {
      return { healthy: false };
    }
  }
}
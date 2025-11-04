// src/llm/llm.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LLMResponse {
  content: string;
  tokensUsed: number;
}

export interface LLMProvider {
  generateCompletion(messages: any[], temperature?: number): Promise<LLMResponse>;
}

@Injectable()
export class OpenAIProvider implements LLMProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private openai: any;

  constructor(private configService: ConfigService) {
    // Keep this for future use when OpenAI quota is resolved
  }

  async generateCompletion(messages: any[], temperature = 0.3): Promise<LLMResponse> {
    throw new Error('OpenAI provider is disabled due to quota limits. Use mock provider instead.');
  }
}

@Injectable()
export class MockLLMProvider implements LLMProvider {
  private readonly logger = new Logger(MockLLMProvider.name);

  private generateContextAwareResponse(userMessage: string, systemPrompt: string): string {
    const lowerMessage = userMessage.toLowerCase();
    
    // Extract context from system prompt to make responses more relevant
    const hasShippingInfo = systemPrompt.includes('shipping') || 
                           systemPrompt.includes('delivery') || 
                           systemPrompt.includes('ship');
    const hasReturnInfo = systemPrompt.includes('return') || 
                         systemPrompt.includes('refund') || 
                         systemPrompt.includes('exchange');
    const hasContactInfo = systemPrompt.includes('contact') || 
                          systemPrompt.includes('phone') || 
                          systemPrompt.includes('email') ||
                          systemPrompt.includes('support');

    // Shipping-related queries
    if (lowerMessage.includes('shipping') || lowerMessage.includes('delivery') || hasShippingInfo) {
      if (lowerMessage.includes('cost') || lowerMessage.includes('price') || lowerMessage.includes('how much')) {
        return "Based on our shipping policy: Standard shipping is free on orders over $50, otherwise it's $4.99. Express shipping costs $9.99, and overnight shipping is $19.99.";
      }
      if (lowerMessage.includes('time') || lowerMessage.includes('long') || lowerMessage.includes('when')) {
        return "Our delivery times are: Standard shipping takes 3-5 business days, Express shipping takes 1-2 business days, and Overnight shipping arrives the next business day.";
      }
      if (lowerMessage.includes('free')) {
        return "Yes, we offer free standard shipping on all orders over $50. The free shipping is applied automatically at checkout.";
      }
      return "We offer several shipping options: Standard (3-5 days), Express (1-2 days), and Overnight (next day). Free shipping is available on orders over $50.";
    }

    // Return-related queries
    if (lowerMessage.includes('return') || lowerMessage.includes('refund') || hasReturnInfo) {
      if (lowerMessage.includes('how long') || lowerMessage.includes('time') || lowerMessage.includes('when')) {
        return "You can return items within 30 days of purchase. Refunds are typically processed within 5-7 business days after we receive your return.";
      }
      if (lowerMessage.includes('condition') || lowerMessage.includes('how to')) {
        return "To return an item, it must be in its original condition with all tags attached and in the original packaging. Please include your order number with the return.";
      }
      if (lowerMessage.includes('cost') || lowerMessage.includes('free return')) {
        return "Return shipping is free for defective or incorrect items. For other returns, you're responsible for return shipping costs unless you purchased return shipping protection.";
      }
      return "Our return policy allows returns within 30 days of purchase. Items must be in original condition with tags attached. Refunds are processed within 5-7 business days.";
    }

    // Contact-related queries
    if (lowerMessage.includes('contact') || lowerMessage.includes('phone') || lowerMessage.includes('email') || lowerMessage.includes('call') || hasContactInfo) {
      if (lowerMessage.includes('phone') || lowerMessage.includes('call') || lowerMessage.includes('number')) {
        return "You can reach our customer service team at 1-800-123-4567. Our phone lines are open Monday through Friday from 9 AM to 6 PM EST.";
      }
      if (lowerMessage.includes('email')) {
        return "You can email us at support@company.com. We typically respond to emails within 24 hours during business days.";
      }
      if (lowerMessage.includes('hour') || lowerMessage.includes('time') || lowerMessage.includes('when')) {
        return "Our customer service hours are Monday to Friday, 9:00 AM to 6:00 PM EST. We're closed on weekends and major holidays.";
      }
      return "You can contact us by phone at 1-800-123-4567, by email at support@company.com, or through live chat on our website during business hours.";
    }

    // Product and general queries
    if (lowerMessage.includes('product') || lowerMessage.includes('item')) {
      return "I'd be happy to help you with product information. Could you please specify which product you're asking about? Our knowledgeable staff can provide detailed specifications and availability.";
    }

    if (lowerMessage.includes('order') || lowerMessage.includes('track')) {
      return "To check your order status or track a package, please have your order number ready and visit the 'Order Status' page on our website, or contact our customer service team.";
    }

    if (lowerMessage.includes('payment') || lowerMessage.includes('pay')) {
      return "We accept all major credit cards (Visa, MasterCard, American Express, Discover), PayPal, and Apple Pay for your convenience.";
    }

    // Default response that acknowledges the mock nature but tries to be helpful
    return `I understand you're asking about "${userMessage}". In a production environment with OpenAI GPT-4, I would provide a comprehensive answer based on our company knowledge base. For now, I recommend checking our website's help section or contacting customer service for detailed information about this topic.`;
  }

  async generateCompletion(messages: any[], temperature = 0.3): Promise<LLMResponse> {
    this.logger.log('Using enhanced mock LLM provider');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const userMessage = messages[messages.length - 1]?.content || '';
    const systemPrompt = messages[0]?.content || '';
    
    const content = this.generateContextAwareResponse(userMessage, systemPrompt);
    
    this.logger.log(`Generated mock response for: "${userMessage.substring(0, 50)}..."`);

    return {
      content,
      tokensUsed: Math.floor(content.length / 4) + 50,
    };
  }
}

export const LLM_PROVIDERS = {
  openai: OpenAIProvider,
  llama: MockLLMProvider,
  mock: MockLLMProvider,
};
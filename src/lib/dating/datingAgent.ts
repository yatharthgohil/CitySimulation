import type { UserProfile } from '@/lib/userDatabase';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

type StreamTokenHandler = (token: string) => void;

export class DatingAgent {
  private userId: string;
  private userName: string;
  private systemPrompt: string;
  private conversationHistory: Message[] = [];
  private apiKey: string;
  private model: string;

  constructor(user: UserProfile, systemPrompt: string, apiKey?: string, model?: string) {
    this.userId = user.id;
    this.userName = user.name;
    this.systemPrompt = systemPrompt;
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
    this.model = model || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
    this.conversationHistory.push({ role: 'system', content: systemPrompt });
  }

  async respondToMessage(incomingMessage: string, onToken?: StreamTokenHandler): Promise<string> {
    this.conversationHistory.push({ role: 'user', content: incomingMessage });

    const response = await this.streamOpenRouterChat(onToken);
    const cleanedResponse = this.cleanResponse(response);

    this.conversationHistory.push({ role: 'assistant', content: cleanedResponse });
    return cleanedResponse;
  }

  async initiateConversation(onToken?: StreamTokenHandler): Promise<string> {
    const initMessage: Message = {
      role: 'user',
      content: `Start the date with a friendly greeting and introduction. IMPORTANT: Only write what ${this.userName} says. Do NOT write your name before speaking. Do NOT write stage directions or actions.`
    };
    this.conversationHistory.push(initMessage);

    const response = await this.streamOpenRouterChat(onToken);
    const cleanedResponse = this.cleanResponse(response);
    this.conversationHistory.push({ role: 'assistant', content: cleanedResponse });
    return cleanedResponse;
  }

  private async streamOpenRouterChat(onToken?: StreamTokenHandler): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is not configured. Set OPENROUTER_API_KEY environment variable.');
    }

    const messages = this.conversationHistory.map(msg => ({
      role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'http://localhost:3000',
            'X-Title': process.env.OPENROUTER_APP_NAME || 'Isometric City Dating'
          },
          body: JSON.stringify({
            model: this.model,
            messages,
            stream: true,
            temperature: 0.7,
            max_tokens: 150
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          const isRetryable = response.status >= 500 || response.status === 429;
          
          if (!isRetryable || attempt === maxRetries - 1) {
            throw new Error(`OpenRouter request failed: ${response.statusText} - ${errorText}`);
          }
          
          lastError = new Error(`OpenRouter request failed: ${response.statusText} - ${errorText}`);
          await this.sleep(Math.pow(2, attempt) * 1000);
          continue;
        }

        return await this.processStreamResponse(response, onToken);
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        const isRetryable = error?.code === 'UND_ERR_HEADERS_TIMEOUT' || 
                           error?.name === 'TimeoutError' ||
                           error?.name === 'AbortError' ||
                           error?.message?.includes('fetch failed') ||
                           error?.message?.includes('timeout');
        
        if (!isRetryable || attempt === maxRetries - 1) {
          throw error;
        }
        
        lastError = error;
        await this.sleep(Math.pow(2, attempt) * 1000);
      }
    }

    throw lastError || new Error('OpenRouter request failed after retries');
  }

  private async processStreamResponse(response: Response, onToken?: StreamTokenHandler): Promise<string> {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    if (!reader) throw new Error('No response body');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() && line.startsWith('data: '));

      for (const line of lines) {
        if (line === 'data: [DONE]') continue;
        
        try {
          const jsonStr = line.replace('data: ', '');
          const json: OpenRouterChunk = JSON.parse(jsonStr);
          
          const content = json.choices?.[0]?.delta?.content;
          if (content) {
            fullResponse += content;
            onToken?.(content);
          }
        } catch (e) {
          continue;
        }
      }
    }

    return fullResponse.trim();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private cleanResponse(response: string): string {
    let cleaned = response.trim();
    
    cleaned = cleaned.replace(new RegExp(`^${this.userName}:\\s*`, 'i'), '');
    cleaned = cleaned.replace(new RegExp(`^${this.userName}\\s+`, 'i'), '');
    
    cleaned = cleaned.replace(/\*[^*]*\*/g, '');
    cleaned = cleaned.replace(/\([^)]*\)/g, '');
    
    cleaned = cleaned.replace(/^(Date|System|You):\s*/gi, '');
    
    cleaned = cleaned.replace(/\n\s*\n/g, ' ');
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    return cleaned.trim();
  }

  getConversationHistory(): Message[] {
    return [...this.conversationHistory];
  }

  getUserId(): string {
    return this.userId;
  }
}


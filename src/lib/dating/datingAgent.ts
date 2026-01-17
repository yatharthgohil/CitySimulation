import type { UserProfile } from '@/lib/userDatabase';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatChunk {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

type StreamTokenHandler = (token: string) => void;

export class DatingAgent {
  private userId: string;
  private userName: string;
  private systemPrompt: string;
  private conversationHistory: Message[] = [];
  private ollamaUrl: string;
  private model = 'adi0adi/ollama_stheno-8b_v3.1_q6k';

  constructor(user: UserProfile, systemPrompt: string, ollamaUrl?: string) {
    this.userId = user.id;
    this.userName = user.name;
    this.systemPrompt = systemPrompt;
    this.ollamaUrl = ollamaUrl || 'http://localhost:11434/api/chat';
    this.conversationHistory.push({ role: 'system', content: systemPrompt });
  }

  async respondToMessage(incomingMessage: string, onToken?: StreamTokenHandler): Promise<string> {
    this.conversationHistory.push({ role: 'user', content: incomingMessage });

    const response = await this.streamOllamaChat(onToken);
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

    const response = await this.streamOllamaChat(onToken);
    const cleanedResponse = this.cleanResponse(response);
    this.conversationHistory.push({ role: 'assistant', content: cleanedResponse });
    return cleanedResponse;
  }

  private async streamOllamaChat(onToken?: StreamTokenHandler): Promise<string> {
    const messages = this.conversationHistory.map(msg => ({
      role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    const response = await fetch(this.ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
        options: {
          temperature: 0.7,
          num_predict: 80,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    if (!reader) throw new Error('No response body');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const json: OllamaChatChunk = JSON.parse(line);
          if (json.message?.content) {
            fullResponse += json.message.content;
            onToken?.(json.message.content);
          }
        } catch (e) {
          continue;
        }
      }
    }

    return fullResponse.trim();
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


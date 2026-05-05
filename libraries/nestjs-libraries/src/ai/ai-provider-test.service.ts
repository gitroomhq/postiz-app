import { Injectable } from '@nestjs/common';

export interface AiProviderTestResult {
  ok: boolean;
  error?: string;
}

const OPENROUTER_KEY_URL = 'https://openrouter.ai/api/v1/key';
const OPENAI_MODELS_URL = 'https://api.openai.com/v1/models';
const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';

@Injectable()
export class AiProviderTestService {
  async test(provider: string, apiKey: string): Promise<AiProviderTestResult> {
    if (!apiKey) {
      return { ok: false, error: 'API key vazia.' };
    }

    try {
      switch (provider) {
        case 'openrouter':
          return await this.testOpenRouter(apiKey);
        case 'openai':
          return await this.testOpenAi(apiKey);
        case 'tavily':
          return await this.testTavily(apiKey);
        case 'kieai':
          // KieAI nao expoe endpoint de validacao publico — aceitamos a chave
          // como valida na hora do save, falhas reais aparecem na primeira
          // geracao real.
          return { ok: true };
        default:
          return {
            ok: false,
            error: `Provider desconhecido: ${provider}`,
          };
      }
    } catch (e: any) {
      return {
        ok: false,
        error: e?.message || 'Erro inesperado ao testar provider.',
      };
    }
  }

  private async testOpenRouter(apiKey: string): Promise<AiProviderTestResult> {
    const res = await fetch(OPENROUTER_KEY_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `OpenRouter retornou ${res.status}.`,
      };
    }
    return { ok: true };
  }

  private async testOpenAi(apiKey: string): Promise<AiProviderTestResult> {
    const res = await fetch(OPENAI_MODELS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `OpenAI retornou ${res.status}.`,
      };
    }
    return { ok: true };
  }

  private async testTavily(apiKey: string): Promise<AiProviderTestResult> {
    // Tavily nao tem endpoint dedicado de validacao; usamos uma busca trivial.
    const res = await fetch(TAVILY_SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: 'ping',
        max_results: 1,
      }),
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `Tavily retornou ${res.status}.`,
      };
    }
    return { ok: true };
  }
}

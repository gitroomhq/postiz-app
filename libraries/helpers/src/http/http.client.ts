import { ErrorHandler } from '../error/error.handler';

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  retryOn?: number[];
  validateResponse?: (response: Response) => boolean;
  context?: string;
}

export class HttpClient {
  private static readonly DEFAULT_TIMEOUT = 30000;
  private static readonly DEFAULT_RETRIES = 3;
  private static readonly DEFAULT_RETRY_DELAY = 1000;
  private static readonly DEFAULT_RETRY_ON = [408, 429, 500, 502, 503, 504];

  static async fetch(url: string, options: FetchOptions = {}): Promise<Response> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      retries = this.DEFAULT_RETRIES,
      retryDelay = this.DEFAULT_RETRY_DELAY,
      retryOn = this.DEFAULT_RETRY_ON,
      validateResponse = (response) => response.ok,
      context = 'HttpClient',
      ...fetchOptions
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (validateResponse(response)) {
          return response;
        }

        // If response is not valid but not in retry list, throw immediately
        if (!retryOn.includes(response.status)) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on certain errors
        if (this.isNonRetryableError(lastError)) {
          throw lastError;
        }
      }

      // If this isn't the last attempt, wait before retrying
      if (attempt < retries) {
        await this.sleep(retryDelay * Math.pow(2, attempt)); // Exponential backoff
      }
    }

    // All retries exhausted
    ErrorHandler.logError(lastError, {
      url,
      method: fetchOptions.method || 'GET',
      metadata: { attempts: retries + 1, context },
    });

    throw lastError || new Error('Unknown error occurred during fetch');
  }

  static async fetchJson<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
    const response = await this.fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  static async post<T = any>(url: string, data: any, options: FetchOptions = {}): Promise<T> {
    return this.fetchJson<T>(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async put<T = any>(url: string, data: any, options: FetchOptions = {}): Promise<T> {
    return this.fetchJson<T>(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async delete<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
    return this.fetchJson<T>(url, {
      ...options,
      method: 'DELETE',
    });
  }

  private static isNonRetryableError(error: Error): boolean {
    const nonRetryablePatterns = [
      /aborted/i,
      /invalid url/i,
      /network error/i,
      /dns/i,
    ];

    return nonRetryablePatterns.some(pattern => pattern.test(error.message));
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

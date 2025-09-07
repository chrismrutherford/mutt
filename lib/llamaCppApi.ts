export interface LlamaCppResponse {
  content: string;
  stop: boolean;
}

export class LlamaCppApi {
  private baseUrl: string;

  constructor(baseUrl: string = "http://192.168.1.240:8080") {
    this.baseUrl = baseUrl;
  }

  async *streamCompletion(prompt: string, options: any = {}): AsyncGenerator<string, void, unknown> {
    const defaultOptions = {
      n_predict: 4096,
      stream: true,
      stop: ["<|im_end|>", "</s>", "<|end|>", "<|eot_id|>"]
    };

    const requestOptions = { ...defaultOptions, ...options };
    
    try {
      const response = await fetch(`${this.baseUrl}/completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer potato'
        },
        body: JSON.stringify({
          prompt,
          ...requestOptions
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.substring(6).trim();
                if (jsonStr) {
                  const data = JSON.parse(jsonStr);
                  if (data.content) {
                    yield data.content;
                  }
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Error in streamCompletion:', error);
      throw error;
    }
  }
}

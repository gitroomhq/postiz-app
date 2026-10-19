import { Injectable } from '@nestjs/common';
import { ClippingTranscript } from '@gitroom/nestjs-libraries/upload/clipping.processor.interface';

@Injectable()
export class DeepgramService {
  // Deepgram fetches the file itself, so media bytes never pass through here.
  // The answer comes back on the same request: an hour of audio takes about a
  // minute, and Deepgram gives up on its side after ten
  async transcribeUrl(url: string): Promise<ClippingTranscript> {
    const response = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&utterances=true&detect_language=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(10 * 60 * 1000),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Deepgram ${response.status}: ${(await response.text()).slice(0, 500)}`
      );
    }

    const { results } = await response.json();
    const channel = results?.channels?.[0];

    return {
      version: 1,
      language: channel?.detected_language || 'en',
      origin: 'transcribed',
      word_level: true,
      segments: (results?.utterances || []).map((p: any) => ({
        start: p.start,
        end: p.end,
        text: p.transcript,
      })),
      words: (channel?.alternatives?.[0]?.words || []).map((p: any) => ({
        text: p.punctuated_word || p.word,
        start: p.start,
        end: p.end,
      })),
    };
  }
}

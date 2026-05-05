import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
});

const VoicePrompt = z.object({
  voice: z.string(),
});

/**
 * Camada legada do OpenAI.
 *
 * A maioria dos metodos foi migrada para `AiTextService` e `AiImageService`
 * (Fase 1 — Blocos B e C), que respeitam a configuracao por workspace.
 *
 * Os metodos abaixo sao mantidos APENAS para features dormentes
 * (HeyGen e ImageSlides) que ainda nao tem upstream alternativo. Quando
 * essas features forem revisadas (Bloco F), este arquivo deve ser
 * removido completamente.
 */
@Injectable()
export class OpenaiService {
  /** Usado por HeygenProvider para gerar texto narrado em estilo conversacional. */
  async generateVoiceFromText(prompt: string) {
    return (
      (
        await openai.chat.completions.parse({
          model: 'gpt-4.1',
          messages: [
            {
              role: 'system',
              content: `You are an assistant that takes a social media post and convert it to a normal human voice, to be later added to a character, when a person talk they don\'t use "-", and sometimes they add pause with "..." to make it sounds more natural, make sure you use a lot of pauses and make it sound like a real person`,
            },
            {
              role: 'user',
              content: `prompt: ${prompt}`,
            },
          ],
          response_format: zodResponseFormat(VoicePrompt, 'voice'),
        })
      ).choices[0].message.parsed?.voice || ''
    );
  }

  /** Usado por ImagesSlides para quebrar um tema em slides com voiceText/imagePrompt. */
  async generateSlidesFromText(text: string) {
    for (let i = 0; i < 3; i++) {
      try {
        const message = `You are an assistant that takes a text and break it into slides, each slide should have an image prompt and voice text to be later used to generate a video and voice, image prompt should capture the essence of the slide and also have a back dark gradient on top, image prompt should not contain text in the picture, generate between 3-5 slides maximum`;
        const parse =
          (
            await openai.chat.completions.parse({
              model: 'gpt-4.1',
              messages: [
                {
                  role: 'system',
                  content: message,
                },
                {
                  role: 'user',
                  content: text,
                },
              ],
              response_format: zodResponseFormat(
                z.object({
                  slides: z
                    .array(
                      z.object({
                        imagePrompt: z.string(),
                        voiceText: z.string(),
                      })
                    )
                    .describe('an array of slides'),
                }),
                'slides'
              ),
            })
          ).choices[0].message.parsed?.slides || [];

        return parse;
      } catch (err) {
        console.log(err);
      }
    }

    return [];
  }
}

import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { shuffle } from 'lodash';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

@Injectable()
export class OpenaiService {
  async extractWebsiteText(content: string) {
    const websiteContent = await openai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content:
            'Your take a full website text, and extract only the article content',
        },
        {
          role: 'user',
          content,
        },
      ],
      model: 'gpt-4o',
    });

    const { content: articleContent } = websiteContent.choices[0].message;

    const posts = (
      await Promise.all([
        openai.chat.completions.create({
          messages: [
            {
              role: 'assistant',
              content:
                'Generate a Twitter post from the content without emojis in the following JSON format: { "post": string } put it in an array with one element',
            },
            {
              role: 'user',
              content: articleContent!,
            },
          ],
          n: 5,
          temperature: 0.7,
          model: 'gpt-4o',
        }),
        openai.chat.completions.create({
          messages: [
            {
              role: 'assistant',
              content:
                'Generate a thread for social media in the following JSON format: Array<{ "post": string }> without emojis',
            },
            {
              role: 'user',
              content: articleContent!,
            },
          ],
          n: 5,
          temperature: 0.7,
          model: 'gpt-4o',
        }),
      ])
    ).flatMap((p) => p.choices);

    return shuffle(
      posts.map((choice) => {
        const { content } = choice.message;
        const start = content?.indexOf('[')!;
        const end = content?.lastIndexOf(']')!;
        try {
          return JSON.parse('[' + content?.slice(start + 1, end) + ']');
        } catch (e) {
          console.log(content);
          return [];
        }
      })
    );
  }
}

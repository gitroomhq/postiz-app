import { Injectable } from '@nestjs/common';
import { shuffle } from 'lodash';
import { z } from 'zod';
import { generateObject, generateText } from 'ai';
import { ImageFactory } from '@gitroom/nestjs-libraries/ai/image/image.factory';
import { createAISdkModelSync } from '@gitroom/nestjs-libraries/ai/ai-sdk/ai-sdk.factory';

const PicturePrompt = z.object({
  prompt: z.string(),
});

const VoicePrompt = z.object({
  voice: z.string(),
});

@Injectable()
export class AIService {
  private getModel() {
    return createAISdkModelSync();
  }

  async generateImage(prompt: string, isUrl: boolean, isVertical = false) {
    return ImageFactory.generateImage({
      prompt,
      isVertical,
      responseFormat: isUrl ? 'url' : 'b64_json',
    });
  }

  async generatePromptForPicture(prompt: string) {
    const result = await generateObject({
      model: this.getModel(),
      schema: PicturePrompt,
      system: `You are an assistant that take a description and style and generate a prompt that will be used later to generate images, make it a very long and descriptive explanation, and write a lot of things for the renderer like, if it's realistic describe the camera`,
      prompt: `prompt: ${prompt}`,
    });

    return result.object.prompt || '';
  }

  async generateVoiceFromText(prompt: string) {
    const result = await generateObject({
      model: this.getModel(),
      schema: VoicePrompt,
      system: `You are an assistant that takes a social media post and convert it to a normal human voice, to be later added to a character, when a person talk they don't use "-", and sometimes they add pause with "..." to make it sounds more natural, make sure you use a lot of pauses and make it sound like a real person`,
      prompt: `prompt: ${prompt}`,
    });

    return result.object.voice || '';
  }

  async generatePosts(content: string) {
    const PostSchema = z.object({
      posts: z.array(z.object({ post: z.string() })),
    });

    const [singlePostResult, threadResult] = await Promise.all([
      Promise.all(
        Array(5)
          .fill(null)
          .map(() =>
            generateObject({
              model: this.getModel(),
              schema: PostSchema,
              system:
                'Generate a Twitter post from the content without emojis. Return as an array with one element.',
              prompt: content,
              temperature: 1,
            })
          )
      ),
      Promise.all(
        Array(5)
          .fill(null)
          .map(() =>
            generateObject({
              model: this.getModel(),
              schema: PostSchema,
              system:
                'Generate a thread for social media without emojis. Return as an array of posts.',
              prompt: content,
              temperature: 1,
            })
          )
      ),
    ]);

    const allResults = [...singlePostResult, ...threadResult];
    return shuffle(allResults.map((r) => r.object.posts));
  }

  async extractWebsiteText(content: string) {
    const result = await generateText({
      model: this.getModel(),
      system: 'You take a full website text, and extract only the article content',
      prompt: content,
    });

    return this.generatePosts(result.text);
  }

  async separatePosts(content: string, len: number) {
    const SeparatePostsPrompt = z.object({
      posts: z.array(z.string()),
    });

    const SeparatePostPrompt = z.object({
      post: z.string().max(len),
    });

    const result = await generateObject({
      model: this.getModel(),
      schema: SeparatePostsPrompt,
      system: `You are an assistant that take a social media post and break it to a thread, each post must be minimum ${
        len - 10
      } and maximum ${len} characters, keeping the exact wording and break lines, however make sure you split posts based on context`,
      prompt: content,
    });

    const posts = result.object.posts || [];

    return {
      posts: await Promise.all(
        posts.map(async (post: string) => {
          if (post.length <= len) {
            return post;
          }

          let retries = 4;
          while (retries) {
            try {
              const shrinkResult = await generateObject({
                model: this.getModel(),
                schema: SeparatePostPrompt,
                system: `You are an assistant that take a social media post and shrink it to be maximum ${len} characters, keeping the exact wording and break lines`,
                prompt: post,
              });
              return shrinkResult.object.post || '';
            } catch (e) {
              retries--;
            }
          }

          return post;
        })
      ),
    };
  }

  async generateSlidesFromText(text: string) {
    const SlidesSchema = z.object({
      slides: z
        .array(
          z.object({
            imagePrompt: z.string(),
            voiceText: z.string(),
          })
        )
        .describe('an array of slides'),
    });

    for (let i = 0; i < 3; i++) {
      try {
        const result = await generateObject({
          model: this.getModel(),
          schema: SlidesSchema,
          system: `You are an assistant that takes a text and break it into slides, each slide should have an image prompt and voice text to be later used to generate a video and voice, image prompt should capture the essence of the slide and also have a back dark gradient on top, image prompt should not contain text in the picture, generate between 3-5 slides maximum`,
          prompt: text,
        });

        return result.object.slides || [];
      } catch (err) {
        console.log(err);
      }
    }

    return [];
  }
}

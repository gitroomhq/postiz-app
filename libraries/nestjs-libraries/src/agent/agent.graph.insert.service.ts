import { Injectable } from '@nestjs/common';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { END, START, StateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { agentCategories } from '@gitroom/nestjs-libraries/agent/agent.categories';
import { z } from 'zod';
import { agentTopics } from '@gitroom/nestjs-libraries/agent/agent.topics';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
  model: 'gpt-4o-2024-08-06',
  temperature: 0,
});

interface WorkflowChannelsState {
  messages: BaseMessage[];
  topic?: string;
  category: string;
  hook?: string;
  content?: string;
}

const category = z.object({
  category: z.string().describe('The category for the post'),
});

const topic = z.object({
  topic: z.string().describe('The topic of the post'),
});

const hook = z.object({
  hook: z.string().describe('The hook of the post'),
});

@Injectable()
export class AgentGraphInsertService {
  constructor(private _postsService: PostsService) {}
  static state = () =>
    new StateGraph<WorkflowChannelsState>({
      channels: {
        messages: {
          reducer: (currentState, updateValue) =>
            currentState.concat(updateValue),
          default: () => [],
        },
        topic: null,
        category: null,
        hook: null,
        content: null,
      },
    });

  async findCategory(state: WorkflowChannelsState) {
    const { messages } = state;
    const structuredOutput = model.withStructuredOutput(category);
    return ChatPromptTemplate.fromTemplate(
      `
You are an assistant that get a social media post and categorize it into to one from the following categories:
{categories}
Here is the post:
{post}
    `
    )
      .pipe(structuredOutput)
      .invoke({
        post: messages[0].content,
        categories: agentCategories.join(', '),
      });
  }

  findTopic(state: WorkflowChannelsState) {
    const { messages } = state;
    const structuredOutput = model.withStructuredOutput(topic);
    return ChatPromptTemplate.fromTemplate(
      `
You are an assistant that get a social media post and categorize it into one of the following topics:
{topics}
Here is the post:
{post}
    `
    )
      .pipe(structuredOutput)
      .invoke({
        post: messages[0].content,
        topics: agentTopics.join(', '),
      });
  }

  findHook(state: WorkflowChannelsState) {
    const { messages } = state;
    const structuredOutput = model.withStructuredOutput(hook);
    return ChatPromptTemplate.fromTemplate(
      `
You are an assistant that get a social media post and extract the hook, the hook is usually the first or second of both sentence of the post, but can be in a different place, make sure you don't change the wording of the post use the exact text:
{post}
    `
    )
      .pipe(structuredOutput)
      .invoke({
        post: messages[0].content,
      });
  }

  async savePost(state: WorkflowChannelsState) {
    await this._postsService.createPopularPosts({
      category: state.category,
      topic: state.topic!,
      hook: state.hook!,
      content: state.messages[0].content! as string,
    });

    return {};
  }

  newPost(post: string) {
    const state = AgentGraphInsertService.state();
    const workflow = state
      .addNode('find-category', this.findCategory)
      .addNode('find-topic', this.findTopic)
      .addNode('find-hook', this.findHook)
      .addNode('save-post', this.savePost.bind(this))
      .addEdge(START, 'find-category')
      .addEdge('find-category', 'find-topic')
      .addEdge('find-topic', 'find-hook')
      .addEdge('find-hook', 'save-post')
      .addEdge('save-post', END);

    const app = workflow.compile();
    return app.invoke({
      messages: [new HumanMessage(post)],
    });
  }
}

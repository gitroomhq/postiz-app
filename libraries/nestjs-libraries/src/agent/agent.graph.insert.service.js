var AgentGraphInsertService_1;
import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { HumanMessage } from '@langchain/core/messages';
import { END, START, StateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { agentCategories } from "./agent.categories";
import { z } from 'zod';
import { agentTopics } from "./agent.topics";
import { PostsService } from "../database/prisma/posts/posts.service";
const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
    model: 'gpt-4o-2024-08-06',
    temperature: 0,
});
const category = z.object({
    category: z.string().describe('The category for the post'),
});
const topic = z.object({
    topic: z.string().describe('The topic of the post'),
});
const hook = z.object({
    hook: z.string().describe('The hook of the post'),
});
let AgentGraphInsertService = AgentGraphInsertService_1 = class AgentGraphInsertService {
    constructor(_postsService) {
        this._postsService = _postsService;
    }
    findCategory(state) {
        return __awaiter(this, void 0, void 0, function* () {
            const { messages } = state;
            const structuredOutput = model.withStructuredOutput(category);
            return ChatPromptTemplate.fromTemplate(`
You are an assistant that get a social media post and categorize it into to one from the following categories:
{categories}
Here is the post:
{post}
    `)
                .pipe(structuredOutput)
                .invoke({
                post: messages[0].content,
                categories: agentCategories.join(', '),
            });
        });
    }
    findTopic(state) {
        const { messages } = state;
        const structuredOutput = model.withStructuredOutput(topic);
        return ChatPromptTemplate.fromTemplate(`
You are an assistant that get a social media post and categorize it into one of the following topics:
{topics}
Here is the post:
{post}
    `)
            .pipe(structuredOutput)
            .invoke({
            post: messages[0].content,
            topics: agentTopics.join(', '),
        });
    }
    findHook(state) {
        const { messages } = state;
        const structuredOutput = model.withStructuredOutput(hook);
        return ChatPromptTemplate.fromTemplate(`
You are an assistant that get a social media post and extract the hook, the hook is usually the first or second of both sentence of the post, but can be in a different place, make sure you don't change the wording of the post use the exact text:
{post}
    `)
            .pipe(structuredOutput)
            .invoke({
            post: messages[0].content,
        });
    }
    savePost(state) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._postsService.createPopularPosts({
                category: state.category,
                topic: state.topic,
                hook: state.hook,
                content: state.messages[0].content,
            });
            return {};
        });
    }
    newPost(post) {
        const state = AgentGraphInsertService_1.state();
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
};
AgentGraphInsertService.state = () => new StateGraph({
    channels: {
        messages: {
            reducer: (currentState, updateValue) => currentState.concat(updateValue),
            default: () => [],
        },
        topic: null,
        category: null,
        hook: null,
        content: null,
    },
});
AgentGraphInsertService = AgentGraphInsertService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PostsService])
], AgentGraphInsertService);
export { AgentGraphInsertService };
//# sourceMappingURL=agent.graph.insert.service.js.map
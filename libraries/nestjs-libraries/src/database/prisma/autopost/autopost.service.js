var AutopostService_1;
import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { AutopostRepository } from "./autopost.repository";
import dayjs from 'dayjs';
import { END, START, StateGraph } from '@langchain/langgraph';
import striptags from 'striptags';
import { ChatOpenAI, DallEAPIWrapper } from '@langchain/openai';
import { JSDOM } from 'jsdom';
import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { PostsService } from "../posts/posts.service";
import Parser from 'rss-parser';
import { IntegrationService } from "../integrations/integration.service";
import { makeId } from "../../../services/make.is";
import { TemporalService } from 'nestjs-temporal-core';
import { TypedSearchAttributes } from '@temporalio/common';
import { organizationId, } from "../../../temporal/temporal.search.attribute";
const parser = new Parser();
const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
    model: 'gpt-4.1',
    temperature: 0.7,
});
const dalle = new DallEAPIWrapper({
    apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
    model: 'gpt-image-1',
});
const generateContent = z.object({
    socialMediaPostContent: z
        .string()
        .describe('Content for social media posts max 120 chars'),
});
const dallePrompt = z.object({
    generatedTextToBeSentToDallE: z
        .string()
        .describe('Generated prompt from description to be sent to DallE'),
});
let AutopostService = AutopostService_1 = class AutopostService {
    constructor(_autopostsRepository, _temporalService, _integrationService, _postsService) {
        this._autopostsRepository = _autopostsRepository;
        this._temporalService = _temporalService;
        this._integrationService = _integrationService;
        this._postsService = _postsService;
    }
    stopAll(org) {
        return __awaiter(this, void 0, void 0, function* () {
            const getAll = (yield this.getAutoposts(org)).filter((f) => f.active);
            for (const autopost of getAll) {
                yield this.changeActive(org, autopost.id, false);
            }
        });
    }
    getAutoposts(orgId) {
        return this._autopostsRepository.getAutoposts(orgId);
    }
    createAutopost(orgId, body, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this._autopostsRepository.createAutopost(orgId, body, id);
            yield this.processCron(body.active, orgId, data.id);
            return data;
        });
    }
    changeActive(orgId, id, active) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this._autopostsRepository.changeActive(orgId, id, active);
            yield this.processCron(active, orgId, id);
            return data;
        });
    }
    processCron(active, orgId, id) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (active) {
                try {
                    return (_a = this._temporalService.client
                        .getRawClient()) === null || _a === void 0 ? void 0 : _a.workflow.start('autoPostWorkflow', {
                        workflowId: `autopost-${id}`,
                        taskQueue: 'main',
                        args: [{ id, immediately: true }],
                        typedSearchAttributes: new TypedSearchAttributes([
                            {
                                key: organizationId,
                                value: orgId,
                            },
                        ]),
                    });
                }
                catch (err) { }
            }
            try {
                return yield this._temporalService.terminateWorkflow(`autopost-${id}`);
            }
            catch (err) {
                return false;
            }
        });
    }
    deleteAutopost(orgId, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this._autopostsRepository.deleteAutopost(orgId, id);
            yield this.processCron(false, orgId, id);
            return data;
        });
    }
    loadXML(url) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { items } = yield parser.parseURL(url);
                const findLast = items.reduce((all, current) => {
                    if (dayjs(current.pubDate).isAfter(all.pubDate)) {
                        return current;
                    }
                    return all;
                }, { pubDate: dayjs().subtract(100, 'years') });
                return {
                    success: true,
                    date: findLast.pubDate,
                    url: findLast.link,
                    description: striptags((findLast === null || findLast === void 0 ? void 0 : findLast['content:encoded']) ||
                        (findLast === null || findLast === void 0 ? void 0 : findLast.content) ||
                        (findLast === null || findLast === void 0 ? void 0 : findLast.description) ||
                        '')
                        .replace(/\n/g, ' ')
                        .trim(),
                };
            }
            catch (err) {
                /** sent **/
            }
            return { success: false };
        });
    }
    loadUrl(url) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const loadDom = new JSDOM(yield (yield fetch(url)).text());
                loadDom.window.document
                    .querySelectorAll('script')
                    .forEach((s) => s.remove());
                loadDom.window.document
                    .querySelectorAll('style')
                    .forEach((s) => s.remove());
                // remove all html, script and styles
                return striptags(loadDom.window.document.body.innerHTML);
            }
            catch (err) {
                return '';
            }
        });
    }
    generateDescription(state) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!state.body.generateContent) {
                return Object.assign(Object.assign({}, state), { description: state.body.content });
            }
            const description = state.load.description || (yield this.loadUrl(state.load.url));
            if (!description) {
                return Object.assign(Object.assign({}, state), { description: '' });
            }
            const structuredOutput = model.withStructuredOutput(generateContent);
            const { socialMediaPostContent } = yield ChatPromptTemplate.fromTemplate(`
        You are an assistant that gets raw 'description' of a content and generate a social media post content.
        Rules:
        - Maximum 100 chars
        - Try to make it a short as possible to fit any social media
        - Add line breaks between sentences (\\n) 
        - Don't add hashtags
        - Add emojis when needed
        
        'description':
        {content}
      `)
                .pipe(structuredOutput)
                .invoke({
                content: description,
            });
            return Object.assign(Object.assign({}, state), { description: socialMediaPostContent });
        });
    }
    generatePicture(state) {
        return __awaiter(this, void 0, void 0, function* () {
            const structuredOutput = model.withStructuredOutput(dallePrompt);
            const { generatedTextToBeSentToDallE } = yield ChatPromptTemplate.fromTemplate(`
        You are an assistant that gets description and generate a prompt that will be sent to DallE to generate pictures.
        
        content:
        {content}
      `)
                .pipe(structuredOutput)
                .invoke({
                content: state.load.description || state.description,
            });
            const image = yield dalle.invoke(generatedTextToBeSentToDallE);
            return Object.assign(Object.assign({}, state), { image });
        });
    }
    schedulePost(state) {
        return __awaiter(this, void 0, void 0, function* () {
            const nextTime = yield this._postsService.findFreeDateTime(state.integrations[0].organizationId);
            yield this._postsService.createPost(state.integrations[0].organizationId, {
                date: nextTime + 'Z',
                order: makeId(10),
                shortLink: false,
                type: 'draft',
                tags: [],
                posts: state.integrations.map((i) => ({
                    settings: {
                        __type: i.providerIdentifier,
                        title: '',
                        tags: [],
                        subreddit: [],
                    },
                    group: makeId(10),
                    integration: { id: i.id },
                    value: [
                        {
                            id: makeId(10),
                            delay: 0,
                            content: state.description.replace(/\n/g, '\n\n') +
                                '\n\n' +
                                state.load.url,
                            image: !state.image
                                ? []
                                : [
                                    {
                                        id: makeId(10),
                                        name: makeId(10),
                                        path: state.image,
                                        organizationId: state.integrations[0].organizationId,
                                    },
                                ],
                        },
                    ],
                })),
            });
        });
    }
    updateUrl(state) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._autopostsRepository.updateUrl(state.id, state.load.url);
        });
    }
    startAutopost(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const getPost = yield this._autopostsRepository.getAutopost(id);
            if (!getPost || !getPost.active) {
                return;
            }
            const load = yield this.loadXML(getPost.url);
            if (!load.success || load.url === getPost.lastUrl) {
                return;
            }
            const integrations = yield this._integrationService.getIntegrationsList(getPost.organizationId);
            const parseIntegrations = JSON.parse(getPost.integrations || '[]') || [];
            const neededIntegrations = integrations.filter((i) => parseIntegrations.some((ii) => ii.id === i.id));
            const integrationsToSend = parseIntegrations.length === 0 ? integrations : neededIntegrations;
            if (integrationsToSend.length === 0) {
                return;
            }
            const state = AutopostService_1.state();
            const workflow = state
                .addNode('generate-description', this.generateDescription.bind(this))
                .addNode('generate-picture', this.generatePicture.bind(this))
                .addNode('schedule-post', this.schedulePost.bind(this))
                .addNode('update-url', this.updateUrl.bind(this))
                .addEdge(START, 'generate-description')
                .addConditionalEdges('generate-description', (state) => {
                if (!state.description) {
                    return 'schedule-post';
                }
                if (state.body.addPicture) {
                    return 'generate-picture';
                }
                return 'schedule-post';
            })
                .addEdge('generate-picture', 'schedule-post')
                .addEdge('schedule-post', 'update-url')
                .addEdge('update-url', END);
            const app = workflow.compile();
            yield app.invoke({
                messages: [],
                id,
                body: getPost,
                load,
                integrations: integrationsToSend,
            });
        });
    }
};
AutopostService.state = () => new StateGraph({
    channels: {
        messages: {
            reducer: (currentState, updateValue) => currentState.concat(updateValue),
            default: () => [],
        },
        body: null,
        description: null,
        load: null,
        image: null,
        integrations: null,
        id: null,
    },
});
AutopostService = AutopostService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [AutopostRepository,
        TemporalService,
        IntegrationService,
        PostsService])
], AutopostService);
export { AutopostService };
//# sourceMappingURL=autopost.service.js.map
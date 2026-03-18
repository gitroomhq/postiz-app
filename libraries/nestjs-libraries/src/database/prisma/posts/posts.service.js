import { __asyncValues, __awaiter, __decorate, __metadata, __rest } from "tslib";
import { BadRequestException, HttpException, Injectable, ValidationPipe, } from '@nestjs/common';
import { PostsRepository } from "./posts.repository";
import { CreatePostDto } from "../../../dtos/posts/create.post.dto";
import dayjs from 'dayjs';
import { IntegrationManager } from "../../../integrations/integration.manager";
import { shuffle } from 'lodash';
import { IntegrationService } from "../integrations/integration.service";
import { makeId } from "../../../services/make.is";
import utc from 'dayjs/plugin/utc';
import { MediaService } from "../media/media.service";
import { ShortLinkService } from "../../../short-linking/short.link.service";
import { minifyPostsList, minifyPosts } from "../../../../../helpers/src/utils/posts.list.minify";
import axios from 'axios';
import sharp from 'sharp';
import { UploadFactory } from "../../../upload/upload.factory";
import { Readable } from 'stream';
import { OpenaiService } from "../../../openai/openai.service";
dayjs.extend(utc);
import * as Sentry from '@sentry/nestjs';
import { TemporalService } from 'nestjs-temporal-core';
import { TypedSearchAttributes } from '@temporalio/common';
import { organizationId, postId as postIdSearchParam, } from "../../../temporal/temporal.search.attribute";
import { timer } from "../../../../../helpers/src/utils/timer";
import { ioRedis } from "../../../redis/redis.service";
import { RefreshToken } from "../../../integrations/social.abstract";
import { RefreshIntegrationService } from "../../../integrations/refresh.integration.service";
let PostsService = class PostsService {
    constructor(_postRepository, _integrationManager, _integrationService, _mediaService, _shortLinkService, _openaiService, _temporalService, _refreshIntegrationService) {
        this._postRepository = _postRepository;
        this._integrationManager = _integrationManager;
        this._integrationService = _integrationService;
        this._mediaService = _mediaService;
        this._shortLinkService = _shortLinkService;
        this._openaiService = _openaiService;
        this._temporalService = _temporalService;
        this._refreshIntegrationService = _refreshIntegrationService;
        this.storage = UploadFactory.createStorage();
    }
    searchForMissingThreeHoursPosts() {
        return this._postRepository.searchForMissingThreeHoursPosts();
    }
    updatePost(id, postId, releaseURL) {
        return this._postRepository.updatePost(id, postId, releaseURL);
    }
    getMissingContent(orgId_1, postId_1) {
        return __awaiter(this, arguments, void 0, function* (orgId, postId, forceRefresh = false) {
            const post = yield this._postRepository.getPostById(postId, orgId);
            if (!post || post.releaseId !== 'missing') {
                return [];
            }
            const integrationProvider = this._integrationManager.getSocialIntegration(post.integration.providerIdentifier);
            if (!integrationProvider.missing) {
                return [];
            }
            const getIntegration = post.integration;
            if (dayjs(getIntegration === null || getIntegration === void 0 ? void 0 : getIntegration.tokenExpiration).isBefore(dayjs()) ||
                forceRefresh) {
                const data = yield this._refreshIntegrationService.refresh(getIntegration);
                if (!data) {
                    return [];
                }
                const { accessToken } = data;
                if (accessToken) {
                    getIntegration.token = accessToken;
                    if (integrationProvider.refreshWait) {
                        yield timer(10000);
                    }
                }
                else {
                    yield this._integrationService.disconnectChannel(orgId, getIntegration);
                    return [];
                }
            }
            try {
                return yield integrationProvider.missing(getIntegration.internalId, getIntegration.token);
            }
            catch (e) {
                console.log(e);
                if (e instanceof RefreshToken) {
                    return this.getMissingContent(orgId, postId, true);
                }
            }
            return [];
        });
    }
    updateReleaseId(orgId, postId, releaseId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._postRepository.updateReleaseId(postId, orgId, releaseId);
        });
    }
    checkPostAnalytics(orgId_1, postId_1, date_1) {
        return __awaiter(this, arguments, void 0, function* (orgId, postId, date, forceRefresh = false) {
            const post = yield this._postRepository.getPostById(postId, orgId);
            if (!post || !post.releaseId) {
                return [];
            }
            if (post.releaseId === 'missing') {
                return { missing: true };
            }
            const integrationProvider = this._integrationManager.getSocialIntegration(post.integration.providerIdentifier);
            if (!integrationProvider.postAnalytics) {
                return [];
            }
            const getIntegration = post.integration;
            if (dayjs(getIntegration === null || getIntegration === void 0 ? void 0 : getIntegration.tokenExpiration).isBefore(dayjs()) ||
                forceRefresh) {
                const data = yield this._refreshIntegrationService.refresh(getIntegration);
                if (!data) {
                    return [];
                }
                const { accessToken } = data;
                if (accessToken) {
                    getIntegration.token = accessToken;
                    if (integrationProvider.refreshWait) {
                        yield timer(10000);
                    }
                }
                else {
                    yield this._integrationService.disconnectChannel(orgId, getIntegration);
                    return [];
                }
            }
            // const getIntegrationData = await ioRedis.get(
            //   `integration:${orgId}:${post.id}:${date}`
            // );
            // if (getIntegrationData) {
            //   return JSON.parse(getIntegrationData);
            // }
            try {
                const loadAnalytics = yield integrationProvider.postAnalytics(getIntegration.internalId, getIntegration.token, post.releaseId, date);
                yield ioRedis.set(`integration:${orgId}:${post.id}:${date}`, JSON.stringify(loadAnalytics), 'EX', !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                    ? 1
                    : 3600);
                return loadAnalytics;
            }
            catch (e) {
                console.log(e);
                if (e instanceof RefreshToken) {
                    return this.checkPostAnalytics(orgId, postId, date, true);
                }
            }
            return [];
        });
    }
    getStatistics(orgId, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const getPost = yield this.getPostsRecursively(id, true, orgId, true);
            const content = getPost.map((p) => p.content);
            const shortLinksTracking = yield this._shortLinkService.getStatistics(content);
            return {
                clicks: shortLinksTracking,
            };
        });
    }
    mapTypeToPost(body_1, organization_1) {
        return __awaiter(this, arguments, void 0, function* (body, organization, replaceDraft = false) {
            var _a;
            if (!((_a = body === null || body === void 0 ? void 0 : body.posts) === null || _a === void 0 ? void 0 : _a.every((p) => { var _a; return (_a = p === null || p === void 0 ? void 0 : p.integration) === null || _a === void 0 ? void 0 : _a.id; }))) {
                throw new BadRequestException('All posts must have an integration id');
            }
            const mappedValues = Object.assign(Object.assign({}, body), { type: replaceDraft ? 'schedule' : body.type, posts: yield Promise.all(body.posts.map((post) => __awaiter(this, void 0, void 0, function* () {
                    const integration = yield this._integrationService.getIntegrationById(organization, post.integration.id);
                    if (!integration) {
                        throw new BadRequestException(`Integration with id ${post.integration.id} not found`);
                    }
                    return Object.assign(Object.assign({ type: replaceDraft ? 'schedule' : body.type }, post), { settings: Object.assign(Object.assign({}, (post.settings || {})), { __type: integration.providerIdentifier }) });
                }))) });
            const validationPipe = new ValidationPipe({
                skipMissingProperties: false,
                transform: true,
                transformOptions: {
                    enableImplicitConversion: true,
                },
            });
            return yield validationPipe.transform(mappedValues, {
                type: 'body',
                metatype: CreatePostDto,
            });
        });
    }
    getPostsRecursively(id_1) {
        return __awaiter(this, arguments, void 0, function* (id, includeIntegration = false, orgId, isFirst) {
            var _a, _b, _c;
            const post = yield this._postRepository.getPost(id, includeIntegration, orgId, isFirst);
            if (!post) {
                return [];
            }
            return [
                post,
                ...(((_a = post === null || post === void 0 ? void 0 : post.childrenPost) === null || _a === void 0 ? void 0 : _a.length)
                    ? yield this.getPostsRecursively((_c = (_b = post === null || post === void 0 ? void 0 : post.childrenPost) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.id, false, orgId, false)
                    : []),
            ];
        });
    }
    getPosts(orgId, query) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._postRepository.getPosts(orgId, query);
        });
    }
    getPostsMinified(orgId, query) {
        return __awaiter(this, void 0, void 0, function* () {
            return minifyPosts({
                posts: yield this._postRepository.getPosts(orgId, query),
            });
        });
    }
    getPostsList(orgId, query) {
        return __awaiter(this, void 0, void 0, function* () {
            return minifyPostsList(yield this._postRepository.getPostsList(orgId, query));
        });
    }
    updateMedia(id_1, imagesList_1) {
        return __awaiter(this, arguments, void 0, function* (id, imagesList, convertToJPEG = false) {
            try {
                let imageUpdateNeeded = false;
                const getImageList = yield Promise.all((yield Promise.all((imagesList || []).map((p) => __awaiter(this, void 0, void 0, function* () {
                    if (!p.path && p.id) {
                        imageUpdateNeeded = true;
                        return this._mediaService.getMediaById(p.id);
                    }
                    return p;
                }))))
                    .map((m) => {
                    return Object.assign(Object.assign({}, m), { url: m.path.indexOf('http') === -1
                            ? process.env.FRONTEND_URL +
                                '/' +
                                process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY +
                                m.path
                            : m.path, type: 'image', path: m.path.indexOf('http') === -1
                            ? process.env.UPLOAD_DIRECTORY + m.path
                            : m.path });
                })
                    .map((m) => __awaiter(this, void 0, void 0, function* () {
                    if (!convertToJPEG) {
                        return m;
                    }
                    if (m.path.indexOf('.png') > -1) {
                        imageUpdateNeeded = true;
                        const response = yield axios.get(m.url, {
                            responseType: 'arraybuffer',
                        });
                        const imageBuffer = Buffer.from(response.data);
                        // Use sharp to get the metadata of the image
                        const buffer = yield sharp(imageBuffer)
                            .jpeg({ quality: 100 })
                            .toBuffer();
                        const { path, originalname } = yield this.storage.uploadFile({
                            buffer,
                            mimetype: 'image/jpeg',
                            size: buffer.length,
                            path: '',
                            fieldname: '',
                            destination: '',
                            stream: new Readable(),
                            filename: '',
                            originalname: '',
                            encoding: '',
                        });
                        return Object.assign(Object.assign({}, m), { name: originalname, url: path.indexOf('http') === -1
                                ? process.env.FRONTEND_URL +
                                    '/' +
                                    process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY +
                                    path
                                : path, type: 'image', path: path.indexOf('http') === -1
                                ? process.env.UPLOAD_DIRECTORY + path
                                : path });
                    }
                    return m;
                })));
                if (imageUpdateNeeded) {
                    yield this._postRepository.updateImages(id, JSON.stringify(getImageList));
                }
                return getImageList;
            }
            catch (err) {
                return imagesList;
            }
        });
    }
    getPostsByGroup(orgId, group) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const convertToJPEG = false;
            const loadAll = yield this._postRepository.getPostsByGroup(orgId, group);
            const posts = this.arrangePostsByGroup(loadAll, undefined);
            return {
                group: (_a = posts === null || posts === void 0 ? void 0 : posts[0]) === null || _a === void 0 ? void 0 : _a.group,
                posts: yield Promise.all((posts || []).map((post) => __awaiter(this, void 0, void 0, function* () {
                    return (Object.assign(Object.assign({}, post), { image: yield this.updateMedia(post.id, JSON.parse(post.image || '[]'), convertToJPEG) }));
                }))),
                integrationPicture: (_c = (_b = posts[0]) === null || _b === void 0 ? void 0 : _b.integration) === null || _c === void 0 ? void 0 : _c.picture,
                integration: posts[0].integrationId,
                settings: JSON.parse(posts[0].settings || '{}'),
            };
        });
    }
    arrangePostsByGroup(all, parent) {
        const findAll = all
            .filter((p) => !parent ? !p.parentPostId : p.parentPostId === parent)
            .map((_a) => {
            var { integration } = _a, all = __rest(_a, ["integration"]);
            return (Object.assign(Object.assign({}, all), (!parent ? { integration } : {})));
        });
        return [
            ...findAll,
            ...(findAll.length
                ? findAll.flatMap((p) => this.arrangePostsByGroup(all, p.id))
                : []),
        ];
    }
    getPost(orgId_1, id_1) {
        return __awaiter(this, arguments, void 0, function* (orgId, id, convertToJPEG = false) {
            var _a, _b, _c;
            const posts = yield this.getPostsRecursively(id, true, orgId, true);
            const list = {
                group: (_a = posts === null || posts === void 0 ? void 0 : posts[0]) === null || _a === void 0 ? void 0 : _a.group,
                posts: yield Promise.all((posts || []).map((post) => __awaiter(this, void 0, void 0, function* () {
                    return (Object.assign(Object.assign({}, post), { image: yield this.updateMedia(post.id, JSON.parse(post.image || '[]'), convertToJPEG) }));
                }))),
                integrationPicture: (_c = (_b = posts[0]) === null || _b === void 0 ? void 0 : _b.integration) === null || _c === void 0 ? void 0 : _c.picture,
                integration: posts[0].integrationId,
                settings: JSON.parse(posts[0].settings || '{}'),
            };
            return list;
        });
    }
    getOldPosts(orgId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._postRepository.getOldPosts(orgId, date);
        });
    }
    updateTags(orgId, post) {
        return __awaiter(this, void 0, void 0, function* () {
            const plainText = JSON.stringify(post);
            const extract = Array.from(plainText.match(/\(post:[a-zA-Z0-9-_]+\)/g) || []);
            if (!extract.length) {
                return post;
            }
            const ids = (extract || []).map((e) => e.replace('(post:', '').replace(')', ''));
            const urls = yield this._postRepository.getPostUrls(orgId, ids);
            const newPlainText = ids.reduce((acc, value) => {
                var _a, _b;
                const findUrl = ((_b = (_a = urls === null || urls === void 0 ? void 0 : urls.find) === null || _a === void 0 ? void 0 : _a.call(urls, (u) => u.id === value)) === null || _b === void 0 ? void 0 : _b.releaseURL) || '';
                return acc.replace(new RegExp(`\\(post:${value}\\)`, 'g'), findUrl.split(',')[0]);
            }, plainText);
            return this.updateTags(orgId, JSON.parse(newPlainText));
        });
    }
    checkInternalPlug(integration, orgId, id, settings) {
        return __awaiter(this, void 0, void 0, function* () {
            const plugs = Object.entries(settings).filter(([key]) => {
                return key.indexOf('plug-') > -1;
            });
            if (plugs.length === 0) {
                return [];
            }
            const parsePlugs = plugs.reduce((all, [key, value]) => {
                const [_, name, identifier] = key.split('--');
                all[name] = all[name] || { name };
                all[name][identifier] = value;
                return all;
            }, {});
            const list = Object.values(parsePlugs);
            return (list || []).flatMap((trigger) => {
                return ((trigger === null || trigger === void 0 ? void 0 : trigger.integrations) || []).flatMap((int) => ({
                    type: 'internal-plug',
                    post: id,
                    originalIntegration: integration.id,
                    integration: int.id,
                    plugName: trigger.name,
                    orgId: orgId,
                    delay: +trigger.delay,
                    information: trigger,
                }));
            });
        });
    }
    checkPlugs(orgId, providerName, integrationId) {
        return __awaiter(this, void 0, void 0, function* () {
            const loadAllPlugs = this._integrationManager.getAllPlugs();
            const getPlugs = yield this._integrationService.getPlugs(orgId, integrationId);
            const currentPlug = loadAllPlugs.find((p) => p.identifier === providerName);
            return getPlugs
                .filter((plug) => {
                var _a;
                return (_a = currentPlug === null || currentPlug === void 0 ? void 0 : currentPlug.plugs) === null || _a === void 0 ? void 0 : _a.some((p) => p.methodName === plug.plugFunction);
            })
                .map((plug) => {
                var _a;
                const runPlug = (_a = currentPlug === null || currentPlug === void 0 ? void 0 : currentPlug.plugs) === null || _a === void 0 ? void 0 : _a.find((p) => p.methodName === plug.plugFunction);
                return {
                    type: 'global',
                    plugId: plug.id,
                    delay: runPlug.runEveryMilliseconds,
                    totalRuns: runPlug.totalRuns,
                };
            });
        });
    }
    deletePost(orgId, group) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, e_1, _b, _c;
            var _d;
            const post = yield this._postRepository.deletePost(orgId, group);
            if (post === null || post === void 0 ? void 0 : post.id) {
                try {
                    const workflows = (_d = this._temporalService.client
                        .getRawClient()) === null || _d === void 0 ? void 0 : _d.workflow.list({
                        query: `postId="${post.id}" AND ExecutionStatus="Running"`,
                    });
                    try {
                        for (var _e = true, workflows_1 = __asyncValues(workflows), workflows_1_1; workflows_1_1 = yield workflows_1.next(), _a = workflows_1_1.done, !_a; _e = true) {
                            _c = workflows_1_1.value;
                            _e = false;
                            const executionInfo = _c;
                            try {
                                const workflow = yield this._temporalService.client.getWorkflowHandle(executionInfo.workflowId);
                                if (workflow &&
                                    (yield workflow.describe()).status.name !== 'TERMINATED') {
                                    yield workflow.terminate();
                                }
                            }
                            catch (err) { }
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (!_e && !_a && (_b = workflows_1.return)) yield _b.call(workflows_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
                catch (err) { }
            }
            return { error: true };
        });
    }
    countPostsFromDay(orgId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._postRepository.countPostsFromDay(orgId, date);
        });
    }
    getPostByForWebhookId(id) {
        return this._postRepository.getPostByForWebhookId(id);
    }
    startWorkflow(taskQueue, postId, orgId, state) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, e_2, _b, _c;
            var _d, _e;
            try {
                const workflows = (_d = this._temporalService.client
                    .getRawClient()) === null || _d === void 0 ? void 0 : _d.workflow.list({
                    query: `postId="${postId}" AND ExecutionStatus="Running"`,
                });
                try {
                    for (var _f = true, workflows_2 = __asyncValues(workflows), workflows_2_1; workflows_2_1 = yield workflows_2.next(), _a = workflows_2_1.done, !_a; _f = true) {
                        _c = workflows_2_1.value;
                        _f = false;
                        const executionInfo = _c;
                        try {
                            const workflow = yield this._temporalService.client.getWorkflowHandle(executionInfo.workflowId);
                            if (workflow &&
                                (yield workflow.describe()).status.name !== 'TERMINATED') {
                                yield workflow.terminate();
                            }
                        }
                        catch (err) { }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (!_f && !_a && (_b = workflows_2.return)) yield _b.call(workflows_2);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            catch (err) { }
            if (state === 'DRAFT') {
                return;
            }
            try {
                yield ((_e = this._temporalService.client
                    .getRawClient()) === null || _e === void 0 ? void 0 : _e.workflow.start('postWorkflowV101', {
                    workflowId: `post_${postId}`,
                    taskQueue: 'main',
                    workflowIdConflictPolicy: 'TERMINATE_EXISTING',
                    args: [
                        {
                            taskQueue: taskQueue,
                            postId: postId,
                            organizationId: orgId,
                        },
                    ],
                    typedSearchAttributes: new TypedSearchAttributes([
                        {
                            key: postIdSearchParam,
                            value: postId,
                        },
                        {
                            key: organizationId,
                            value: orgId,
                        },
                    ]),
                }));
            }
            catch (err) { }
        });
    }
    createPost(orgId, body) {
        return __awaiter(this, void 0, void 0, function* () {
            const postList = [];
            for (const post of body.posts) {
                const messages = (post.value || []).map((p) => p.content);
                const updateContent = !body.shortLink
                    ? messages
                    : yield this._shortLinkService.convertTextToShortLinks(orgId, messages);
                post.value = (post.value || []).map((p, i) => (Object.assign(Object.assign({}, p), { content: updateContent[i] })));
                const { posts } = yield this._postRepository.createOrUpdatePost(body.type, orgId, body.type === 'now' ? dayjs().format('YYYY-MM-DDTHH:mm:00') : body.date, post, body.tags, body.inter);
                if (!(posts === null || posts === void 0 ? void 0 : posts.length)) {
                    return [];
                }
                if (body.type !== 'update') {
                    this.startWorkflow(post.settings.__type.split('-')[0].toLowerCase(), posts[0].id, orgId, posts[0].state).catch((err) => { });
                }
                Sentry.metrics.count('post_created', 1);
                postList.push({
                    postId: posts[0].id,
                    integration: post.integration.id,
                });
            }
            return postList;
        });
    }
    separatePosts(content, len) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._openaiService.separatePosts(content, len);
        });
    }
    changeState(id, state, err, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._postRepository.changeState(id, state, err, body);
        });
    }
    changeDate(orgId_1, id_1, date_1) {
        return __awaiter(this, arguments, void 0, function* (orgId, id, date, action = 'schedule') {
            const getPostById = yield this._postRepository.getPostById(id, orgId);
            if (!getPostById) {
                throw new HttpException({ msg: 'Post not found' }, 404);
            }
            // schedule: Set status to QUEUE and change date (reschedule the post)
            // update: Just change the date without changing the status
            const newDate = yield this._postRepository.changeDate(orgId, id, date, getPostById.state === 'DRAFT', action);
            if (action === 'schedule') {
                try {
                    yield this.startWorkflow(getPostById.integration.providerIdentifier.split('-')[0].toLowerCase(), getPostById.id, orgId, getPostById.state === 'DRAFT' ? 'DRAFT' : 'QUEUE');
                }
                catch (err) { }
            }
            return newDate;
        });
    }
    generatePostsDraft(orgId, body) {
        return __awaiter(this, void 0, void 0, function* () {
            const getAllIntegrations = (yield this._integrationService.getIntegrationsList(orgId)).filter((f) => !f.disabled && f.providerIdentifier !== 'reddit');
            // const posts = chunk(body.posts, getAllIntegrations.length);
            const allDates = dayjs()
                .isoWeek(body.week)
                .year(body.year)
                .startOf('isoWeek');
            const dates = [...new Array(7)].map((_, i) => {
                return allDates.add(i, 'day').format('YYYY-MM-DD');
            });
            const findTime = () => {
                const totalMinutes = Math.floor(Math.random() * 144) * 10;
                // Convert total minutes to hours and minutes
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                // Format hours and minutes to always be two digits
                const formattedHours = hours.toString().padStart(2, '0');
                const formattedMinutes = minutes.toString().padStart(2, '0');
                const randomDate = shuffle(dates)[0] + 'T' + `${formattedHours}:${formattedMinutes}:00`;
                if (dayjs(randomDate).isBefore(dayjs())) {
                    return findTime();
                }
                return randomDate;
            };
            for (const integration of getAllIntegrations) {
                for (const toPost of body.posts) {
                    const group = makeId(10);
                    const randomDate = findTime();
                    yield this.createPost(orgId, {
                        type: 'draft',
                        date: randomDate,
                        order: '',
                        shortLink: false,
                        tags: [],
                        posts: [
                            {
                                group,
                                integration: {
                                    id: integration.id,
                                },
                                settings: {
                                    __type: integration.providerIdentifier,
                                    title: '',
                                    tags: [],
                                    subreddit: [],
                                },
                                value: [
                                    ...toPost.list.map((l) => ({
                                        id: '',
                                        content: l.post,
                                        delay: 0,
                                        image: [],
                                    })),
                                    {
                                        id: '',
                                        delay: 0,
                                        content: `Check out the full story here:\n${body.postId || body.url}`,
                                        image: [],
                                    },
                                ],
                            },
                        ],
                    });
                }
            }
        });
    }
    findAllExistingCategories() {
        return this._postRepository.findAllExistingCategories();
    }
    findAllExistingTopicsOfCategory(category) {
        return this._postRepository.findAllExistingTopicsOfCategory(category);
    }
    findPopularPosts(category, topic) {
        return this._postRepository.findPopularPosts(category, topic);
    }
    findFreeDateTime(orgId, integrationId) {
        return __awaiter(this, void 0, void 0, function* () {
            const findTimes = yield this._integrationService.findFreeDateTime(orgId, integrationId);
            return this.findFreeDateTimeRecursive(orgId, findTimes, dayjs.utc().startOf('day'));
        });
    }
    createPopularPosts(post) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._postRepository.createPopularPosts(post);
        });
    }
    findFreeDateTimeRecursive(orgId, times, date) {
        return __awaiter(this, void 0, void 0, function* () {
            const list = yield this._postRepository.getPostsCountsByDates(orgId, times, date);
            if (!list.length) {
                return this.findFreeDateTimeRecursive(orgId, times, date.add(1, 'day'));
            }
            const num = list.reduce((prev, curr) => {
                if (prev === null || prev > curr) {
                    return curr;
                }
                return prev;
            }, null);
            return date.clone().add(num, 'minutes').format('YYYY-MM-DDTHH:mm:00');
        });
    }
    getComments(postId) {
        return this._postRepository.getComments(postId);
    }
    getTags(orgId) {
        return this._postRepository.getTags(orgId);
    }
    createTag(orgId, body) {
        return this._postRepository.createTag(orgId, body);
    }
    editTag(id, orgId, body) {
        return this._postRepository.editTag(id, orgId, body);
    }
    deleteTag(id, orgId) {
        return this._postRepository.deleteTag(id, orgId);
    }
    createComment(orgId, userId, postId, comment) {
        return this._postRepository.createComment(orgId, userId, postId, comment);
    }
};
PostsService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PostsRepository,
        IntegrationManager,
        IntegrationService,
        MediaService,
        ShortLinkService,
        OpenaiService,
        TemporalService,
        RefreshIntegrationService])
], PostsService);
export { PostsService };
//# sourceMappingURL=posts.service.js.map
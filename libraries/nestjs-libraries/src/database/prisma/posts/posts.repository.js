import { __awaiter, __decorate, __metadata } from "tslib";
import { PrismaRepository } from "../prisma.service";
import { Injectable } from '@nestjs/common';
import { APPROVED_SUBMIT_FOR_ORDER } from '@prisma/client';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import utc from 'dayjs/plugin/utc';
import { v4 as uuidv4 } from 'uuid';
dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);
dayjs.extend(isSameOrAfter);
dayjs.extend(utc);
let PostsRepository = class PostsRepository {
    constructor(_post, _popularPosts, _comments, _tags, _tagsPosts, _errors) {
        this._post = _post;
        this._popularPosts = _popularPosts;
        this._comments = _comments;
        this._tags = _tags;
        this._tagsPosts = _tagsPosts;
        this._errors = _errors;
    }
    searchForMissingThreeHoursPosts() {
        return this._post.model.post.findMany({
            where: {
                integration: {
                    refreshNeeded: false,
                    inBetweenSteps: false,
                    disabled: false,
                },
                publishDate: {
                    gte: dayjs.utc().subtract(2, 'hour').toDate(),
                    lt: dayjs.utc().add(2, 'hour').toDate(),
                },
                state: 'QUEUE',
                deletedAt: null,
                parentPostId: null,
            },
            select: {
                id: true,
                organizationId: true,
                integration: {
                    select: {
                        providerIdentifier: true,
                    },
                },
                publishDate: true,
            },
        });
    }
    getOldPosts(orgId, date) {
        return this._post.model.post.findMany({
            where: {
                integration: {
                    refreshNeeded: false,
                    inBetweenSteps: false,
                    disabled: false,
                },
                organizationId: orgId,
                publishDate: {
                    lte: dayjs(date).toDate(),
                },
                deletedAt: null,
                parentPostId: null,
            },
            orderBy: {
                publishDate: 'desc',
            },
            select: {
                id: true,
                content: true,
                publishDate: true,
                releaseURL: true,
                state: true,
                integration: {
                    select: {
                        id: true,
                        name: true,
                        providerIdentifier: true,
                        picture: true,
                        type: true,
                    },
                },
            },
        });
    }
    updateImages(id, images) {
        return this._post.model.post.update({
            where: {
                id,
            },
            data: {
                image: images,
            },
        });
    }
    getPostUrls(orgId, ids) {
        return this._post.model.post.findMany({
            where: {
                organizationId: orgId,
                id: {
                    in: ids,
                },
            },
            select: {
                id: true,
                releaseURL: true,
            },
        });
    }
    getPosts(orgId, query) {
        return __awaiter(this, void 0, void 0, function* () {
            // Use the provided start and end dates directly
            const startDate = dayjs.utc(query.startDate).toDate();
            const endDate = dayjs.utc(query.endDate).toDate();
            const list = yield this._post.model.post.findMany({
                where: Object.assign({ AND: [
                        {
                            OR: [
                                {
                                    organizationId: orgId,
                                }
                            ],
                        },
                        {
                            OR: [
                                {
                                    publishDate: {
                                        gte: startDate,
                                        lte: endDate,
                                    },
                                },
                                {
                                    intervalInDays: {
                                        not: null,
                                    },
                                },
                            ],
                        },
                    ], integration: {
                        deletedAt: null,
                    }, deletedAt: null, parentPostId: null }, (query.customer
                    ? {
                        integration: {
                            customerId: query.customer,
                        },
                    }
                    : {})),
                select: {
                    id: true,
                    content: true,
                    publishDate: true,
                    releaseURL: true,
                    releaseId: true,
                    state: true,
                    intervalInDays: true,
                    group: true,
                    tags: {
                        select: {
                            tag: true,
                        },
                    },
                    integration: {
                        select: {
                            id: true,
                            providerIdentifier: true,
                            name: true,
                            picture: true,
                        },
                    },
                },
            });
            return list.reduce((all, post) => {
                if (!post.intervalInDays) {
                    return [...all, post];
                }
                const addMorePosts = [];
                let startingDate = dayjs.utc(post.publishDate);
                while (dayjs.utc(endDate).isSameOrAfter(startingDate)) {
                    if (dayjs(startingDate).isSameOrAfter(dayjs.utc(post.publishDate))) {
                        addMorePosts.push(Object.assign(Object.assign({}, post), { publishDate: startingDate.toDate(), actualDate: post.publishDate }));
                    }
                    startingDate = startingDate.add(post.intervalInDays, 'days');
                }
                return [...all, ...addMorePosts];
            }, []);
        });
    }
    getPostsList(orgId, query) {
        return __awaiter(this, void 0, void 0, function* () {
            const page = query.page || 0;
            const limit = query.limit || 20;
            const skip = page * limit;
            const where = Object.assign({ AND: [
                    {
                        OR: [
                            {
                                organizationId: orgId,
                            },
                        ],
                    },
                    {
                        publishDate: {
                            gte: dayjs.utc().toDate(),
                        },
                    },
                ], deletedAt: null, parentPostId: null, intervalInDays: null }, (query.customer
                ? {
                    integration: {
                        customerId: query.customer,
                    },
                }
                : {}));
            const [posts, total] = yield Promise.all([
                this._post.model.post.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: {
                        publishDate: 'asc',
                    },
                    select: {
                        id: true,
                        content: true,
                        publishDate: true,
                        releaseURL: true,
                        releaseId: true,
                        state: true,
                        group: true,
                        tags: {
                            select: {
                                tag: true,
                            },
                        },
                        integration: {
                            select: {
                                id: true,
                                providerIdentifier: true,
                                name: true,
                                picture: true,
                            },
                        },
                    },
                }),
                this._post.model.post.count({ where }),
            ]);
            return {
                posts,
                total,
                page,
                limit,
                hasMore: skip + posts.length < total,
            };
        });
    }
    deletePost(orgId, group) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._post.model.post.updateMany({
                where: {
                    organizationId: orgId,
                    group,
                },
                data: {
                    deletedAt: new Date(),
                },
            });
            return this._post.model.post.findFirst({
                where: {
                    organizationId: orgId,
                    group,
                    parentPostId: null,
                },
                select: {
                    id: true,
                },
            });
        });
    }
    getPostsByGroup(orgId, group) {
        return this._post.model.post.findMany({
            where: Object.assign(Object.assign({ group }, (orgId ? { organizationId: orgId } : {})), { deletedAt: null }),
            include: {
                integration: true,
                tags: {
                    select: {
                        tag: true,
                    },
                },
            },
        });
    }
    getPost(id, includeIntegration = false, orgId, isFirst) {
        return this._post.model.post.findUnique({
            where: Object.assign(Object.assign({ id }, (orgId ? { organizationId: orgId } : {})), { deletedAt: null }),
            include: Object.assign(Object.assign({}, (includeIntegration
                ? {
                    integration: true,
                    tags: {
                        select: {
                            tag: true,
                        },
                    },
                }
                : {})), { childrenPost: true }),
        });
    }
    updatePost(id, postId, releaseURL) {
        return this._post.model.post.update({
            where: {
                id,
            },
            data: {
                state: 'PUBLISHED',
                releaseURL,
                releaseId: postId,
            },
        });
    }
    updateReleaseId(id, orgId, releaseId) {
        return this._post.model.post.update({
            where: {
                id,
                organizationId: orgId,
                releaseId: 'missing',
            },
            data: {
                releaseId: String(releaseId),
            },
        });
    }
    changeState(id, state, err, body) {
        return __awaiter(this, void 0, void 0, function* () {
            const update = yield this._post.model.post.update({
                where: {
                    id,
                },
                data: Object.assign({ state }, (err
                    ? { error: typeof err === 'string' ? err : JSON.stringify(err) }
                    : {})),
                include: {
                    integration: {
                        select: {
                            providerIdentifier: true,
                        },
                    },
                },
            });
            if (state === 'ERROR' && err && body) {
                try {
                    yield this._errors.model.errors.create({
                        data: {
                            message: typeof err === 'string' ? err : JSON.stringify(err),
                            organizationId: update.organizationId,
                            platform: update.integration.providerIdentifier,
                            postId: update.id,
                            body: typeof body === 'string' ? body : JSON.stringify(body),
                        },
                    });
                }
                catch (err) { }
            }
            return update;
        });
    }
    changeDate(orgId_1, id_1, date_1, isDraft_1) {
        return __awaiter(this, arguments, void 0, function* (orgId, id, date, isDraft, action = 'schedule') {
            return this._post.model.post.update({
                where: {
                    organizationId: orgId,
                    id,
                },
                data: Object.assign({ publishDate: dayjs(date).toDate() }, (action === 'schedule'
                    ? {
                        state: isDraft ? 'DRAFT' : 'QUEUE',
                        releaseId: null,
                        releaseURL: null,
                    }
                    : {})),
            });
        });
    }
    countPostsFromDay(orgId, date) {
        return this._post.model.post.count({
            where: {
                organizationId: orgId,
                publishDate: {
                    gte: date,
                },
                OR: [
                    {
                        deletedAt: null,
                        state: {
                            in: ['QUEUE'],
                        },
                    },
                    {
                        state: 'PUBLISHED',
                    },
                ],
            },
        });
    }
    createOrUpdatePost(state, orgId, date, body, tags, inter) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const posts = [];
            const uuid = uuidv4();
            for (const value of body.value) {
                const updateData = (type) => {
                    var _a, _b;
                    return (Object.assign(Object.assign(Object.assign(Object.assign({ publishDate: dayjs(date).toDate(), integration: {
                            connect: {
                                id: body.integration.id,
                                organizationId: orgId,
                            },
                        } }, (((_a = posts === null || posts === void 0 ? void 0 : posts[posts.length - 1]) === null || _a === void 0 ? void 0 : _a.id)
                        ? {
                            parentPost: {
                                connect: {
                                    id: (_b = posts[posts.length - 1]) === null || _b === void 0 ? void 0 : _b.id,
                                },
                            },
                        }
                        : type === 'update'
                            ? {
                                parentPost: {
                                    disconnect: true,
                                },
                            }
                            : {})), { content: value.content, delay: value.delay || 0, group: uuid, intervalInDays: inter ? +inter : null, approvedSubmitForOrder: APPROVED_SUBMIT_FOR_ORDER.NO }), (state === 'update'
                        ? {}
                        : {
                            state: state === 'draft' ? 'DRAFT' : 'QUEUE',
                        })), { image: JSON.stringify(value.image), settings: JSON.stringify(body.settings), organization: {
                            connect: {
                                id: orgId,
                            },
                        } }));
                };
                posts.push(yield this._post.model.post.upsert({
                    where: {
                        id: value.id || uuidv4(),
                    },
                    create: Object.assign({}, updateData('create')),
                    update: Object.assign(Object.assign({}, updateData('update')), { lastMessage: {
                            disconnect: true,
                        }, submittedForOrder: {
                            disconnect: true,
                        } }),
                }));
                if (posts.length === 1) {
                    yield this._tagsPosts.model.tagsPosts.deleteMany({
                        where: {
                            post: {
                                id: posts[0].id,
                            },
                        },
                    });
                    if (tags.length) {
                        const tagsList = yield this._tags.model.tags.findMany({
                            where: {
                                orgId: orgId,
                                name: {
                                    in: tags.map((tag) => tag.label).filter((f) => f),
                                },
                            },
                        });
                        if (tagsList.length) {
                            yield this._post.model.post.update({
                                where: {
                                    id: posts[posts.length - 1].id,
                                },
                                data: {
                                    tags: {
                                        createMany: {
                                            data: tagsList.map((tag) => ({
                                                tagId: tag.id,
                                            })),
                                        },
                                    },
                                },
                            });
                        }
                    }
                }
            }
            const previousPost = body.group
                ? (_a = (yield this._post.model.post.findFirst({
                    where: {
                        group: body.group,
                        deletedAt: null,
                        parentPostId: null,
                    },
                    select: {
                        id: true,
                    },
                }))) === null || _a === void 0 ? void 0 : _a.id
                : undefined;
            if (body.group) {
                yield this._post.model.post.updateMany({
                    where: {
                        group: body.group,
                        deletedAt: null,
                    },
                    data: {
                        parentPostId: null,
                        deletedAt: new Date(),
                    },
                });
            }
            return { previousPost, posts };
        });
    }
    submit(id, order, buyerOrganizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._post.model.post.update({
                where: {
                    id,
                },
                data: {
                    submittedForOrderId: order,
                    approvedSubmitForOrder: 'WAITING_CONFIRMATION',
                    submittedForOrganizationId: buyerOrganizationId,
                },
                select: {
                    id: true,
                    description: true,
                    submittedForOrder: {
                        select: {
                            messageGroupId: true,
                        },
                    },
                },
            });
        });
    }
    updateMessage(id, messageId) {
        return this._post.model.post.update({
            where: {
                id,
            },
            data: {
                lastMessageId: messageId,
            },
        });
    }
    getPostById(id, org) {
        return this._post.model.post.findUnique({
            where: Object.assign({ id }, (org ? { organizationId: org } : {})),
            include: {
                integration: true,
                submittedForOrder: {
                    include: {
                        posts: {
                            where: {
                                state: 'PUBLISHED',
                            },
                        },
                        ordersItems: true,
                        seller: {
                            select: {
                                id: true,
                                account: true,
                            },
                        },
                    },
                },
            },
        });
    }
    findAllExistingCategories() {
        return this._popularPosts.model.popularPosts.findMany({
            select: {
                category: true,
            },
            distinct: ['category'],
        });
    }
    findAllExistingTopicsOfCategory(category) {
        return this._popularPosts.model.popularPosts.findMany({
            where: {
                category,
            },
            select: {
                topic: true,
            },
            distinct: ['topic'],
        });
    }
    findPopularPosts(category, topic) {
        return this._popularPosts.model.popularPosts.findMany({
            where: Object.assign({ category }, (topic ? { topic } : {})),
            select: {
                content: true,
                hook: true,
            },
        });
    }
    createPopularPosts(post) {
        return this._popularPosts.model.popularPosts.create({
            data: {
                category: 'category',
                topic: 'topic',
                content: 'content',
                hook: 'hook',
            },
        });
    }
    getPostsCountsByDates(orgId, times, date) {
        return __awaiter(this, void 0, void 0, function* () {
            const dates = yield this._post.model.post.findMany({
                where: {
                    deletedAt: null,
                    organizationId: orgId,
                    publishDate: {
                        in: times.map((time) => {
                            return date.clone().add(time, 'minutes').toDate();
                        }),
                    },
                },
            });
            return times.filter((time) => date.clone().add(time, 'minutes').isAfter(dayjs.utc()) &&
                !dates.find((dateFind) => {
                    return (dayjs
                        .utc(dateFind.publishDate)
                        .diff(date.clone().startOf('day'), 'minutes') == time);
                }));
        });
    }
    getComments(postId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._comments.model.comments.findMany({
                where: {
                    postId,
                },
                orderBy: {
                    createdAt: 'asc',
                },
            });
        });
    }
    getTags(orgId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._tags.model.tags.findMany({
                where: {
                    orgId,
                    deletedAt: null,
                },
            });
        });
    }
    createTag(orgId, body) {
        return this._tags.model.tags.create({
            data: {
                orgId,
                name: body.name,
                color: body.color,
            },
        });
    }
    editTag(id, orgId, body) {
        return this._tags.model.tags.update({
            where: {
                id,
            },
            data: {
                name: body.name,
                color: body.color,
            },
        });
    }
    deleteTag(id, orgId) {
        return this._tags.model.tags.update({
            where: {
                id,
                orgId,
            },
            data: {
                deletedAt: new Date(),
            },
        });
    }
    createComment(orgId, userId, postId, content) {
        return this._comments.model.comments.create({
            data: {
                organizationId: orgId,
                userId,
                postId,
                content,
            },
        });
    }
    getPostByForWebhookId(postId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._post.model.post.findMany({
                where: {
                    id: postId,
                    deletedAt: null,
                    parentPostId: null,
                },
                select: {
                    id: true,
                    content: true,
                    publishDate: true,
                    releaseURL: true,
                    state: true,
                    integration: {
                        select: {
                            id: true,
                            name: true,
                            providerIdentifier: true,
                            picture: true,
                            type: true,
                        },
                    },
                },
            });
        });
    }
    getPostsSince(orgId, since) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._post.model.post.findMany({
                where: {
                    organizationId: orgId,
                    publishDate: {
                        gte: new Date(since),
                    },
                    deletedAt: null,
                    parentPostId: null,
                },
                select: {
                    id: true,
                    content: true,
                    publishDate: true,
                    releaseURL: true,
                    state: true,
                    integration: {
                        select: {
                            id: true,
                            name: true,
                            providerIdentifier: true,
                            picture: true,
                            type: true,
                        },
                    },
                },
            });
        });
    }
};
PostsRepository = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaRepository,
        PrismaRepository,
        PrismaRepository,
        PrismaRepository,
        PrismaRepository,
        PrismaRepository])
], PostsRepository);
export { PostsRepository };
//# sourceMappingURL=posts.repository.js.map
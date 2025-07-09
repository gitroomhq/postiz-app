/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

module.exports = require("@nestjs/core");

/***/ }),
/* 2 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AppModule = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const stars_controller_1 = __webpack_require__(5);
const database_module_1 = __webpack_require__(37);
const trending_service_1 = __webpack_require__(34);
const posts_controller_1 = __webpack_require__(131);
const bull_mq_module_1 = __webpack_require__(132);
const plugs_controller_1 = __webpack_require__(133);
const config_1 = __webpack_require__(134);
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = tslib_1.__decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            database_module_1.DatabaseModule,
            bull_mq_module_1.BullMqModule
        ],
        controllers: [
            ...(!process.env.IS_GENERAL ? [stars_controller_1.StarsController] : []),
            posts_controller_1.PostsController,
            plugs_controller_1.PlugsController,
        ],
        providers: [trending_service_1.TrendingService],
    })
], AppModule);


/***/ }),
/* 3 */
/***/ ((module) => {

module.exports = require("tslib");

/***/ }),
/* 4 */
/***/ ((module) => {

module.exports = require("@nestjs/common");

/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StarsController = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const microservices_1 = __webpack_require__(6);
const jsdom_1 = __webpack_require__(7);
const stars_service_1 = __webpack_require__(8);
const trending_service_1 = __webpack_require__(34);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
let StarsController = class StarsController {
    constructor(_starsService, _trendingService) {
        this._starsService = _starsService;
        this._trendingService = _trendingService;
    }
    async checkStars(data) {
        // no to be effected by the limit, we scrape the HTML instead of using the API
        const loadedHtml = await (await fetch(`https://github.com/${data.login}`)).text();
        const dom = new jsdom_1.JSDOM(loadedHtml);
        const totalStars = +dom.window.document
            .querySelector('#repo-stars-counter-star')
            ?.getAttribute('title')
            ?.replace(/,/g, '') || 0;
        const totalForks = +dom.window.document
            .querySelector('#repo-network-counter')
            ?.getAttribute('title')
            ?.replace(/,/g, '');
        const lastValue = await this._starsService.getLastStarsByLogin(data.login);
        if ((0, dayjs_1.default)(lastValue.date).format('YYYY-MM-DD') === (0, dayjs_1.default)().format('YYYY-MM-DD')) {
            console.log('stars already synced for today');
            return;
        }
        const totalNewsStars = totalStars - (lastValue?.totalStars || 0);
        const totalNewsForks = totalForks - (lastValue?.totalForks || 0);
        // if there is no stars in the database, we need to sync the stars
        if (!lastValue?.totalStars) {
            return;
        }
        // if there is stars in the database, sync the new stars
        return this._starsService.createStars(data.login, totalNewsStars, totalStars, totalNewsForks, totalForks, new Date());
    }
    async syncAllStars(data) {
        // if there is a sync in progress, it's better not to touch it
        if (data?.login && (await this._starsService.getStarsByLogin(data?.login)).length) {
            return;
        }
        const findValidToken = await this._starsService.findValidToken(data?.login);
        await this._starsService.sync(data.login, findValidToken?.token);
    }
    async syncTrending() {
        return this._trendingService.syncTrending();
    }
};
exports.StarsController = StarsController;
tslib_1.__decorate([
    (0, microservices_1.EventPattern)('check_stars', microservices_1.Transport.REDIS),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], StarsController.prototype, "checkStars", null);
tslib_1.__decorate([
    (0, microservices_1.EventPattern)('sync_all_stars', microservices_1.Transport.REDIS, { concurrency: 1 }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], StarsController.prototype, "syncAllStars", null);
tslib_1.__decorate([
    (0, microservices_1.EventPattern)('sync_trending', microservices_1.Transport.REDIS, { concurrency: 1 }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], StarsController.prototype, "syncTrending", null);
exports.StarsController = StarsController = tslib_1.__decorate([
    (0, common_1.Controller)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof stars_service_1.StarsService !== "undefined" && stars_service_1.StarsService) === "function" ? _a : Object, typeof (_b = typeof trending_service_1.TrendingService !== "undefined" && trending_service_1.TrendingService) === "function" ? _b : Object])
], StarsController);


/***/ }),
/* 6 */
/***/ ((module) => {

module.exports = require("@nestjs/microservices");

/***/ }),
/* 7 */
/***/ ((module) => {

module.exports = require("jsdom");

/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StarsService = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const stars_repository_1 = __webpack_require__(9);
const lodash_1 = __webpack_require__(12);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
const notification_service_1 = __webpack_require__(14);
const simple_statistics_1 = __webpack_require__(28);
const client_1 = __webpack_require__(29);
var Inform;
(function (Inform) {
    Inform[Inform["Removed"] = 0] = "Removed";
    Inform[Inform["New"] = 1] = "New";
    Inform[Inform["Changed"] = 2] = "Changed";
})(Inform || (Inform = {}));
let StarsService = class StarsService {
    constructor(_starsRepository, _notificationsService, _workerServiceProducer) {
        this._starsRepository = _starsRepository;
        this._notificationsService = _notificationsService;
        this._workerServiceProducer = _workerServiceProducer;
    }
    getGitHubRepositoriesByOrgId(org) {
        return this._starsRepository.getGitHubRepositoriesByOrgId(org);
    }
    getAllGitHubRepositories() {
        return this._starsRepository.getAllGitHubRepositories();
    }
    getStarsByLogin(login) {
        return this._starsRepository.getStarsByLogin(login);
    }
    getLastStarsByLogin(login) {
        return this._starsRepository.getLastStarsByLogin(login);
    }
    createStars(login, totalNewsStars, totalStars, totalNewForks, totalForks, date) {
        return this._starsRepository.createStars(login, totalNewsStars, totalStars, totalNewForks, totalForks, date);
    }
    async sync(login, token) {
        const loadAllStars = await this.syncProcess(login, token);
        const loadAllForks = await this.syncForksProcess(login, token);
        const allDates = [
            ...new Set([...Object.keys(loadAllStars), ...Object.keys(loadAllForks)]),
        ];
        const sortedArray = allDates.sort((a, b) => (0, dayjs_1.default)(a).unix() - (0, dayjs_1.default)(b).unix());
        let addPreviousStars = 0;
        let addPreviousForks = 0;
        for (const date of sortedArray) {
            const dateObject = (0, dayjs_1.default)(date).toDate();
            addPreviousStars += loadAllStars[date] || 0;
            addPreviousForks += loadAllForks[date] || 0;
            await this._starsRepository.createStars(login, loadAllStars[date] || 0, addPreviousStars, loadAllForks[date] || 0, addPreviousForks, dateObject);
        }
    }
    async findValidToken(login) {
        return this._starsRepository.findValidToken(login);
    }
    async fetchWillFallback(url, userToken) {
        if (userToken) {
            const response = await fetch(url, {
                headers: {
                    Accept: 'application/vnd.github.v3.star+json',
                    Authorization: `Bearer ${userToken}`,
                },
            });
            if (response.status === 200) {
                return response;
            }
        }
        const response2 = await fetch(url, {
            headers: {
                Accept: 'application/vnd.github.v3.star+json',
                ...(process.env.GITHUB_AUTH
                    ? { Authorization: `token ${process.env.GITHUB_AUTH}` }
                    : {}),
            },
        });
        const totalRemaining = +(response2.headers.get('x-ratelimit-remaining') ||
            response2.headers.get('X-RateLimit-Remaining') ||
            0);
        const resetTime = +(response2.headers.get('x-ratelimit-reset') ||
            response2.headers.get('X-RateLimit-Reset') ||
            0);
        if (totalRemaining < 10) {
            console.log('waiting for the rate limit');
            const delay = resetTime * 1000 - Date.now() + 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
            return this.fetchWillFallback(url, userToken);
        }
        return response2;
    }
    async syncForksProcess(login, userToken, page = 1) {
        console.log('processing forks');
        const starsRequest = await this.fetchWillFallback(`https://api.github.com/repos/${login}/forks?page=${page}&per_page=100`, userToken);
        const data = await starsRequest.json();
        const mapDataToDate = (0, lodash_1.groupBy)(data, (p) => (0, dayjs_1.default)(p.created_at).format('YYYY-MM-DD'));
        // take all the forks from the page
        const aggForks = Object.values(mapDataToDate).reduce((acc, value) => ({
            ...acc,
            [(0, dayjs_1.default)(value[0].created_at).format('YYYY-MM-DD')]: value.length,
        }), {});
        // if we have 100 stars, we need to fetch the next page and merge the results (recursively)
        const nextOne = data.length === 100
            ? await this.syncForksProcess(login, userToken, page + 1)
            : {};
        // merge the results
        const allKeys = [
            ...new Set([...Object.keys(aggForks), ...Object.keys(nextOne)]),
        ];
        return {
            ...allKeys.reduce((acc, key) => ({
                ...acc,
                [key]: (aggForks[key] || 0) + (nextOne[key] || 0),
            }), {}),
        };
    }
    async syncProcess(login, userToken, page = 1) {
        console.log('processing stars');
        const starsRequest = await this.fetchWillFallback(`https://api.github.com/repos/${login}/stargazers?page=${page}&per_page=100`, userToken);
        const data = await starsRequest.json();
        const mapDataToDate = (0, lodash_1.groupBy)(data, (p) => (0, dayjs_1.default)(p.starred_at).format('YYYY-MM-DD'));
        // take all the stars from the page
        const aggStars = Object.values(mapDataToDate).reduce((acc, value) => ({
            ...acc,
            [(0, dayjs_1.default)(value[0].starred_at).format('YYYY-MM-DD')]: value.length,
        }), {});
        // if we have 100 stars, we need to fetch the next page and merge the results (recursively)
        const nextOne = data.length === 100
            ? await this.syncProcess(login, userToken, page + 1)
            : {};
        // merge the results
        const allKeys = [
            ...new Set([...Object.keys(aggStars), ...Object.keys(nextOne)]),
        ];
        return {
            ...allKeys.reduce((acc, key) => ({
                ...acc,
                [key]: (aggStars[key] || 0) + (nextOne[key] || 0),
            }), {}),
        };
    }
    async updateTrending(language, hash, arr) {
        const currentTrending = await this._starsRepository.getTrendingByLanguage(language);
        if (currentTrending?.hash === hash) {
            return;
        }
        if (currentTrending) {
            const list = JSON.parse(currentTrending.trendingList);
            const removedFromTrending = list.filter((p) => !arr.find((a) => a.name === p.name));
            const changedPosition = arr.filter((p) => {
                const current = list.find((a) => a.name === p.name);
                return current && current.position !== p.position;
            });
            if (removedFromTrending.length) {
                // let people know they are not trending anymore
                await this.inform(Inform.Removed, removedFromTrending, language);
            }
            if (changedPosition.length) {
                // let people know they changed position
                await this.inform(Inform.Changed, changedPosition, language);
            }
        }
        const informNewPeople = arr.filter((p) => !currentTrending?.trendingList ||
            currentTrending?.trendingList?.indexOf(p.name) === -1);
        // let people know they are trending
        await this.inform(Inform.New, informNewPeople, language);
        await this.replaceOrAddTrending(language, hash, arr);
    }
    async inform(type, removedFromTrending, language) {
        const names = await this._starsRepository.getGitHubsByNames(removedFromTrending.map((p) => p.name));
        const mapDbNamesToList = names.map((n) => removedFromTrending.find((p) => p.name === n.login));
        for (const person of mapDbNamesToList) {
            const getOrganizationsByGitHubLogin = await this._starsRepository.getOrganizationsByGitHubLogin(person.name);
            for (const org of getOrganizationsByGitHubLogin) {
                switch (type) {
                    case Inform.Removed:
                        return this._notificationsService.inAppNotification(org.organizationId, `${person.name} is not trending on GitHub anymore`, `${person.name} is not trending anymore in ${language}`, true);
                    case Inform.New:
                        return this._notificationsService.inAppNotification(org.organizationId, `${person.name} is trending on GitHub`, `${person.name} is trending in ${language || 'On the main feed'} position #${person.position}`, true);
                    case Inform.Changed:
                        return this._notificationsService.inAppNotification(org.organizationId, `${person.name} changed trending position on GitHub`, `${person.name} changed position in ${language || 'on the main feed to position'} position #${person.position}`, true);
                }
            }
        }
    }
    async replaceOrAddTrending(language, hash, arr) {
        return this._starsRepository.replaceOrAddTrending(language, hash, arr);
    }
    async getStars(org) {
        const getGitHubs = await this.getGitHubRepositoriesByOrgId(org);
        const list = [];
        for (const gitHub of getGitHubs) {
            if (!gitHub.login) {
                continue;
            }
            const getAllByLogin = await this.getStarsByLogin(gitHub.login);
            const stars = getAllByLogin.filter((f) => f.stars);
            const graphSize = stars.length < 10 ? stars.length : stars.length / 10;
            const forks = getAllByLogin.filter((f) => f.forks);
            const graphForkSize = forks.length < 10 ? forks.length : forks.length / 10;
            list.push({
                login: gitHub.login,
                stars: (0, lodash_1.chunk)(stars, graphSize).reduce((acc, chunkedStars) => {
                    return [
                        ...acc,
                        {
                            totalStars: chunkedStars[chunkedStars.length - 1].totalStars,
                            date: chunkedStars[chunkedStars.length - 1].date,
                        },
                    ];
                }, []),
                forks: (0, lodash_1.chunk)(forks, graphForkSize).reduce((acc, chunkedForks) => {
                    return [
                        ...acc,
                        {
                            totalForks: chunkedForks[chunkedForks.length - 1].totalForks,
                            date: chunkedForks[chunkedForks.length - 1].date,
                        },
                    ];
                }, []),
            });
        }
        return list;
    }
    async getStarsFilter(orgId, starsFilter) {
        const getGitHubs = await this.getGitHubRepositoriesByOrgId(orgId);
        if (getGitHubs.filter((f) => f.login).length === 0) {
            return [];
        }
        return this._starsRepository.getStarsFilter(getGitHubs.map((p) => p.login), starsFilter);
    }
    async addGitHub(orgId, code) {
        const { access_token } = await (await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: `${process.env.FRONTEND_URL}/settings`,
            }),
        })).json();
        return this._starsRepository.addGitHub(orgId, access_token);
    }
    async getOrganizations(orgId, id) {
        const getGitHub = await this._starsRepository.getGitHubById(orgId, id);
        return (await fetch(`https://api.github.com/user/orgs`, {
            headers: {
                Authorization: `token ${getGitHub?.token}`,
            },
        })).json();
    }
    async getRepositoriesOfOrganization(orgId, id, github) {
        const getGitHub = await this._starsRepository.getGitHubById(orgId, id);
        return (await fetch(`https://api.github.com/orgs/${github}/repos`, {
            headers: {
                Authorization: `token ${getGitHub?.token}`,
            },
        })).json();
    }
    async updateGitHubLogin(orgId, id, login) {
        const check = await fetch(`https://github.com/${login}`);
        if (check.status === 404) {
            throw new common_1.HttpException('GitHub repository not found!', 404);
        }
        this._workerServiceProducer
            .emit('sync_all_stars', { payload: { login } })
            .subscribe();
        return this._starsRepository.updateGitHubLogin(orgId, id, login);
    }
    async deleteRepository(orgId, id) {
        return this._starsRepository.deleteRepository(orgId, id);
    }
    async predictTrending(max = 500) {
        const firstDate = (0, dayjs_1.default)().subtract(1, 'day');
        return [
            firstDate.format('YYYY-MM-DDT12:00:00'),
            ...[...new Array(max)].map((p, index) => {
                return firstDate.add(index, 'day').format('YYYY-MM-DDT12:00:00');
            })
        ];
    }
    async predictTrendingLoop(trendings, current = 0, max = 500) {
        const dates = trendings.map((result) => (0, dayjs_1.default)(result.date).toDate());
        const intervals = dates
            .slice(1)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            .map((date, i) => (date - dates[i]) / (1000 * 60 * 60 * 24));
        const nextInterval = intervals.length === 0 ? null : (0, simple_statistics_1.mean)(intervals);
        const lastTrendingDate = dates[dates.length - 1];
        const nextTrendingDate = !nextInterval
            ? false
            : (0, dayjs_1.default)(new Date(lastTrendingDate.getTime() + nextInterval * 24 * 60 * 60 * 1000)).toDate();
        if (!nextTrendingDate) {
            return [];
        }
        return [
            nextTrendingDate,
            ...(current < max
                ? await this.predictTrendingLoop([...trendings, { date: nextTrendingDate }], current + 1, max)
                : []),
        ];
    }
};
exports.StarsService = StarsService;
exports.StarsService = StarsService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof stars_repository_1.StarsRepository !== "undefined" && stars_repository_1.StarsRepository) === "function" ? _a : Object, typeof (_b = typeof notification_service_1.NotificationService !== "undefined" && notification_service_1.NotificationService) === "function" ? _b : Object, typeof (_c = typeof client_1.BullMqClient !== "undefined" && client_1.BullMqClient) === "function" ? _c : Object])
], StarsService);


/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StarsRepository = void 0;
const tslib_1 = __webpack_require__(3);
const prisma_service_1 = __webpack_require__(10);
const common_1 = __webpack_require__(4);
let StarsRepository = class StarsRepository {
    constructor(_github, _stars, _trending) {
        this._github = _github;
        this._stars = _stars;
        this._trending = _trending;
    }
    getGitHubRepositoriesByOrgId(org) {
        return this._github.model.gitHub.findMany({
            where: {
                organizationId: org,
            },
        });
    }
    replaceOrAddTrending(language, hashedNames, arr) {
        return this._trending.model.trending.upsert({
            create: {
                language,
                hash: hashedNames,
                trendingList: JSON.stringify(arr),
                date: new Date(),
            },
            update: {
                language,
                hash: hashedNames,
                trendingList: JSON.stringify(arr),
                date: new Date(),
            },
            where: {
                language,
            },
        });
    }
    getAllGitHubRepositories() {
        return this._github.model.gitHub.findMany({
            distinct: ['login'],
        });
    }
    async getLastStarsByLogin(login) {
        return (await this._stars.model.star.findMany({
            where: {
                login,
            },
            orderBy: {
                date: 'desc',
            },
            take: 1,
        }))?.[0];
    }
    async getStarsByLogin(login) {
        return this._stars.model.star.findMany({
            where: {
                login,
            },
            orderBy: {
                date: 'asc',
            },
        });
    }
    async getGitHubsByNames(names) {
        return this._github.model.gitHub.findMany({
            where: {
                login: {
                    in: names,
                },
            },
        });
    }
    findValidToken(login) {
        return this._github.model.gitHub.findFirst({
            where: {
                login,
            },
        });
    }
    createStars(login, totalNewsStars, totalStars, totalNewForks, totalForks, date) {
        return this._stars.model.star.upsert({
            create: {
                login,
                stars: totalNewsStars,
                forks: totalNewForks,
                totalForks,
                totalStars,
                date,
            },
            update: {
                stars: totalNewsStars,
                totalStars,
                forks: totalNewForks,
                totalForks,
            },
            where: {
                login_date: {
                    date,
                    login,
                },
            },
        });
    }
    getTrendingByLanguage(language) {
        return this._trending.model.trending.findUnique({
            where: {
                language,
            },
        });
    }
    getStarsFilter(githubs, starsFilter) {
        return this._stars.model.star.findMany({
            orderBy: {
                [starsFilter.key || 'date']: starsFilter.state || 'desc',
            },
            where: {
                login: {
                    in: githubs.filter((f) => f),
                },
            },
            take: 20,
            skip: (starsFilter.page - 1) * 10,
        });
    }
    addGitHub(orgId, accessToken) {
        return this._github.model.gitHub.create({
            data: {
                token: accessToken,
                organizationId: orgId,
                jobId: '',
            },
        });
    }
    getGitHubById(orgId, id) {
        return this._github.model.gitHub.findUnique({
            where: {
                organizationId: orgId,
                id,
            },
        });
    }
    updateGitHubLogin(orgId, id, login) {
        return this._github.model.gitHub.update({
            where: {
                organizationId: orgId,
                id,
            },
            data: {
                login,
            },
        });
    }
    deleteRepository(orgId, id) {
        return this._github.model.gitHub.delete({
            where: {
                organizationId: orgId,
                id,
            },
        });
    }
    getOrganizationsByGitHubLogin(login) {
        return this._github.model.gitHub.findMany({
            select: {
                organizationId: true,
            },
            where: {
                login,
            },
            distinct: ['organizationId'],
        });
    }
};
exports.StarsRepository = StarsRepository;
exports.StarsRepository = StarsRepository = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _a : Object, typeof (_b = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _b : Object, typeof (_c = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _c : Object])
], StarsRepository);


/***/ }),
/* 10 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PrismaRepository = exports.PrismaService = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const client_1 = __webpack_require__(11);
let PrismaService = class PrismaService extends client_1.PrismaClient {
    constructor() {
        super({
            log: [
                {
                    emit: 'event',
                    level: 'query',
                },
            ],
        });
    }
    async onModuleInit() {
        await this.$connect();
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [])
], PrismaService);
let PrismaRepository = class PrismaRepository {
    constructor(_prismaService) {
        this._prismaService = _prismaService;
        this.model = this._prismaService;
    }
};
exports.PrismaRepository = PrismaRepository;
exports.PrismaRepository = PrismaRepository = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [PrismaService])
], PrismaRepository);


/***/ }),
/* 11 */
/***/ ((module) => {

module.exports = require("@prisma/client");

/***/ }),
/* 12 */
/***/ ((module) => {

module.exports = require("lodash");

/***/ }),
/* 13 */
/***/ ((module) => {

module.exports = require("dayjs");

/***/ }),
/* 14 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NotificationService = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const notifications_repository_1 = __webpack_require__(15);
const email_service_1 = __webpack_require__(16);
const organization_repository_1 = __webpack_require__(22);
let NotificationService = class NotificationService {
    constructor(_notificationRepository, _emailService, _organizationRepository) {
        this._notificationRepository = _notificationRepository;
        this._emailService = _emailService;
        this._organizationRepository = _organizationRepository;
    }
    getMainPageCount(organizationId, userId) {
        return this._notificationRepository.getMainPageCount(organizationId, userId);
    }
    getNotifications(organizationId, userId) {
        return this._notificationRepository.getNotifications(organizationId, userId);
    }
    async inAppNotification(orgId, subject, message, sendEmail = false) {
        await this._notificationRepository.createNotification(orgId, message);
        if (!sendEmail) {
            return;
        }
        const userOrg = await this._organizationRepository.getAllUsersOrgs(orgId);
        for (const user of userOrg?.users || []) {
            await this.sendEmail(user.user.email, subject, message);
        }
    }
    async sendEmail(to, subject, html, replyTo) {
        await this._emailService.sendEmail(to, subject, html, replyTo);
    }
    hasEmailProvider() {
        return this._emailService.hasProvider();
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof notifications_repository_1.NotificationsRepository !== "undefined" && notifications_repository_1.NotificationsRepository) === "function" ? _a : Object, typeof (_b = typeof email_service_1.EmailService !== "undefined" && email_service_1.EmailService) === "function" ? _b : Object, typeof (_c = typeof organization_repository_1.OrganizationRepository !== "undefined" && organization_repository_1.OrganizationRepository) === "function" ? _c : Object])
], NotificationService);


/***/ }),
/* 15 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NotificationsRepository = void 0;
const tslib_1 = __webpack_require__(3);
const prisma_service_1 = __webpack_require__(10);
const common_1 = __webpack_require__(4);
let NotificationsRepository = class NotificationsRepository {
    constructor(_notifications, _user) {
        this._notifications = _notifications;
        this._user = _user;
    }
    getLastReadNotification(userId) {
        return this._user.model.user.findFirst({
            where: {
                id: userId,
            },
            select: {
                lastReadNotifications: true,
            },
        });
    }
    async getMainPageCount(organizationId, userId) {
        const { lastReadNotifications } = (await this.getLastReadNotification(userId));
        return {
            total: await this._notifications.model.notifications.count({
                where: {
                    organizationId,
                    createdAt: {
                        gt: lastReadNotifications,
                    },
                },
            }),
        };
    }
    async createNotification(organizationId, content) {
        await this._notifications.model.notifications.create({
            data: {
                organizationId,
                content,
            },
        });
    }
    async getNotifications(organizationId, userId) {
        const { lastReadNotifications } = (await this.getLastReadNotification(userId));
        await this._user.model.user.update({
            where: {
                id: userId,
            },
            data: {
                lastReadNotifications: new Date(),
            },
        });
        return {
            lastReadNotifications,
            notifications: await this._notifications.model.notifications.findMany({
                orderBy: {
                    createdAt: 'desc',
                },
                take: 10,
                where: {
                    organizationId,
                },
                select: {
                    createdAt: true,
                    content: true,
                },
            }),
        };
    }
};
exports.NotificationsRepository = NotificationsRepository;
exports.NotificationsRepository = NotificationsRepository = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _a : Object, typeof (_b = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _b : Object])
], NotificationsRepository);


/***/ }),
/* 16 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EmailService = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const resend_provider_1 = __webpack_require__(17);
const empty_provider_1 = __webpack_require__(19);
const node_mailer_provider_1 = __webpack_require__(20);
let EmailService = class EmailService {
    constructor() {
        this.emailService = this.selectProvider(process.env.EMAIL_PROVIDER);
        console.log('Email service provider:', this.emailService.name);
        for (const key of this.emailService.validateEnvKeys) {
            if (!process.env[key]) {
                console.error(`Missing environment variable: ${key}`);
            }
        }
    }
    hasProvider() {
        return !(this.emailService instanceof empty_provider_1.EmptyProvider);
    }
    selectProvider(provider) {
        switch (provider) {
            case 'resend':
                return new resend_provider_1.ResendProvider();
            case 'nodemailer':
                return new node_mailer_provider_1.NodeMailerProvider();
            default:
                return new empty_provider_1.EmptyProvider();
        }
    }
    async sendEmail(to, subject, html, replyTo) {
        if (to.indexOf('@') === -1) {
            return;
        }
        if (!process.env.EMAIL_FROM_ADDRESS || !process.env.EMAIL_FROM_NAME) {
            console.log('Email sender information not found in environment variables');
            return;
        }
        const modifiedHtml = `
    <div style="
        background: linear-gradient(to bottom right, #e6f2ff, #f0e6ff);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
    ">
        <div style="
            background-color: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(4px);
            border-radius: 0.5rem;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            max-width: 48rem;
            width: 100%;
            padding: 2rem;
        ">
            <h1 style="
                font-size: 1.875rem;
                font-weight: bold;
                margin-bottom: 1.5rem;
                text-align: left;
                color: #1f2937;
            ">${subject}</h1>
            
            <div style="
                margin-bottom: 2rem;
                color: #374151;
            ">
                ${html}
            </div>
            
            <div style="
                display: flex;
                align-items: center;
                border-top: 1px solid #e5e7eb;
                padding-top: 1.5rem;
            ">
                <div>
                    <h2 style="
                        font-size: 1.25rem;
                        font-weight: 600;
                        color: #1f2937;
                        margin: 0;
                    ">${process.env.EMAIL_FROM_NAME}</h2>
                </div>
            </div>
        </div>
    </div>
    `;
        const sends = await this.emailService.sendEmail(to, subject, modifiedHtml, process.env.EMAIL_FROM_NAME, process.env.EMAIL_FROM_ADDRESS, replyTo);
        console.log(sends);
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [])
], EmailService);


/***/ }),
/* 17 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ResendProvider = void 0;
const resend_1 = __webpack_require__(18);
const resend = new resend_1.Resend(process.env.RESEND_API_KEY || 're_132');
class ResendProvider {
    constructor() {
        this.name = 'resend';
        this.validateEnvKeys = ['RESEND_API_KEY'];
    }
    async sendEmail(to, subject, html, emailFromName, emailFromAddress, replyTo) {
        const sends = await resend.emails.send({
            from: `${emailFromName} <${emailFromAddress}>`,
            to,
            subject,
            html,
            ...(replyTo && { reply_to: replyTo }),
        });
        return sends;
    }
}
exports.ResendProvider = ResendProvider;


/***/ }),
/* 18 */
/***/ ((module) => {

module.exports = require("resend");

/***/ }),
/* 19 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EmptyProvider = void 0;
class EmptyProvider {
    constructor() {
        this.name = 'no provider';
        this.validateEnvKeys = [];
    }
    async sendEmail(to, subject, html) {
        return `No email provider found, email was supposed to be sent to ${to} with subject: ${subject} and ${html}, html`;
    }
}
exports.EmptyProvider = EmptyProvider;


/***/ }),
/* 20 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NodeMailerProvider = void 0;
const tslib_1 = __webpack_require__(3);
const nodemailer_1 = tslib_1.__importDefault(__webpack_require__(21));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.EMAIL_HOST,
    port: +process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
class NodeMailerProvider {
    constructor() {
        this.name = 'nodemailer';
        this.validateEnvKeys = [
            'EMAIL_HOST',
            'EMAIL_PORT',
            'EMAIL_SECURE',
            'EMAIL_USER',
            'EMAIL_PASS',
        ];
    }
    async sendEmail(to, subject, html, emailFromName, emailFromAddress) {
        const sends = await transporter.sendMail({
            from: `${emailFromName} <${emailFromAddress}>`, // sender address
            to: to, // list of receivers
            subject: subject, // Subject line
            text: html, // plain text body
            html: html, // html body
        });
        return sends;
    }
}
exports.NodeMailerProvider = NodeMailerProvider;


/***/ }),
/* 21 */
/***/ ((module) => {

module.exports = require("nodemailer");

/***/ }),
/* 22 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OrganizationRepository = void 0;
const tslib_1 = __webpack_require__(3);
const prisma_service_1 = __webpack_require__(10);
const client_1 = __webpack_require__(11);
const common_1 = __webpack_require__(4);
const auth_service_1 = __webpack_require__(23);
const make_is_1 = __webpack_require__(27);
let OrganizationRepository = class OrganizationRepository {
    constructor(_organization, _userOrg, _user) {
        this._organization = _organization;
        this._userOrg = _userOrg;
        this._user = _user;
    }
    getOrgByApiKey(api) {
        return this._organization.model.organization.findFirst({
            where: {
                apiKey: api,
            },
            include: {
                subscription: {
                    select: {
                        subscriptionTier: true,
                        totalChannels: true,
                        isLifetime: true,
                    },
                },
            },
        });
    }
    getCount() {
        return this._organization.model.organization.count();
    }
    getUserOrg(id) {
        return this._userOrg.model.userOrganization.findFirst({
            where: {
                id,
            },
            select: {
                user: true,
                organization: {
                    include: {
                        users: {
                            select: {
                                id: true,
                                disabled: true,
                                role: true,
                                userId: true,
                            },
                        },
                        subscription: {
                            select: {
                                subscriptionTier: true,
                                totalChannels: true,
                                isLifetime: true,
                            },
                        },
                    },
                },
            },
        });
    }
    getImpersonateUser(name) {
        return this._userOrg.model.userOrganization.findMany({
            where: {
                user: {
                    OR: [
                        {
                            name: {
                                contains: name,
                            },
                        },
                        {
                            email: {
                                contains: name,
                            },
                        },
                        {
                            id: {
                                contains: name,
                            },
                        },
                    ],
                },
            },
            select: {
                id: true,
                organization: {
                    select: {
                        id: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    }
    updateApiKey(orgId) {
        return this._organization.model.organization.update({
            where: {
                id: orgId,
            },
            data: {
                apiKey: auth_service_1.AuthService.fixedEncryption((0, make_is_1.makeId)(20)),
            },
        });
    }
    async getOrgsByUserId(userId) {
        return this._organization.model.organization.findMany({
            where: {
                users: {
                    some: {
                        userId,
                    },
                },
            },
            include: {
                users: {
                    where: {
                        userId,
                    },
                    select: {
                        disabled: true,
                        role: true,
                    },
                },
                subscription: {
                    select: {
                        subscriptionTier: true,
                        totalChannels: true,
                        isLifetime: true,
                        createdAt: true,
                    },
                },
            },
        });
    }
    async getOrgById(id) {
        return this._organization.model.organization.findUnique({
            where: {
                id,
            },
        });
    }
    async addUserToOrg(userId, id, orgId, role) {
        const checkIfInviteExists = await this._user.model.user.findFirst({
            where: {
                inviteId: id,
            },
        });
        if (checkIfInviteExists) {
            return false;
        }
        const checkForSubscription = await this._organization.model.organization.findFirst({
            where: {
                id: orgId,
            },
            select: {
                subscription: true,
            },
        });
        if (process.env.STRIPE_PUBLISHABLE_KEY &&
            checkForSubscription?.subscription?.subscriptionTier ===
                client_1.SubscriptionTier.STANDARD) {
            return false;
        }
        const create = await this._userOrg.model.userOrganization.create({
            data: {
                role,
                userId,
                organizationId: orgId,
            },
        });
        await this._user.model.user.update({
            where: {
                id: userId,
            },
            data: {
                inviteId: id,
            },
        });
        return create;
    }
    async createOrgAndUser(body, hasEmail, ip, userAgent) {
        return this._organization.model.organization.create({
            data: {
                name: body.company,
                apiKey: auth_service_1.AuthService.fixedEncryption((0, make_is_1.makeId)(20)),
                allowTrial: true,
                users: {
                    create: {
                        role: client_1.Role.SUPERADMIN,
                        user: {
                            create: {
                                activated: body.provider !== 'LOCAL' || !hasEmail,
                                email: body.email,
                                password: body.password
                                    ? auth_service_1.AuthService.hashPassword(body.password)
                                    : '',
                                providerName: body.provider,
                                providerId: body.providerId || '',
                                timezone: 0,
                                ip,
                                agent: userAgent,
                            },
                        },
                    },
                },
            },
            select: {
                id: true,
                users: {
                    select: {
                        user: true,
                    },
                },
            },
        });
    }
    getOrgByCustomerId(customerId) {
        return this._organization.model.organization.findFirst({
            where: {
                paymentId: customerId,
            },
        });
    }
    async getTeam(orgId) {
        return this._organization.model.organization.findUnique({
            where: {
                id: orgId,
            },
            select: {
                users: {
                    select: {
                        role: true,
                        user: {
                            select: {
                                email: true,
                                id: true,
                            },
                        },
                    },
                },
            },
        });
    }
    getAllUsersOrgs(orgId) {
        return this._organization.model.organization.findUnique({
            where: {
                id: orgId,
            },
            select: {
                users: {
                    select: {
                        user: {
                            select: {
                                email: true,
                                id: true,
                            },
                        },
                    },
                },
            },
        });
    }
    async deleteTeamMember(orgId, userId) {
        return this._userOrg.model.userOrganization.delete({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId: orgId,
                },
            },
        });
    }
    disableOrEnableNonSuperAdminUsers(orgId, disable) {
        return this._userOrg.model.userOrganization.updateMany({
            where: {
                organizationId: orgId,
                role: {
                    not: client_1.Role.SUPERADMIN,
                },
            },
            data: {
                disabled: disable,
            },
        });
    }
};
exports.OrganizationRepository = OrganizationRepository;
exports.OrganizationRepository = OrganizationRepository = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _a : Object, typeof (_b = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _b : Object, typeof (_c = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _c : Object])
], OrganizationRepository);


/***/ }),
/* 23 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthService = void 0;
const tslib_1 = __webpack_require__(3);
const jsonwebtoken_1 = __webpack_require__(24);
const bcrypt_1 = __webpack_require__(25);
const crypto_1 = tslib_1.__importDefault(__webpack_require__(26));
class AuthService {
    static hashPassword(password) {
        return (0, bcrypt_1.hashSync)(password, 10);
    }
    static comparePassword(password, hash) {
        return (0, bcrypt_1.compareSync)(password, hash);
    }
    static signJWT(value) {
        return (0, jsonwebtoken_1.sign)(value, process.env.JWT_SECRET);
    }
    static verifyJWT(token) {
        return (0, jsonwebtoken_1.verify)(token, process.env.JWT_SECRET);
    }
    static fixedEncryption(value) {
        // encryption algorithm
        const algorithm = 'aes-256-cbc';
        // create a cipher object
        const cipher = crypto_1.default.createCipher(algorithm, process.env.JWT_SECRET);
        // encrypt the plain text
        let encrypted = cipher.update(value, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }
    static fixedDecryption(hash) {
        const algorithm = 'aes-256-cbc';
        const decipher = crypto_1.default.createDecipher(algorithm, process.env.JWT_SECRET);
        // decrypt the encrypted text
        let decrypted = decipher.update(hash, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
exports.AuthService = AuthService;


/***/ }),
/* 24 */
/***/ ((module) => {

module.exports = require("jsonwebtoken");

/***/ }),
/* 25 */
/***/ ((module) => {

module.exports = require("bcrypt");

/***/ }),
/* 26 */
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),
/* 27 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.makeId = void 0;
const makeId = (length) => {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i += 1) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};
exports.makeId = makeId;


/***/ }),
/* 28 */
/***/ ((module) => {

module.exports = require("simple-statistics");

/***/ }),
/* 29 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BullMqClient = void 0;
const tslib_1 = __webpack_require__(3);
const microservices_1 = __webpack_require__(6);
const bullmq_1 = __webpack_require__(30);
const redis_service_1 = __webpack_require__(31);
const uuid_1 = __webpack_require__(33);
const common_1 = __webpack_require__(4);
let BullMqClient = class BullMqClient extends microservices_1.ClientProxy {
    constructor() {
        super(...arguments);
        this.queues = new Map();
        this.queueEvents = new Map();
    }
    async connect() {
        return;
    }
    async close() {
        return;
    }
    publish(packet, callback) {
        // console.log('hello');
        // this.publishAsync(packet, callback);
        return () => console.log('sent');
    }
    delete(pattern, jobId) {
        const queue = this.getQueue(pattern);
        return queue.remove(jobId);
    }
    async publishAsync(packet, callback) {
        const queue = this.getQueue(packet.pattern);
        const queueEvents = this.getQueueEvents(packet.pattern);
        const job = await queue.add(packet.pattern, packet.data, {
            jobId: packet.data.id ?? (0, uuid_1.v4)(),
            ...packet.data.options,
            removeOnComplete: !packet.data.options.attempts,
            removeOnFail: !packet.data.options.attempts,
        });
        try {
            await job.waitUntilFinished(queueEvents);
            console.log('success');
            callback({ response: job.returnvalue, isDisposed: true });
        }
        catch (err) {
            console.log('err');
            callback({ err, isDisposed: true });
        }
    }
    getQueueEvents(pattern) {
        return (this.queueEvents.get(pattern) ||
            new bullmq_1.QueueEvents(pattern, {
                connection: redis_service_1.ioRedis,
            }));
    }
    getQueue(pattern) {
        return (this.queues.get(pattern) ||
            new bullmq_1.Queue(pattern, {
                connection: redis_service_1.ioRedis,
            }));
    }
    async dispatchEvent(packet) {
        console.log('event to dispatch: ', packet);
        const queue = this.getQueue(packet.pattern);
        await queue.add(packet.pattern, packet.data, {
            jobId: packet.data.id ?? (0, uuid_1.v4)(),
            ...packet.data.options,
            removeOnComplete: true,
            removeOnFail: true,
        });
    }
};
exports.BullMqClient = BullMqClient;
exports.BullMqClient = BullMqClient = tslib_1.__decorate([
    (0, common_1.Injectable)()
], BullMqClient);


/***/ }),
/* 30 */
/***/ ((module) => {

module.exports = require("bullmq");

/***/ }),
/* 31 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ioRedis = void 0;
const ioredis_1 = __webpack_require__(32);
exports.ioRedis = new ioredis_1.Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    connectTimeout: 10000
});


/***/ }),
/* 32 */
/***/ ((module) => {

module.exports = require("ioredis");

/***/ }),
/* 33 */
/***/ ((module) => {

module.exports = require("uuid");

/***/ }),
/* 34 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TrendingService = void 0;
const tslib_1 = __webpack_require__(3);
const trending_1 = tslib_1.__importDefault(__webpack_require__(35));
const common_1 = __webpack_require__(4);
const jsdom_1 = __webpack_require__(7);
const stars_service_1 = __webpack_require__(8);
const md5_1 = tslib_1.__importDefault(__webpack_require__(36));
let TrendingService = class TrendingService {
    constructor(_starsService) {
        this._starsService = _starsService;
    }
    async syncTrending() {
        for (const language of trending_1.default) {
            const data = await (await fetch(`https://github.com/trending/${language.link}`)).text();
            const dom = new jsdom_1.JSDOM(data);
            const trending = Array.from(dom.window.document.querySelectorAll('[class="Link"]'));
            const arr = trending.map((el, index) => {
                return {
                    name: el?.textContent?.trim().replace(/\s/g, '') || '',
                    position: index + 1,
                };
            });
            const hashedNames = (0, md5_1.default)(arr.map(p => p.name).join(''));
            console.log('Updating GitHub trending topic', language, hashedNames);
            await this._starsService.updateTrending(language.name, hashedNames, arr);
        }
    }
};
exports.TrendingService = TrendingService;
exports.TrendingService = TrendingService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof stars_service_1.StarsService !== "undefined" && stars_service_1.StarsService) === "function" ? _a : Object])
], TrendingService);


/***/ }),
/* 35 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports["default"] = [{ "link": "", "name": "" }, { "link": "1c-enterprise", "name": "1C Enterprise" }, { "link": "abap", "name": "ABAP" }, { "link": "actionscript", "name": "ActionScript" }, { "link": "adblock-filter-list", "name": "Adblock Filter List" }, { "link": "al", "name": "AL" }, { "link": "angelscript", "name": "AngelScript" }, { "link": "apacheconf", "name": "ApacheConf" }, { "link": "apex", "name": "Apex" }, { "link": "apl", "name": "APL" }, { "link": "applescript", "name": "AppleScript" }, { "link": "arc", "name": "Arc" }, { "link": "asl", "name": "ASL" }, { "link": "classic-asp", "name": "Classic ASP" }, { "link": "assembly", "name": "Assembly" }, { "link": "astro", "name": "Astro" }, { "link": "autohotkey", "name": "AutoHotkey" }, { "link": "autoit", "name": "AutoIt" }, { "link": "awk", "name": "Awk" }, { "link": "batchfile", "name": "Batchfile" }, { "link": "bicep", "name": "Bicep" }, { "link": "bikeshed", "name": "Bikeshed" }, { "link": "bitbake", "name": "BitBake" }, { "link": "blade", "name": "Blade" }, { "link": "boo", "name": "Boo" }, { "link": "brainfuck", "name": "Brainfuck" }, { "link": "brighterscript", "name": "BrighterScript" }, { "link": "c", "name": "C" }, { "link": "c%23", "name": "C#" }, { "link": "c++", "name": "C++" }, { "link": "cairo", "name": "Cairo" }, { "link": "cap'n-proto", "name": "Cap'n Proto" }, { "link": "cartocss", "name": "CartoCSS" }, { "link": "chapel", "name": "Chapel" }, { "link": "circom", "name": "Circom" }, { "link": "classic-asp", "name": "Classic ASP" }, { "link": "clojure", "name": "Clojure" }, { "link": "cmake", "name": "CMake" }, { "link": "codeql", "name": "CodeQL" }, { "link": "coffeescript", "name": "CoffeeScript" }, { "link": "common-lisp", "name": "Common Lisp" }, { "link": "component-pascal", "name": "Component Pascal" }, { "link": "crystal", "name": "Crystal" }, { "link": "css", "name": "CSS" }, { "link": "cuda", "name": "Cuda" }, { "link": "cue", "name": "CUE" }, { "link": "cython", "name": "Cython" }, { "link": "d", "name": "D" }, { "link": "dart", "name": "Dart" }, { "link": "denizenscript", "name": "DenizenScript" }, { "link": "digital-command-language", "name": "DIGITAL Command Language" }, { "link": "dm", "name": "DM" }, { "link": "dockerfile", "name": "Dockerfile" }, { "link": "earthly", "name": "Earthly" }, { "link": "ejs", "name": "EJS" }, { "link": "elixir", "name": "Elixir" }, { "link": "elm", "name": "Elm" }, { "link": "emacs-lisp", "name": "Emacs Lisp" }, { "link": "emberscript", "name": "EmberScript" }, { "link": "erlang", "name": "Erlang" }, { "link": "f%23", "name": "F#" }, { "link": "f*", "name": "F*" }, { "link": "fennel", "name": "Fennel" }, { "link": "fluent", "name": "Fluent" }, { "link": "forth", "name": "Forth" }, { "link": "fortran", "name": "Fortran" }, { "link": "freemarker", "name": "FreeMarker" }, { "link": "g-code", "name": "G-code" }, { "link": "gdscript", "name": "GDScript" }, { "link": "gherkin", "name": "Gherkin" }, { "link": "gleam", "name": "Gleam" }, { "link": "glsl", "name": "GLSL" }, { "link": "go", "name": "Go" }, { "link": "groovy", "name": "Groovy" }, { "link": "hack", "name": "Hack" }, { "link": "handlebars", "name": "Handlebars" }, { "link": "haskell", "name": "Haskell" }, { "link": "haxe", "name": "Haxe" }, { "link": "hcl", "name": "HCL" }, { "link": "hlsl", "name": "HLSL" }, { "link": "holyc", "name": "HolyC" }, { "link": "hoon", "name": "hoon" }, { "link": "hosts-file", "name": "Hosts File" }, { "link": "html", "name": "HTML" }, { "link": "idris", "name": "Idris" }, { "link": "inform-7", "name": "Inform 7" }, { "link": "inno-setup", "name": "Inno Setup" }, { "link": "io", "name": "Io" }, { "link": "java", "name": "Java" }, { "link": "javascript", "name": "JavaScript" }, { "link": "json", "name": "JSON" }, { "link": "jsonnet", "name": "Jsonnet" }, { "link": "julia", "name": "Julia" }, { "link": "jupyter-notebook", "name": "Jupyter Notebook" }, { "link": "just", "name": "Just" }, { "link": "kicad-layout", "name": "KiCad Layout" }, { "link": "kotlin", "name": "Kotlin" }, { "link": "labview", "name": "LabVIEW" }, { "link": "lean", "name": "Lean" }, { "link": "less", "name": "Less" }, { "link": "lfe", "name": "LFE" }, { "link": "liquid", "name": "Liquid" }, { "link": "llvm", "name": "LLVM" }, { "link": "logos", "name": "Logos" }, { "link": "lookml", "name": "LookML" }, { "link": "lua", "name": "Lua" }, { "link": "m4", "name": "M4" }, { "link": "makefile", "name": "Makefile" }, { "link": "markdown", "name": "Markdown" }, { "link": "mathematica", "name": "Mathematica" }, { "link": "matlab", "name": "MATLAB" }, { "link": "mcfunction", "name": "mcfunction" }, { "link": "mdx", "name": "MDX" }, { "link": "mermaid", "name": "Mermaid" }, { "link": "meson", "name": "Meson" }, { "link": "metal", "name": "Metal" }, { "link": "mlir", "name": "MLIR" }, { "link": "move", "name": "Move" }, { "link": "mustache", "name": "Mustache" }, { "link": "nasl", "name": "NASL" }, { "link": "nesc", "name": "nesC" }, { "link": "nextflow", "name": "Nextflow" }, { "link": "nim", "name": "Nim" }, { "link": "nix", "name": "Nix" }, { "link": "nsis", "name": "NSIS" }, { "link": "nunjucks", "name": "Nunjucks" }, { "link": "objective-c", "name": "Objective-C" }, { "link": "objective-c++", "name": "Objective-C++" }, { "link": "ocaml", "name": "OCaml" }, { "link": "odin", "name": "Odin" }, { "link": "open-policy-agent", "name": "Open Policy Agent" }, { "link": "openscad", "name": "OpenSCAD" }, { "link": "papyrus", "name": "Papyrus" }, { "link": "pascal", "name": "Pascal" }, { "link": "perl", "name": "Perl" }, { "link": "php", "name": "PHP" }, { "link": "plpgsql", "name": "PLpgSQL" }, { "link": "plsql", "name": "PLSQL" }, { "link": "pony", "name": "Pony" }, { "link": "postscript", "name": "PostScript" }, { "link": "powershell", "name": "PowerShell" }, { "link": "processing", "name": "Processing" }, { "link": "prolog", "name": "Prolog" }, { "link": "pug", "name": "Pug" }, { "link": "puppet", "name": "Puppet" }, { "link": "purebasic", "name": "PureBasic" }, { "link": "purescript", "name": "PureScript" }, { "link": "python", "name": "Python" }, { "link": "qml", "name": "QML" }, { "link": "r", "name": "R" }, { "link": "racket", "name": "Racket" }, { "link": "raku", "name": "Raku" }, { "link": "raml", "name": "RAML" }, { "link": "ren'py", "name": "Ren'Py" }, { "link": "rescript", "name": "ReScript" }, { "link": "restructuredtext", "name": "reStructuredText" }, { "link": "rich-text-format", "name": "Rich Text Format" }, { "link": "robotframework", "name": "RobotFramework" }, { "link": "roff", "name": "Roff" }, { "link": "routeros-script", "name": "RouterOS Script" }, { "link": "rpm-spec", "name": "RPM Spec" }, { "link": "ruby", "name": "Ruby" }, { "link": "rust", "name": "Rust" }, { "link": "sass", "name": "Sass" }, { "link": "scala", "name": "Scala" }, { "link": "scheme", "name": "Scheme" }, { "link": "scss", "name": "SCSS" }, { "link": "shaderlab", "name": "ShaderLab" }, { "link": "shell", "name": "Shell" }, { "link": "smali", "name": "Smali" }, { "link": "smalltalk", "name": "Smalltalk" }, { "link": "smarty", "name": "Smarty" }, { "link": "solidity", "name": "Solidity" }, { "link": "sqf", "name": "SQF" }, { "link": "sql", "name": "SQL" }, { "link": "squirrel", "name": "Squirrel" }, { "link": "standard-ml", "name": "Standard ML" }, { "link": "starlark", "name": "Starlark" }, { "link": "stylus", "name": "Stylus" }, { "link": "supercollider", "name": "SuperCollider" }, { "link": "svelte", "name": "Svelte" }, { "link": "svg", "name": "SVG" }, { "link": "swift", "name": "Swift" }, { "link": "swig", "name": "SWIG" }, { "link": "systemverilog", "name": "SystemVerilog" }, { "link": "tcl", "name": "Tcl" }, { "link": "tex", "name": "TeX" }, { "link": "text", "name": "Text" }, { "link": "thrift", "name": "Thrift" }, { "link": "tsql", "name": "TSQL" }, { "link": "twig", "name": "Twig" }, { "link": "typescript", "name": "TypeScript" }, { "link": "typst", "name": "Typst" }, { "link": "unrealscript", "name": "UnrealScript" }, { "link": "v", "name": "V" }, { "link": "vala", "name": "Vala" }, { "link": "vbscript", "name": "VBScript" }, { "link": "verilog", "name": "Verilog" }, { "link": "vhdl", "name": "VHDL" }, { "link": "vim-script", "name": "Vim Script" }, { "link": "vim-snippet", "name": "Vim Snippet" }, { "link": "visual-basic-.net", "name": "Visual Basic .NET" }, { "link": "visual-basic-.net", "name": "Visual Basic .NET" }, { "link": "vue", "name": "Vue" }, { "link": "webassembly", "name": "WebAssembly" }, { "link": "wgsl", "name": "WGSL" }, { "link": "witcher-script", "name": "Witcher Script" }, { "link": "xc", "name": "XC" }, { "link": "xslt", "name": "XSLT" }, { "link": "yacc", "name": "Yacc" }, { "link": "yaml", "name": "YAML" }, { "link": "yara", "name": "YARA" }, { "link": "zap", "name": "ZAP" }, { "link": "zenscript", "name": "ZenScript" }, { "link": "zig", "name": "Zig" }];


/***/ }),
/* 36 */
/***/ ((module) => {

module.exports = require("md5");

/***/ }),
/* 37 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DatabaseModule = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const prisma_service_1 = __webpack_require__(10);
const organization_repository_1 = __webpack_require__(22);
const organization_service_1 = __webpack_require__(38);
const users_service_1 = __webpack_require__(39);
const users_repository_1 = __webpack_require__(40);
const stars_service_1 = __webpack_require__(8);
const stars_repository_1 = __webpack_require__(9);
const subscription_service_1 = __webpack_require__(42);
const subscription_repository_1 = __webpack_require__(44);
const notification_service_1 = __webpack_require__(14);
const integration_service_1 = __webpack_require__(45);
const integration_repository_1 = __webpack_require__(46);
const posts_service_1 = __webpack_require__(105);
const posts_repository_1 = __webpack_require__(106);
const integration_manager_1 = __webpack_require__(58);
const media_service_1 = __webpack_require__(116);
const media_repository_1 = __webpack_require__(117);
const notifications_repository_1 = __webpack_require__(15);
const email_service_1 = __webpack_require__(16);
const item_user_repository_1 = __webpack_require__(125);
const item_user_service_1 = __webpack_require__(126);
const messages_service_1 = __webpack_require__(109);
const messages_repository_1 = __webpack_require__(110);
const stripe_service_1 = __webpack_require__(111);
const extract_content_service_1 = __webpack_require__(127);
const openai_service_1 = __webpack_require__(118);
const agencies_service_1 = __webpack_require__(128);
const agencies_repository_1 = __webpack_require__(129);
const track_service_1 = __webpack_require__(113);
const social_media_platform_config_service_1 = __webpack_require__(94);
const social_media_platform_config_repository_1 = __webpack_require__(95);
const customers_repository_1 = __webpack_require__(100);
const customers_service_1 = __webpack_require__(130);
const short_link_service_1 = __webpack_require__(122);
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = tslib_1.__decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [],
        controllers: [],
        providers: [
            prisma_service_1.PrismaService,
            prisma_service_1.PrismaRepository,
            users_service_1.UsersService,
            users_repository_1.UsersRepository,
            organization_service_1.OrganizationService,
            organization_repository_1.OrganizationRepository,
            stars_service_1.StarsService,
            stars_repository_1.StarsRepository,
            subscription_service_1.SubscriptionService,
            subscription_repository_1.SubscriptionRepository,
            notification_service_1.NotificationService,
            notifications_repository_1.NotificationsRepository,
            integration_service_1.IntegrationService,
            integration_repository_1.IntegrationRepository,
            posts_service_1.PostsService,
            posts_repository_1.PostsRepository,
            stripe_service_1.StripeService,
            messages_repository_1.MessagesRepository,
            media_service_1.MediaService,
            media_repository_1.MediaRepository,
            item_user_repository_1.ItemUserRepository,
            agencies_service_1.AgenciesService,
            agencies_repository_1.AgenciesRepository,
            item_user_service_1.ItemUserService,
            messages_service_1.MessagesService,
            integration_manager_1.IntegrationManager,
            extract_content_service_1.ExtractContentService,
            openai_service_1.OpenaiService,
            email_service_1.EmailService,
            track_service_1.TrackService,
            social_media_platform_config_repository_1.SocialMediaPlatformConfigRepository,
            social_media_platform_config_service_1.SocialMediaPlatformConfigService,
            customers_repository_1.CustomersRepository,
            customers_service_1.CustomersService,
            short_link_service_1.ShortLinkService,
        ],
        get exports() {
            return this.providers;
        },
    })
], DatabaseModule);


/***/ }),
/* 38 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OrganizationService = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const organization_repository_1 = __webpack_require__(22);
const notification_service_1 = __webpack_require__(14);
const auth_service_1 = __webpack_require__(23);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
const make_is_1 = __webpack_require__(27);
let OrganizationService = class OrganizationService {
    constructor(_organizationRepository, _notificationsService) {
        this._organizationRepository = _organizationRepository;
        this._notificationsService = _notificationsService;
    }
    async createOrgAndUser(body, ip, userAgent) {
        return this._organizationRepository.createOrgAndUser(body, this._notificationsService.hasEmailProvider(), ip, userAgent);
    }
    async getCount() {
        return this._organizationRepository.getCount();
    }
    addUserToOrg(userId, id, orgId, role) {
        return this._organizationRepository.addUserToOrg(userId, id, orgId, role);
    }
    getOrgById(id) {
        return this._organizationRepository.getOrgById(id);
    }
    getOrgByApiKey(api) {
        return this._organizationRepository.getOrgByApiKey(api);
    }
    getUserOrg(id) {
        return this._organizationRepository.getUserOrg(id);
    }
    getOrgsByUserId(userId) {
        return this._organizationRepository.getOrgsByUserId(userId);
    }
    updateApiKey(orgId) {
        return this._organizationRepository.updateApiKey(orgId);
    }
    getTeam(orgId) {
        return this._organizationRepository.getTeam(orgId);
    }
    getOrgByCustomerId(customerId) {
        return this._organizationRepository.getOrgByCustomerId(customerId);
    }
    async inviteTeamMember(orgId, body) {
        const timeLimit = (0, dayjs_1.default)().add(1, 'hour').format('YYYY-MM-DD HH:mm:ss');
        const id = (0, make_is_1.makeId)(5);
        const url = process.env.FRONTEND_URL +
            `/?org=${auth_service_1.AuthService.signJWT({ ...body, orgId, timeLimit, id })}`;
        if (body.sendEmail) {
            await this._notificationsService.sendEmail(body.email, 'You have been invited to join an organization', `You have been invited to join an organization. Click <a href="${url}">here</a> to join.<br />The link will expire in 1 hour.`);
        }
        return { url };
    }
    async deleteTeamMember(org, userId) {
        const userOrgs = await this._organizationRepository.getOrgsByUserId(userId);
        const findOrgToDelete = userOrgs.find((orgUser) => orgUser.id === org.id);
        if (!findOrgToDelete) {
            throw new Error('User is not part of this organization');
        }
        // @ts-ignore
        const myRole = org.users[0].role;
        const userRole = findOrgToDelete.users[0].role;
        const myLevel = myRole === 'USER' ? 0 : myRole === 'ADMIN' ? 1 : 2;
        const userLevel = userRole === 'USER' ? 0 : userRole === 'ADMIN' ? 1 : 2;
        if (myLevel < userLevel) {
            throw new Error('You do not have permission to delete this user');
        }
        return this._organizationRepository.deleteTeamMember(org.id, userId);
    }
    disableOrEnableNonSuperAdminUsers(orgId, disable) {
        return this._organizationRepository.disableOrEnableNonSuperAdminUsers(orgId, disable);
    }
};
exports.OrganizationService = OrganizationService;
exports.OrganizationService = OrganizationService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof organization_repository_1.OrganizationRepository !== "undefined" && organization_repository_1.OrganizationRepository) === "function" ? _a : Object, typeof (_b = typeof notification_service_1.NotificationService !== "undefined" && notification_service_1.NotificationService) === "function" ? _b : Object])
], OrganizationService);


/***/ }),
/* 39 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UsersService = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const users_repository_1 = __webpack_require__(40);
const organization_repository_1 = __webpack_require__(22);
let UsersService = class UsersService {
    constructor(_usersRepository, _organizationRepository) {
        this._usersRepository = _usersRepository;
        this._organizationRepository = _organizationRepository;
    }
    getUserByEmail(email) {
        return this._usersRepository.getUserByEmail(email);
    }
    getUserById(id) {
        return this._usersRepository.getUserById(id);
    }
    getImpersonateUser(name) {
        return this._organizationRepository.getImpersonateUser(name);
    }
    getUserByProvider(providerId, provider) {
        return this._usersRepository.getUserByProvider(providerId, provider);
    }
    activateUser(id) {
        return this._usersRepository.activateUser(id);
    }
    updatePassword(id, password) {
        return this._usersRepository.updatePassword(id, password);
    }
    changeAudienceSize(userId, audience) {
        return this._usersRepository.changeAudienceSize(userId, audience);
    }
    changeMarketplaceActive(userId, active) {
        return this._usersRepository.changeMarketplaceActive(userId, active);
    }
    getMarketplacePeople(orgId, userId, body) {
        return this._usersRepository.getMarketplacePeople(orgId, userId, body);
    }
    getPersonal(userId) {
        return this._usersRepository.getPersonal(userId);
    }
    changePersonal(userId, body) {
        return this._usersRepository.changePersonal(userId, body);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof users_repository_1.UsersRepository !== "undefined" && users_repository_1.UsersRepository) === "function" ? _a : Object, typeof (_b = typeof organization_repository_1.OrganizationRepository !== "undefined" && organization_repository_1.OrganizationRepository) === "function" ? _b : Object])
], UsersService);


/***/ }),
/* 40 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UsersRepository = void 0;
const tslib_1 = __webpack_require__(3);
const prisma_service_1 = __webpack_require__(10);
const common_1 = __webpack_require__(4);
const client_1 = __webpack_require__(11);
const auth_service_1 = __webpack_require__(23);
const tags_list_1 = __webpack_require__(41);
let UsersRepository = class UsersRepository {
    constructor(_user) {
        this._user = _user;
    }
    getImpersonateUser(name) {
        return this._user.model.user.findMany({
            where: {
                OR: [
                    {
                        name: {
                            contains: name,
                        },
                    },
                    {
                        email: {
                            contains: name,
                        },
                    },
                    {
                        id: {
                            contains: name,
                        },
                    },
                ],
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
            take: 10,
        });
    }
    getUserById(id) {
        return this._user.model.user.findFirst({
            where: {
                id,
            },
        });
    }
    getUserByEmail(email) {
        return this._user.model.user.findFirst({
            where: {
                email,
                providerName: client_1.Provider.LOCAL,
            },
            include: {
                picture: {
                    select: {
                        id: true,
                        path: true,
                    },
                },
            },
        });
    }
    activateUser(id) {
        return this._user.model.user.update({
            where: {
                id,
            },
            data: {
                activated: true,
            },
        });
    }
    getUserByProvider(providerId, provider) {
        return this._user.model.user.findFirst({
            where: {
                providerId,
                providerName: provider,
            },
        });
    }
    updatePassword(id, password) {
        return this._user.model.user.update({
            where: {
                id,
                providerName: client_1.Provider.LOCAL,
            },
            data: {
                password: auth_service_1.AuthService.hashPassword(password),
            },
        });
    }
    changeAudienceSize(userId, audience) {
        return this._user.model.user.update({
            where: {
                id: userId,
            },
            data: {
                audience,
            },
        });
    }
    changeMarketplaceActive(userId, active) {
        return this._user.model.user.update({
            where: {
                id: userId,
            },
            data: {
                marketplace: active,
            },
        });
    }
    async getPersonal(userId) {
        const user = await this._user.model.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                id: true,
                name: true,
                bio: true,
                picture: {
                    select: {
                        id: true,
                        path: true,
                    },
                },
            },
        });
        return user;
    }
    async changePersonal(userId, body) {
        await this._user.model.user.update({
            where: {
                id: userId,
            },
            data: {
                name: body.fullname,
                bio: body.bio,
                picture: body.picture
                    ? {
                        connect: {
                            id: body.picture.id,
                        },
                    }
                    : {
                        disconnect: true,
                    },
            },
        });
    }
    async getMarketplacePeople(orgId, userId, items) {
        const info = {
            id: {
                not: userId,
            },
            account: {
                not: null,
            },
            connectedAccount: true,
            marketplace: true,
            items: {
                ...(items.items.length
                    ? {
                        some: {
                            OR: items.items.map((key) => ({ key })),
                        },
                    }
                    : {
                        some: {
                            OR: tags_list_1.allTagsOptions.map((p) => ({ key: p.key })),
                        },
                    }),
            },
        };
        const list = await this._user.model.user.findMany({
            where: {
                ...info,
            },
            select: {
                id: true,
                name: true,
                bio: true,
                audience: true,
                picture: {
                    select: {
                        id: true,
                        path: true,
                    },
                },
                organizations: {
                    select: {
                        organization: {
                            select: {
                                Integration: {
                                    where: {
                                        disabled: false,
                                        deletedAt: null,
                                    },
                                    select: {
                                        providerIdentifier: true,
                                    },
                                },
                            },
                        },
                    },
                },
                items: {
                    select: {
                        key: true,
                    },
                },
            },
            skip: (items.page - 1) * 8,
            take: 8,
        });
        const count = await this._user.model.user.count({
            where: {
                ...info,
            },
        });
        return {
            list,
            count,
        };
    }
};
exports.UsersRepository = UsersRepository;
exports.UsersRepository = UsersRepository = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _a : Object])
], UsersRepository);


/***/ }),
/* 41 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.allTagsOptions = exports.tagsList = void 0;
exports.tagsList = process.env.isGeneral === 'true'
    ? [
        {
            key: 'services',
            name: 'Niches',
            options: [
                { key: 'real-estate', value: 'Real Estate' },
                { key: 'fashion', value: 'Fashion' },
                { key: 'health-and-fitness', value: 'Health and Fitness' },
                { key: 'beauty', value: 'Beauty' },
                { key: 'travel', value: 'Travel' },
                { key: 'food', value: 'Food' },
                { key: 'tech', value: 'Tech' },
                { key: 'gaming', value: 'Gaming' },
                { key: 'parenting', value: 'Parenting' },
                { key: 'education', value: 'Education' },
                { key: 'business', value: 'Business' },
                { key: 'finance', value: 'Finance' },
                { key: 'diy', value: 'DIY' },
                { key: 'pets', value: 'Pets' },
                { key: 'lifestyle', value: 'Lifestyle' },
                { key: 'sports', value: 'Sports' },
                { key: 'entertainment', value: 'Entertainment' },
                { key: 'art', value: 'Art' },
                { key: 'photography', value: 'Photography' },
                { key: 'sustainability', value: 'Sustainability' },
            ],
        },
    ]
    : [
        {
            key: 'services',
            name: 'Services',
            options: [
                {
                    key: 'content-writer',
                    value: 'Content Writer',
                },
                {
                    key: 'influencers',
                    value: 'Influencers',
                },
            ],
        },
        {
            key: 'niches',
            name: 'Niches',
            options: [
                {
                    key: 'kubernetes',
                    value: 'Kubernetes',
                },
                {
                    key: 'fullstack',
                    value: 'Fullstack',
                },
                {
                    key: 'security',
                    value: 'Security',
                },
                {
                    key: 'infrastructure',
                    value: 'Infrastructure',
                },
                {
                    key: 'productivity',
                    value: 'Productivity',
                },
                {
                    key: 'web3',
                    value: 'Web3',
                },
                {
                    key: 'cloud-native',
                    value: 'Cloud Native',
                },
                {
                    key: 'ml',
                    value: 'ML',
                },
            ],
        },
        {
            key: 'technologies',
            name: 'Technologies',
            options: [
                {
                    key: 'html',
                    value: 'HTML',
                },
                {
                    key: 'css',
                    value: 'CSS',
                },
                {
                    key: 'javascript',
                    value: 'JavaScript',
                },
                {
                    key: 'typescript',
                    value: 'TypeScript',
                },
                {
                    key: 'rust',
                    value: 'Rust',
                },
                {
                    key: 'go',
                    value: 'Go',
                },
                {
                    key: 'python',
                    value: 'Python',
                },
                {
                    key: 'java',
                    value: 'Java',
                },
                {
                    key: 'php',
                    value: 'PHP',
                },
                {
                    key: 'ruby',
                    value: 'Ruby',
                },
                {
                    key: 'c',
                    value: 'C/C++',
                },
            ],
        },
    ];
exports.allTagsOptions = exports.tagsList.reduce((acc, tag) => {
    return [...acc, ...tag.options];
}, []);


/***/ }),
/* 42 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SubscriptionService = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const pricing_1 = __webpack_require__(43);
const subscription_repository_1 = __webpack_require__(44);
const integration_service_1 = __webpack_require__(45);
const organization_service_1 = __webpack_require__(38);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
const make_is_1 = __webpack_require__(27);
let SubscriptionService = class SubscriptionService {
    constructor(_subscriptionRepository, _integrationService, _organizationService) {
        this._subscriptionRepository = _subscriptionRepository;
        this._integrationService = _integrationService;
        this._organizationService = _organizationService;
    }
    getSubscriptionByOrganizationId(organizationId) {
        return this._subscriptionRepository.getSubscriptionByOrganizationId(organizationId);
    }
    useCredit(organization) {
        return this._subscriptionRepository.useCredit(organization);
    }
    getCode(code) {
        return this._subscriptionRepository.getCode(code);
    }
    updateAccount(userId, account) {
        return this._subscriptionRepository.updateAccount(userId, account);
    }
    getUserAccount(userId) {
        return this._subscriptionRepository.getUserAccount(userId);
    }
    async deleteSubscription(customerId) {
        await this.modifySubscription(customerId, pricing_1.pricing.FREE.channel || 0, 'FREE');
        return this._subscriptionRepository.deleteSubscriptionByCustomerId(customerId);
    }
    updateCustomerId(organizationId, customerId) {
        return this._subscriptionRepository.updateCustomerId(organizationId, customerId);
    }
    async checkSubscription(organizationId, subscriptionId) {
        return await this._subscriptionRepository.checkSubscription(organizationId, subscriptionId);
    }
    updateConnectedStatus(account, accountCharges) {
        return this._subscriptionRepository.updateConnectedStatus(account, accountCharges);
    }
    async modifySubscription(customerId, totalChannels, billing) {
        const getOrgByCustomerId = await this._subscriptionRepository.getOrganizationByCustomerId(customerId);
        const getCurrentSubscription = (await this._subscriptionRepository.getSubscriptionByCustomerId(customerId));
        const from = pricing_1.pricing[getCurrentSubscription?.subscriptionTier || 'FREE'];
        const to = pricing_1.pricing[billing];
        const currentTotalChannels = (await this._integrationService.getIntegrationsList(getOrgByCustomerId?.id)).filter((f) => !f.disabled);
        if (currentTotalChannels.length > totalChannels) {
            await this._integrationService.disableIntegrations(getOrgByCustomerId?.id, currentTotalChannels.length - totalChannels);
        }
        if (from.team_members && !to.team_members) {
            await this._organizationService.disableOrEnableNonSuperAdminUsers(getOrgByCustomerId?.id, true);
        }
        if (!from.team_members && to.team_members) {
            await this._organizationService.disableOrEnableNonSuperAdminUsers(getOrgByCustomerId?.id, false);
        }
        // if (to.faq < from.faq) {
        //   await this._faqRepository.deleteFAQs(getCurrentSubscription?.organizationId, from.faq - to.faq);
        // }
        // if (to.categories < from.categories) {
        //   await this._categoriesRepository.deleteCategories(getCurrentSubscription?.organizationId, from.categories - to.categories);
        // }
        // if (to.integrations < from.integrations) {
        //   await this._integrationsRepository.deleteIntegrations(getCurrentSubscription?.organizationId, from.integrations - to.integrations);
        // }
        // if (to.user < from.user) {
        //   await this._integrationsRepository.deleteUsers(getCurrentSubscription?.organizationId, from.user - to.user);
        // }
        // if (to.domains < from.domains) {
        //   await this._settingsService.deleteDomainByOrg(getCurrentSubscription?.organizationId);
        //   await this._organizationRepository.changePowered(getCurrentSubscription?.organizationId);
        // }
    }
    async createOrUpdateSubscription(identifier, customerId, totalChannels, billing, period, cancelAt, code, org) {
        if (!code) {
            await this.modifySubscription(customerId, totalChannels, billing);
        }
        return this._subscriptionRepository.createOrUpdateSubscription(identifier, customerId, totalChannels, billing, period, cancelAt, code, org ? { id: org } : undefined);
    }
    async getSubscription(organizationId) {
        return this._subscriptionRepository.getSubscription(organizationId);
    }
    async checkCredits(organization) {
        // @ts-ignore
        const type = organization?.subscription?.subscriptionTier || 'FREE';
        if (type === 'FREE') {
            return { credits: 0 };
        }
        // @ts-ignore
        let date = (0, dayjs_1.default)(organization.subscription.createdAt);
        while (date.isBefore((0, dayjs_1.default)())) {
            date = date.add(1, 'month');
        }
        const checkFromMonth = date.subtract(1, 'month');
        const imageGenerationCount = pricing_1.pricing[type].image_generation_count;
        const totalUse = await this._subscriptionRepository.getCreditsFrom(organization.id, checkFromMonth);
        return {
            credits: imageGenerationCount - totalUse,
        };
    }
    async lifeTime(orgId, identifier, subscription) {
        return this.createOrUpdateSubscription(identifier, identifier, pricing_1.pricing[subscription].channel, subscription, 'YEARLY', null, identifier, orgId);
    }
    async addSubscription(orgId, userId, subscription) {
        await this._subscriptionRepository.setCustomerId(orgId, orgId);
        return this.createOrUpdateSubscription((0, make_is_1.makeId)(5), userId, pricing_1.pricing[subscription].channel, subscription, 'MONTHLY', null, undefined, orgId);
    }
};
exports.SubscriptionService = SubscriptionService;
exports.SubscriptionService = SubscriptionService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof subscription_repository_1.SubscriptionRepository !== "undefined" && subscription_repository_1.SubscriptionRepository) === "function" ? _a : Object, typeof (_b = typeof integration_service_1.IntegrationService !== "undefined" && integration_service_1.IntegrationService) === "function" ? _b : Object, typeof (_c = typeof organization_service_1.OrganizationService !== "undefined" && organization_service_1.OrganizationService) === "function" ? _c : Object])
], SubscriptionService);


/***/ }),
/* 43 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.pricing = void 0;
exports.pricing = {
    FREE: {
        current: 'FREE',
        month_price: 0,
        year_price: 0,
        channel: 0,
        image_generation_count: 0,
        posts_per_month: 0,
        team_members: false,
        community_features: false,
        featured_by_gitroom: false,
        ai: false,
        import_from_channels: false,
        image_generator: false,
        public_api: false,
    },
    STANDARD: {
        current: 'STANDARD',
        month_price: 29,
        year_price: 278,
        channel: 5,
        posts_per_month: 400,
        image_generation_count: 20,
        team_members: false,
        ai: true,
        community_features: false,
        featured_by_gitroom: false,
        import_from_channels: true,
        image_generator: false,
        public_api: true,
    },
    TEAM: {
        current: 'TEAM',
        month_price: 39,
        year_price: 374,
        channel: 10,
        posts_per_month: 1000000,
        image_generation_count: 100,
        community_features: true,
        team_members: true,
        featured_by_gitroom: true,
        ai: true,
        import_from_channels: true,
        image_generator: true,
        public_api: true,
    },
    PRO: {
        current: 'PRO',
        month_price: 49,
        year_price: 470,
        channel: 30,
        posts_per_month: 1000000,
        image_generation_count: 300,
        community_features: true,
        team_members: true,
        featured_by_gitroom: true,
        ai: true,
        import_from_channels: true,
        image_generator: true,
        public_api: true,
    },
    ULTIMATE: {
        current: 'ULTIMATE',
        month_price: 99,
        year_price: 950,
        channel: 100,
        posts_per_month: 1000000,
        image_generation_count: 500,
        community_features: true,
        team_members: true,
        featured_by_gitroom: true,
        ai: true,
        import_from_channels: true,
        image_generator: true,
        public_api: true,
    },
};


/***/ }),
/* 44 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SubscriptionRepository = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const prisma_service_1 = __webpack_require__(10);
let SubscriptionRepository = class SubscriptionRepository {
    constructor(_subscription, _organization, _user, _credits, _usedCodes) {
        this._subscription = _subscription;
        this._organization = _organization;
        this._user = _user;
        this._credits = _credits;
        this._usedCodes = _usedCodes;
    }
    getUserAccount(userId) {
        return this._user.model.user.findFirst({
            where: {
                id: userId,
            },
            select: {
                account: true,
                connectedAccount: true,
            },
        });
    }
    getCode(code) {
        return this._usedCodes.model.usedCodes.findFirst({
            where: {
                code,
            },
        });
    }
    updateAccount(userId, account) {
        return this._user.model.user.update({
            where: {
                id: userId,
            },
            data: {
                account,
            },
        });
    }
    getSubscriptionByOrganizationId(organizationId) {
        return this._subscription.model.subscription.findFirst({
            where: {
                organizationId,
                deletedAt: null,
            },
        });
    }
    updateConnectedStatus(account, accountCharges) {
        return this._user.model.user.updateMany({
            where: {
                account,
            },
            data: {
                connectedAccount: accountCharges,
            },
        });
    }
    getCustomerIdByOrgId(organizationId) {
        return this._organization.model.organization.findFirst({
            where: {
                id: organizationId,
            },
            select: {
                paymentId: true,
            },
        });
    }
    checkSubscription(organizationId, subscriptionId) {
        return this._subscription.model.subscription.findFirst({
            where: {
                organizationId,
                identifier: subscriptionId,
                deletedAt: null,
            },
        });
    }
    deleteSubscriptionByCustomerId(customerId) {
        return this._subscription.model.subscription.deleteMany({
            where: {
                organization: {
                    paymentId: customerId,
                },
            },
        });
    }
    updateCustomerId(organizationId, customerId) {
        return this._organization.model.organization.update({
            where: {
                id: organizationId,
            },
            data: {
                paymentId: customerId,
            },
        });
    }
    async getSubscriptionByCustomerId(customerId) {
        return this._subscription.model.subscription.findFirst({
            where: {
                organization: {
                    paymentId: customerId,
                },
            },
        });
    }
    async getOrganizationByCustomerId(customerId) {
        return this._organization.model.organization.findFirst({
            where: {
                paymentId: customerId,
            },
        });
    }
    async createOrUpdateSubscription(identifier, customerId, totalChannels, billing, period, cancelAt, code, org) {
        const findOrg = org || (await this.getOrganizationByCustomerId(customerId));
        await this._subscription.model.subscription.upsert({
            where: {
                organizationId: findOrg.id,
                ...(!code
                    ? {
                        organization: {
                            paymentId: customerId,
                        },
                    }
                    : {}),
            },
            update: {
                subscriptionTier: billing,
                totalChannels,
                period,
                identifier,
                isLifetime: !!code,
                cancelAt: cancelAt ? new Date(cancelAt * 1000) : null,
                deletedAt: null,
            },
            create: {
                organizationId: findOrg.id,
                subscriptionTier: billing,
                isLifetime: !!code,
                totalChannels,
                period,
                cancelAt: cancelAt ? new Date(cancelAt * 1000) : null,
                identifier,
                deletedAt: null,
            },
        });
        await this._organization.model.organization.update({
            where: {
                id: findOrg.id,
            },
            data: {
                allowTrial: false,
            },
        });
        if (code) {
            await this._usedCodes.model.usedCodes.create({
                data: {
                    code,
                    orgId: findOrg.id,
                },
            });
        }
    }
    getSubscription(organizationId) {
        return this._subscription.model.subscription.findFirst({
            where: {
                organizationId,
                deletedAt: null,
            },
        });
    }
    async getCreditsFrom(organizationId, from) {
        const load = await this._credits.model.credits.groupBy({
            by: ['organizationId'],
            where: {
                organizationId,
                createdAt: {
                    gte: from.toDate(),
                },
            },
            _sum: {
                credits: true,
            },
        });
        return load?.[0]?._sum?.credits || 0;
    }
    useCredit(org) {
        return this._credits.model.credits.create({
            data: {
                organizationId: org.id,
                credits: 1,
            },
        });
    }
    setCustomerId(orgId, customerId) {
        return this._organization.model.organization.update({
            where: {
                id: orgId,
            },
            data: {
                paymentId: customerId,
            },
        });
    }
};
exports.SubscriptionRepository = SubscriptionRepository;
exports.SubscriptionRepository = SubscriptionRepository = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _a : Object, typeof (_b = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _b : Object, typeof (_c = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _c : Object, typeof (_d = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _d : Object, typeof (_e = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _e : Object])
], SubscriptionRepository);


/***/ }),
/* 45 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IntegrationService = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const integration_repository_1 = __webpack_require__(46);
const integration_manager_1 = __webpack_require__(58);
const notification_service_1 = __webpack_require__(14);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
const timer_1 = __webpack_require__(66);
const redis_service_1 = __webpack_require__(31);
const social_abstract_1 = __webpack_require__(65);
const upload_factory_1 = __webpack_require__(47);
const client_1 = __webpack_require__(29);
const lodash_1 = __webpack_require__(12);
const utc_1 = tslib_1.__importDefault(__webpack_require__(104));
dayjs_1.default.extend(utc_1.default);
let IntegrationService = class IntegrationService {
    constructor(_integrationRepository, _integrationManager, _notificationService, _workerServiceProducer) {
        this._integrationRepository = _integrationRepository;
        this._integrationManager = _integrationManager;
        this._notificationService = _notificationService;
        this._workerServiceProducer = _workerServiceProducer;
        this.storage = upload_factory_1.UploadFactory.createStorage();
    }
    async setTimes(orgId, integrationId, times) {
        return this._integrationRepository.setTimes(orgId, integrationId, times);
    }
    updateProviderSettings(org, id, additionalSettings) {
        return this._integrationRepository.updateProviderSettings(org, id, additionalSettings);
    }
    async createOrUpdateIntegration(additionalSettings, oneTimeToken, org, customerId, name, picture, type, internalId, provider, token, refreshToken = '', expiresIn, username, isBetweenSteps = false, refresh, timezone, customInstanceDetails) {
        const uploadedPicture = picture
            ? picture?.indexOf('imagedelivery.net') > -1
                ? picture
                : await this.storage.uploadSimple(picture)
            : undefined;
        return this._integrationRepository.createOrUpdateIntegration(additionalSettings, oneTimeToken, org, customerId, name, uploadedPicture, type, internalId, provider, token, refreshToken, expiresIn, username, isBetweenSteps, refresh, timezone, customInstanceDetails);
    }
    updateIntegrationGroup(org, id, group) {
        return this._integrationRepository.updateIntegrationGroup(org, id, group);
    }
    updateOnCustomerName(org, id, name) {
        return this._integrationRepository.updateOnCustomerName(org, id, name);
    }
    getIntegrationsList(org) {
        return this._integrationRepository.getIntegrationsList(org);
    }
    getIntegrationForOrder(id, order, user, org) {
        return this._integrationRepository.getIntegrationForOrder(id, order, user, org);
    }
    updateNameAndUrl(id, name, url) {
        return this._integrationRepository.updateNameAndUrl(id, name, url);
    }
    getIntegrationById(org, id) {
        return this._integrationRepository.getIntegrationById(org, id);
    }
    async refreshToken(provider, refresh) {
        try {
            const { refreshToken, accessToken, expiresIn } = await provider.refreshToken(refresh);
            if (!refreshToken || !accessToken || !expiresIn) {
                return false;
            }
            return { refreshToken, accessToken, expiresIn };
        }
        catch (e) {
            return false;
        }
    }
    async disconnectChannel(orgId, integration) {
        await this._integrationRepository.disconnectChannel(orgId, integration.id);
        await this.informAboutRefreshError(orgId, integration);
    }
    async informAboutRefreshError(orgId, integration) {
        await this._notificationService.inAppNotification(orgId, `Could not refresh your ${integration.providerIdentifier} channel`, `Could not refresh your ${integration.providerIdentifier} channel. Please go back to the system and connect it again ${process.env.FRONTEND_URL}/launches`, true);
    }
    async refreshNeeded(org, id) {
        return this._integrationRepository.refreshNeeded(org, id);
    }
    async refreshTokens() {
        const integrations = await this._integrationRepository.needsToBeRefreshed();
        for (const integration of integrations) {
            const provider = await this._integrationManager.getSocialIntegration(integration.providerIdentifier, integration.organizationId, integration.customerId);
            const data = await this.refreshToken(provider, integration.refreshToken);
            if (!data) {
                await this.informAboutRefreshError(integration.organizationId, integration);
                await this._integrationRepository.refreshNeeded(integration.organizationId, integration.id);
                return;
            }
            const { refreshToken, accessToken, expiresIn } = data;
            await this.createOrUpdateIntegration(undefined, !!provider.oneTimeToken, integration.organizationId, integration.customerId, integration.name, undefined, 'social', integration.internalId, integration.providerIdentifier, accessToken, refreshToken, expiresIn);
        }
    }
    async disableChannel(org, id) {
        return this._integrationRepository.disableChannel(org, id);
    }
    async enableChannel(org, totalChannels, id) {
        const integrations = (await this._integrationRepository.getIntegrationsList(org)).filter((f) => !f.disabled);
        if (integrations.length >= totalChannels) {
            throw new Error('You have reached the maximum number of channels');
        }
        return this._integrationRepository.enableChannel(org, id);
    }
    async getPostsForChannel(org, id) {
        return this._integrationRepository.getPostsForChannel(org, id);
    }
    async deleteChannel(org, id) {
        return this._integrationRepository.deleteChannel(org, id);
    }
    async disableIntegrations(org, totalChannels) {
        return this._integrationRepository.disableIntegrations(org, totalChannels);
    }
    async checkForDeletedOnceAndUpdate(org, page) {
        return this._integrationRepository.checkForDeletedOnceAndUpdate(org, page);
    }
    async saveInstagram(org, id, data) {
        const getIntegration = await this._integrationRepository.getIntegrationById(org, id);
        if (getIntegration && !getIntegration.inBetweenSteps) {
            throw new common_1.HttpException('Invalid request', common_1.HttpStatus.BAD_REQUEST);
        }
        const instagram = await this._integrationManager.getSocialIntegration('instagram', getIntegration?.organizationId, getIntegration?.customerId);
        const getIntegrationInformation = await instagram.fetchPageInformation(getIntegration?.token, data);
        await this.checkForDeletedOnceAndUpdate(org, getIntegrationInformation.id);
        await this._integrationRepository.updateIntegration(id, {
            picture: getIntegrationInformation.picture,
            internalId: getIntegrationInformation.id,
            name: getIntegrationInformation.name,
            inBetweenSteps: false,
            token: getIntegrationInformation.access_token,
            profile: getIntegrationInformation.username,
        });
        return { success: true };
    }
    async saveLinkedin(org, id, page) {
        const getIntegration = await this._integrationRepository.getIntegrationById(org, id);
        if (getIntegration && !getIntegration.inBetweenSteps) {
            throw new common_1.HttpException('Invalid request', common_1.HttpStatus.BAD_REQUEST);
        }
        const linkedin = await this._integrationManager.getSocialIntegration('linkedin-page', getIntegration?.organizationId, getIntegration?.customerId);
        const getIntegrationInformation = await linkedin.fetchPageInformation(getIntegration?.token, page);
        await this.checkForDeletedOnceAndUpdate(org, String(getIntegrationInformation.id));
        await this._integrationRepository.updateIntegration(String(id), {
            picture: getIntegrationInformation.picture,
            internalId: String(getIntegrationInformation.id),
            name: getIntegrationInformation.name,
            inBetweenSteps: false,
            token: getIntegrationInformation.access_token,
            profile: getIntegrationInformation.username,
        });
        return { success: true };
    }
    async saveFacebook(org, id, page) {
        const getIntegration = await this._integrationRepository.getIntegrationById(org, id);
        if (getIntegration && !getIntegration.inBetweenSteps) {
            throw new common_1.HttpException('Invalid request', common_1.HttpStatus.BAD_REQUEST);
        }
        const facebook = await this._integrationManager.getSocialIntegration('facebook', getIntegration?.organizationId, getIntegration?.customerId);
        const getIntegrationInformation = await facebook.fetchPageInformation(getIntegration?.token, page);
        await this.checkForDeletedOnceAndUpdate(org, getIntegrationInformation.id);
        await this._integrationRepository.updateIntegration(id, {
            picture: getIntegrationInformation.picture,
            internalId: getIntegrationInformation.id,
            name: getIntegrationInformation.name,
            inBetweenSteps: false,
            token: getIntegrationInformation.access_token,
            profile: getIntegrationInformation.username,
        });
        return { success: true };
    }
    async checkAnalytics(org, integration, date, forceRefresh = false) {
        const getIntegration = await this.getIntegrationById(org.id, integration);
        if (!getIntegration) {
            throw new Error('Invalid integration');
        }
        if (getIntegration.type !== 'social') {
            return [];
        }
        const integrationProvider = await this._integrationManager.getSocialIntegration(getIntegration.providerIdentifier, getIntegration.organizationId, getIntegration.customerId);
        if ((0, dayjs_1.default)(getIntegration?.tokenExpiration).isBefore((0, dayjs_1.default)()) ||
            forceRefresh) {
            const { accessToken, expiresIn, refreshToken, additionalSettings } = await new Promise((res) => {
                return integrationProvider
                    .refreshToken(getIntegration.refreshToken)
                    .then((r) => res(r))
                    .catch(() => {
                    res({
                        error: '',
                        accessToken: '',
                        id: '',
                        name: '',
                        picture: '',
                        username: '',
                        additionalSettings: undefined,
                    });
                });
            });
            if (accessToken) {
                await this.createOrUpdateIntegration(additionalSettings, !!integrationProvider.oneTimeToken, getIntegration.organizationId, getIntegration.customerId, getIntegration.name, getIntegration.picture, 'social', getIntegration.internalId, getIntegration.providerIdentifier, accessToken, refreshToken, expiresIn);
                getIntegration.token = accessToken;
                if (integrationProvider.refreshWait) {
                    await (0, timer_1.timer)(10000);
                }
            }
            else {
                await this.disconnectChannel(org.id, getIntegration);
                return [];
            }
        }
        const getIntegrationData = await redis_service_1.ioRedis.get(`integration:${org.id}:${integration}:${date}`);
        if (getIntegrationData) {
            return JSON.parse(getIntegrationData);
        }
        if (integrationProvider.analytics) {
            try {
                const loadAnalytics = await integrationProvider.analytics(getIntegration.internalId, getIntegration.token, +date);
                await redis_service_1.ioRedis.set(`integration:${org.id}:${integration}:${date}`, JSON.stringify(loadAnalytics), 'EX', !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                    ? 1
                    : 3600);
                return loadAnalytics;
            }
            catch (e) {
                if (e instanceof social_abstract_1.RefreshToken) {
                    return this.checkAnalytics(org, integration, date, true);
                }
            }
        }
        return [];
    }
    customers(orgId) {
        return this._integrationRepository.customers(orgId);
    }
    getPlugsByIntegrationId(org, integrationId) {
        return this._integrationRepository.getPlugsByIntegrationId(org, integrationId);
    }
    async processInternalPlug(data) {
        const originalIntegration = await this._integrationRepository.getIntegrationById(data.orgId, data.originalIntegration);
        const getIntegration = await this._integrationRepository.getIntegrationById(data.orgId, data.integration);
        if (!getIntegration || !originalIntegration) {
            return;
        }
        const getAllInternalPlugs = this._integrationManager
            .getInternalPlugs(getIntegration.providerIdentifier)
            .internalPlugs.find((p) => p.identifier === data.plugName);
        if (!getAllInternalPlugs) {
            return;
        }
        const getSocialIntegration = await this._integrationManager.getSocialIntegration(getIntegration.providerIdentifier, getIntegration.organizationId, getIntegration.customerId);
        try {
            // @ts-ignore
            await getSocialIntegration?.[getAllInternalPlugs.methodName]?.(getIntegration, originalIntegration, data.post, data.information);
        }
        catch (err) {
            return;
        }
    }
    async processPlugs(data) {
        const getPlugById = await this._integrationRepository.getPlug(data.plugId);
        if (!getPlugById) {
            return;
        }
        const integration = await this._integrationManager.getSocialIntegration(getPlugById.integration.providerIdentifier, getPlugById.integration.organizationId, getPlugById.integration.customerId);
        const findPlug = this._integrationManager
            .getAllPlugs()
            .find((p) => p.identifier === getPlugById.integration.providerIdentifier);
        // @ts-ignore
        const process = await integration[getPlugById.plugFunction](getPlugById.integration, data.postId, JSON.parse(getPlugById.data).reduce((all, current) => {
            all[current.name] = current.value;
            return all;
        }, {}));
        if (process) {
            return;
        }
        if (data.totalRuns === data.currentRun) {
            return;
        }
        this._workerServiceProducer.emit('plugs', {
            id: 'plug_' + data.postId + '_' + findPlug.identifier,
            options: {
                delay: 0, // runPlug.runEveryMilliseconds,
            },
            payload: {
                plugId: data.plugId,
                postId: data.postId,
                delay: data.delay,
                totalRuns: data.totalRuns,
                currentRun: data.currentRun + 1,
            },
        });
    }
    async createOrUpdatePlug(orgId, integrationId, body) {
        const { activated } = await this._integrationRepository.createOrUpdatePlug(orgId, integrationId, body);
        return {
            activated,
        };
    }
    async changePlugActivation(orgId, plugId, status) {
        const { id, integrationId, plugFunction } = await this._integrationRepository.changePlugActivation(orgId, plugId, status);
        return { id };
    }
    async getPlugs(orgId, integrationId) {
        return this._integrationRepository.getPlugs(orgId, integrationId);
    }
    async loadExisingData(methodName, integrationId, id) {
        const exisingData = await this._integrationRepository.loadExisingData(methodName, integrationId, id);
        const loadOnlyIds = exisingData.map((p) => p.value);
        return (0, lodash_1.difference)(id, loadOnlyIds);
    }
    async findFreeDateTime(orgId) {
        const findTimes = await this._integrationRepository.getPostingTimes(orgId);
        return (0, lodash_1.uniq)(findTimes.reduce((all, current) => {
            return [
                ...all,
                ...JSON.parse(current.postingTimes).map((p) => p.time),
            ];
        }, []));
    }
};
exports.IntegrationService = IntegrationService;
exports.IntegrationService = IntegrationService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof integration_repository_1.IntegrationRepository !== "undefined" && integration_repository_1.IntegrationRepository) === "function" ? _a : Object, typeof (_b = typeof integration_manager_1.IntegrationManager !== "undefined" && integration_manager_1.IntegrationManager) === "function" ? _b : Object, typeof (_c = typeof notification_service_1.NotificationService !== "undefined" && notification_service_1.NotificationService) === "function" ? _c : Object, typeof (_d = typeof client_1.BullMqClient !== "undefined" && client_1.BullMqClient) === "function" ? _d : Object])
], IntegrationService);


/***/ }),
/* 46 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IntegrationRepository = void 0;
const tslib_1 = __webpack_require__(3);
const prisma_service_1 = __webpack_require__(10);
const common_1 = __webpack_require__(4);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
const make_is_1 = __webpack_require__(27);
const upload_factory_1 = __webpack_require__(47);
let IntegrationRepository = class IntegrationRepository {
    constructor(_integration, _posts, _plugs, _exisingPlugData, _customers) {
        this._integration = _integration;
        this._posts = _posts;
        this._plugs = _plugs;
        this._exisingPlugData = _exisingPlugData;
        this._customers = _customers;
        this.storage = upload_factory_1.UploadFactory.createStorage();
    }
    updateProviderSettings(org, id, settings) {
        return this._integration.model.integration.update({
            where: {
                id,
                organizationId: org,
            },
            data: {
                additionalSettings: settings,
            },
        });
    }
    async setTimes(org, id, times) {
        return this._integration.model.integration.update({
            select: {
                id: true,
            },
            where: {
                id,
                organizationId: org,
            },
            data: {
                postingTimes: JSON.stringify(times.time),
            },
        });
    }
    getPlug(plugId) {
        return this._plugs.model.plugs.findFirst({
            where: {
                id: plugId,
            },
            include: {
                integration: true,
            },
        });
    }
    async getPlugs(orgId, integrationId) {
        return this._plugs.model.plugs.findMany({
            where: {
                integrationId,
                organizationId: orgId,
                activated: true,
            },
            include: {
                integration: {
                    select: {
                        id: true,
                        providerIdentifier: true,
                    },
                },
            },
        });
    }
    async updateIntegration(id, params) {
        if (params.picture &&
            (params.picture.indexOf(process.env.CLOUDFLARE_BUCKET_URL) === -1 ||
                params.picture.indexOf(process.env.FRONTEND_URL) === -1)) {
            params.picture = await this.storage.uploadSimple(params.picture);
        }
        return this._integration.model.integration.update({
            where: {
                id,
            },
            data: {
                ...params,
            },
        });
    }
    disconnectChannel(org, id) {
        return this._integration.model.integration.update({
            where: {
                id,
                organizationId: org,
            },
            data: {
                refreshNeeded: true,
            },
        });
    }
    async createOrUpdateIntegration(additionalSettings, oneTimeToken, org, customerId, name, picture, type, internalId, provider, token, refreshToken = '', expiresIn = 999999999, username, isBetweenSteps = false, refresh, timezone, customInstanceDetails) {
        const postTimes = timezone
            ? {
                postingTimes: JSON.stringify([
                    { time: 560 - timezone },
                    { time: 850 - timezone },
                    { time: 1140 - timezone },
                ]),
            }
            : {};
        console.log("customerId", customerId);
        console.log("org", org);
        console.log("internalId", internalId);
        console.log("name", name);
        console.log("username", username);
        console.log("provider", provider);
        const upsert = await this._integration.model.integration.upsert({
            where: {
                organizationId_internalId: {
                    internalId,
                    organizationId: org,
                }
                // customerId: customerId //NEW 
            },
            create: {
                type: type,
                name,
                providerIdentifier: provider,
                token,
                profile: username,
                ...(picture ? { picture } : {}),
                inBetweenSteps: isBetweenSteps,
                refreshToken,
                ...(expiresIn
                    ? { tokenExpiration: new Date(Date.now() + expiresIn * 1000) }
                    : {}),
                internalId,
                ...postTimes,
                organizationId: org,
                customerId: customerId,
                refreshNeeded: false,
                rootInternalId: internalId.split('_').pop(),
                ...(customInstanceDetails ? { customInstanceDetails } : {}),
                additionalSettings: additionalSettings
                    ? JSON.stringify(additionalSettings)
                    : '[]',
            },
            update: {
                type: type,
                ...(!refresh
                    ? {
                        inBetweenSteps: isBetweenSteps,
                    }
                    : {}),
                ...(picture ? { picture } : {}),
                profile: username,
                name: name,
                providerIdentifier: provider,
                token,
                refreshToken,
                ...(expiresIn
                    ? { tokenExpiration: new Date(Date.now() + expiresIn * 1000) }
                    : {}),
                internalId,
                organizationId: org,
                customerId: customerId,
                deletedAt: null,
                refreshNeeded: false,
            },
        });
        if (oneTimeToken) {
            const rootId = (await this._integration.model.integration.findFirst({
                where: {
                    organizationId: org,
                    customerId: customerId,
                    internalId: internalId
                },
            }))?.rootInternalId || internalId.split('_').pop();
            await this._integration.model.integration.updateMany({
                where: {
                    id: {
                        not: upsert.id,
                    },
                    organizationId: org,
                    customerId: customerId,
                    rootInternalId: rootId,
                },
                data: {
                    token,
                    refreshToken,
                    refreshNeeded: false,
                    ...(expiresIn
                        ? { tokenExpiration: new Date(Date.now() + expiresIn * 1000) }
                        : {}),
                },
            });
        }
        console.log("INTEGRATION ADDED");
        return upsert;
    }
    needsToBeRefreshed() {
        return this._integration.model.integration.findMany({
            where: {
                tokenExpiration: {
                    lte: (0, dayjs_1.default)().add(1, 'day').toDate(),
                },
                inBetweenSteps: false,
                deletedAt: null,
                refreshNeeded: false,
            },
        });
    }
    refreshNeeded(org, id) {
        return this._integration.model.integration.update({
            where: {
                id,
                organizationId: org,
            },
            data: {
                refreshNeeded: true,
            },
        });
    }
    updateNameAndUrl(id, name, url) {
        return this._integration.model.integration.update({
            where: {
                id,
            },
            data: {
                ...(name ? { name } : {}),
                ...(url ? { picture: url } : {}),
            },
        });
    }
    getIntegrationById(org, id) {
        return this._integration.model.integration.findFirst({
            where: {
                organizationId: org,
                id,
            },
        });
    }
    async getIntegrationForOrder(id, order, user, org) {
        const integration = await this._posts.model.post.findFirst({
            where: {
                integrationId: id,
                submittedForOrder: {
                    id: order,
                    messageGroup: {
                        OR: [
                            { sellerId: user },
                            { buyerId: user },
                            { buyerOrganizationId: org },
                        ],
                    },
                },
            },
            select: {
                integration: {
                    select: {
                        id: true,
                        name: true,
                        picture: true,
                        inBetweenSteps: true,
                        providerIdentifier: true,
                    },
                },
            },
        });
        return integration?.integration;
    }
    async updateOnCustomerName(org, id, name) {
        const customer = !name
            ? undefined
            : (await this._customers.model.customer.findFirst({
                where: {
                    orgId: org,
                    name,
                },
            })) ||
                (await this._customers.model.customer.create({
                    data: {
                        name,
                        orgId: org,
                    },
                }));
        return this._integration.model.integration.update({
            where: {
                id,
                organizationId: org,
            },
            data: {
                customer: !customer
                    ? { disconnect: true }
                    : {
                        connect: {
                            id: customer.id,
                        },
                    },
            },
        });
    }
    updateIntegrationGroup(org, id, group) {
        return this._integration.model.integration.update({
            where: {
                id,
                organizationId: org,
            },
            data: !group
                ? {
                    customer: {
                        disconnect: true,
                    },
                }
                : {
                    customer: {
                        connect: {
                            id: group,
                        },
                    },
                },
        });
    }
    customers(orgId) {
        return this._customers.model.customer.findMany({
            where: {
                orgId,
                deletedAt: null,
            },
        });
    }
    getIntegrationsList(org) {
        return this._integration.model.integration.findMany({
            where: {
                organizationId: org,
                deletedAt: null,
            },
            include: {
                customer: true,
            },
        });
    }
    async disableChannel(org, id) {
        await this._integration.model.integration.update({
            where: {
                id,
                organizationId: org,
            },
            data: {
                disabled: true,
            },
        });
    }
    async enableChannel(org, id) {
        await this._integration.model.integration.update({
            where: {
                id,
                organizationId: org,
            },
            data: {
                disabled: false,
            },
        });
    }
    getPostsForChannel(org, id) {
        return this._posts.model.post.groupBy({
            by: ['group'],
            where: {
                organizationId: org,
                integrationId: id,
                deletedAt: null,
            },
        });
    }
    deleteChannel(org, id) {
        return this._integration.model.integration.update({
            where: {
                id,
                organizationId: org,
            },
            data: {
                deletedAt: new Date(),
            },
        });
    }
    async checkForDeletedOnceAndUpdate(org, page) {
        return this._integration.model.integration.updateMany({
            where: {
                organizationId: org,
                internalId: page,
                deletedAt: {
                    not: null,
                },
            },
            data: {
                internalId: (0, make_is_1.makeId)(10),
            },
        });
    }
    async disableIntegrations(org, totalChannels) {
        const getChannels = await this._integration.model.integration.findMany({
            where: {
                organizationId: org,
                disabled: false,
                deletedAt: null,
            },
            take: totalChannels,
            select: {
                id: true,
            },
        });
        for (const channel of getChannels) {
            await this._integration.model.integration.update({
                where: {
                    id: channel.id,
                },
                data: {
                    disabled: true,
                },
            });
        }
    }
    getPlugsByIntegrationId(org, id) {
        return this._plugs.model.plugs.findMany({
            where: {
                organizationId: org,
                integrationId: id,
            },
        });
    }
    createOrUpdatePlug(org, integrationId, body) {
        return this._plugs.model.plugs.upsert({
            where: {
                organizationId: org,
                plugFunction_integrationId: {
                    integrationId,
                    plugFunction: body.func,
                },
            },
            create: {
                integrationId,
                organizationId: org,
                plugFunction: body.func,
                data: JSON.stringify(body.fields),
                activated: true,
            },
            update: {
                data: JSON.stringify(body.fields),
            },
            select: {
                activated: true,
            },
        });
    }
    changePlugActivation(orgId, plugId, status) {
        return this._plugs.model.plugs.update({
            where: {
                organizationId: orgId,
                id: plugId,
            },
            data: {
                activated: !!status,
            },
        });
    }
    async loadExisingData(methodName, integrationId, id) {
        return this._exisingPlugData.model.exisingPlugData.findMany({
            where: {
                integrationId,
                methodName,
                value: {
                    in: id,
                },
            },
        });
    }
    async saveExisingData(methodName, integrationId, value) {
        return this._exisingPlugData.model.exisingPlugData.createMany({
            data: value.map((p) => ({
                integrationId,
                methodName,
                value: p,
            })),
        });
    }
    async getPostingTimes(orgId) {
        return this._integration.model.integration.findMany({
            where: {
                organizationId: orgId,
                disabled: false,
                deletedAt: null,
            },
            select: {
                postingTimes: true,
            },
        });
    }
};
exports.IntegrationRepository = IntegrationRepository;
exports.IntegrationRepository = IntegrationRepository = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _a : Object, typeof (_b = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _b : Object, typeof (_c = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _c : Object, typeof (_d = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _d : Object, typeof (_e = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _e : Object])
], IntegrationRepository);


/***/ }),
/* 47 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UploadFactory = void 0;
const cloudflare_storage_1 = __webpack_require__(48);
const local_storage_1 = __webpack_require__(54);
const awss3_storage_1 = __webpack_require__(57);
class UploadFactory {
    static createStorage() {
        const storageProvider = process.env.STORAGE_PROVIDER || 'local';
        switch (storageProvider) {
            case 'local':
                return new local_storage_1.LocalStorage(process.env.UPLOAD_DIRECTORY);
            case 'cloudflare':
                return new cloudflare_storage_1.CloudflareStorage(process.env.CLOUDFLARE_ACCOUNT_ID, process.env.CLOUDFLARE_ACCESS_KEY, process.env.CLOUDFLARE_SECRET_ACCESS_KEY, process.env.CLOUDFLARE_REGION, process.env.CLOUDFLARE_BUCKETNAME, process.env.CLOUDFLARE_BUCKET_URL);
            case 'awss3':
                return new awss3_storage_1.S3Storage(process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY, process.env.AWS_REGION, process.env.AWS_BUCKET_NAME, process.env.AWS_BUCKET_DIR, process.env.AWS_BUCKET_URL);
            default:
                throw new Error(`Invalid storage type ${storageProvider}`);
        }
    }
}
exports.UploadFactory = UploadFactory;


/***/ }),
/* 48 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CloudflareStorage = void 0;
const tslib_1 = __webpack_require__(3);
const client_s3_1 = __webpack_require__(49);
__webpack_require__(50);
const make_is_1 = __webpack_require__(27);
const mime_types_1 = tslib_1.__importDefault(__webpack_require__(51));
// @ts-ignore
const mime_1 = __webpack_require__(52);
const axios_1 = tslib_1.__importDefault(__webpack_require__(53));
class CloudflareStorage {
    constructor(accountID, accessKey, secretKey, region, _bucketName, _uploadUrl) {
        this.region = region;
        this._bucketName = _bucketName;
        this._uploadUrl = _uploadUrl;
        this._client = new client_s3_1.S3Client({
            endpoint: `https://${accountID}.r2.cloudflarestorage.com`,
            region,
            credentials: {
                accessKeyId: accessKey,
                secretAccessKey: secretKey,
            },
            requestChecksumCalculation: "WHEN_REQUIRED",
        });
        this._client.middlewareStack.add((next) => async (args) => {
            const request = args.request;
            // Remove checksum headers
            const headers = request.headers;
            delete headers['x-amz-checksum-crc32'];
            delete headers['x-amz-checksum-crc32c'];
            delete headers['x-amz-checksum-sha1'];
            delete headers['x-amz-checksum-sha256'];
            request.headers = headers;
            Object.entries(request.headers).forEach(
            // @ts-ignore
            ([key, value]) => {
                if (!request.headers) {
                    request.headers = {};
                }
                request.headers[key] = value;
            });
            return next(args);
        }, { step: 'build', name: 'customHeaders' });
    }
    async uploadSimple(path) {
        const loadImage = await axios_1.default.get(path, { responseType: 'arraybuffer' });
        const contentType = loadImage?.headers?.['content-type'] ||
            loadImage?.headers?.['Content-Type'];
        const extension = (0, mime_1.getExtension)(contentType);
        const id = (0, make_is_1.makeId)(10);
        const params = {
            Bucket: this._bucketName,
            Key: `${id}.${extension}`,
            Body: loadImage.data,
            ContentType: contentType,
            ChecksumMode: 'DISABLED'
        };
        const command = new client_s3_1.PutObjectCommand({ ...params });
        await this._client.send(command);
        return `${this._uploadUrl}/${id}.${extension}`;
    }
    async uploadFile(file) {
        const id = (0, make_is_1.makeId)(10);
        const extension = mime_types_1.default.extension(file.mimetype) || '';
        // Create the PutObjectCommand to upload the file to Cloudflare R2
        const command = new client_s3_1.PutObjectCommand({
            Bucket: this._bucketName,
            ACL: 'public-read',
            Key: `${id}.${extension}`,
            Body: file.buffer,
        });
        await this._client.send(command);
        return {
            filename: `${id}.${extension}`,
            mimetype: file.mimetype,
            size: file.size,
            buffer: file.buffer,
            originalname: `${id}.${extension}`,
            fieldname: 'file',
            path: `${this._uploadUrl}/${id}.${extension}`,
            destination: `${this._uploadUrl}/${id}.${extension}`,
            encoding: '7bit',
            stream: file.buffer,
        };
    }
    // Implement the removeFile method from IUploadProvider
    async removeFile(filePath) {
        // const fileName = filePath.split('/').pop(); // Extract the filename from the path
        // const command = new DeleteObjectCommand({
        //   Bucket: this._bucketName,
        //   Key: fileName,
        // });
        // await this._client.send(command);
    }
}
exports.CloudflareStorage = CloudflareStorage;
exports["default"] = CloudflareStorage;


/***/ }),
/* 49 */
/***/ ((module) => {

module.exports = require("@aws-sdk/client-s3");

/***/ }),
/* 50 */
/***/ ((module) => {

module.exports = require("multer");

/***/ }),
/* 51 */
/***/ ((module) => {

module.exports = require("mime-types");

/***/ }),
/* 52 */
/***/ ((module) => {

module.exports = require("mime");

/***/ }),
/* 53 */
/***/ ((module) => {

module.exports = require("axios");

/***/ }),
/* 54 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LocalStorage = void 0;
const tslib_1 = __webpack_require__(3);
const fs_1 = __webpack_require__(55);
// @ts-ignore
const mime_1 = tslib_1.__importDefault(__webpack_require__(52));
const path_1 = __webpack_require__(56);
const axios_1 = tslib_1.__importDefault(__webpack_require__(53));
class LocalStorage {
    constructor(uploadDirectory) {
        this.uploadDirectory = uploadDirectory;
    }
    async uploadSimple(path) {
        const loadImage = await axios_1.default.get(path, { responseType: 'arraybuffer' });
        const contentType = loadImage?.headers?.['content-type'] || loadImage?.headers?.['Content-Type'];
        const findExtension = mime_1.default.getExtension(contentType);
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const innerPath = `/${year}/${month}/${day}`;
        const dir = `${this.uploadDirectory}${innerPath}`;
        (0, fs_1.mkdirSync)(dir, { recursive: true });
        const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
        const filePath = `${dir}/${randomName}.${findExtension}`;
        const publicPath = `${innerPath}/${randomName}.${findExtension}`;
        // Logic to save the file to the filesystem goes here
        (0, fs_1.writeFileSync)(filePath, loadImage.data);
        return process.env.FRONTEND_URL + '/uploads' + publicPath;
    }
    async uploadFile(file) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const innerPath = `/${year}/${month}/${day}`;
        const dir = `${this.uploadDirectory}${innerPath}`;
        (0, fs_1.mkdirSync)(dir, { recursive: true });
        const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
        const filePath = `${dir}/${randomName}${(0, path_1.extname)(file.originalname)}`;
        const publicPath = `${innerPath}/${randomName}${(0, path_1.extname)(file.originalname)}`;
        // Logic to save the file to the filesystem goes here
        (0, fs_1.writeFileSync)(filePath, file.buffer);
        return {
            filename: `${randomName}${(0, path_1.extname)(file.originalname)}`,
            path: process.env.FRONTEND_URL + '/uploads' + publicPath,
            mimetype: file.mimetype,
            originalname: file.originalname,
        };
    }
    async removeFile(filePath) {
        // Logic to remove the file from the filesystem goes here
        return new Promise((resolve, reject) => {
            (0, fs_1.unlink)(filePath, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
}
exports.LocalStorage = LocalStorage;


/***/ }),
/* 55 */
/***/ ((module) => {

module.exports = require("fs");

/***/ }),
/* 56 */
/***/ ((module) => {

module.exports = require("path");

/***/ }),
/* 57 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.S3Storage = void 0;
const tslib_1 = __webpack_require__(3);
const client_s3_1 = __webpack_require__(49);
__webpack_require__(50);
const make_is_1 = __webpack_require__(27);
const mime_types_1 = tslib_1.__importDefault(__webpack_require__(51));
const axios_1 = tslib_1.__importDefault(__webpack_require__(53));
class S3Storage {
    constructor(accessKey, secretKey, region, _bucketName, _bucket_dir, _uploadUrl) {
        this.region = region;
        this._bucketName = _bucketName;
        this._bucket_dir = _bucket_dir;
        this._uploadUrl = _uploadUrl;
        this._client = new client_s3_1.S3Client({
            region,
            credentials: {
                accessKeyId: accessKey,
                secretAccessKey: secretKey,
            },
        });
    }
    async uploadSimple(path) {
        const loadImage = await axios_1.default.get(path, { responseType: 'arraybuffer' });
        const contentType = loadImage?.headers?.['content-type'] ||
            loadImage?.headers?.['Content-Type'];
        const extension = mime_types_1.default.extension(contentType) || '';
        const id = (0, make_is_1.makeId)(10);
        const params = {
            Bucket: this._bucketName,
            Key: `${this._bucket_dir}/${id}.${extension}`,
            Body: loadImage.data,
            ContentType: contentType,
        };
        const command = new client_s3_1.PutObjectCommand(params);
        await this._client.send(command);
        return `${this._uploadUrl}/${id}.${extension}`;
    }
    async uploadFile(file) {
        const id = (0, make_is_1.makeId)(10);
        const extension = mime_types_1.default.extension(file.mimetype) || '';
        const command = new client_s3_1.PutObjectCommand({
            Bucket: this._bucketName,
            Key: `${this._bucket_dir}/${id}.${extension}`,
            Body: file.buffer,
            ContentType: file.mimetype,
        });
        await this._client.send(command);
        return {
            filename: `${id}.${extension}`,
            mimetype: file.mimetype,
            size: file.size,
            originalname: file.originalname,
            path: `${this._uploadUrl}/${id}.${extension}`,
        };
    }
    async removeFile(filePath) {
        // Implement file deletion logic here
    }
}
exports.S3Storage = S3Storage;
exports["default"] = S3Storage;


/***/ }),
/* 58 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IntegrationManager = void 0;
const tslib_1 = __webpack_require__(3);
__webpack_require__(59);
const common_1 = __webpack_require__(4);
const x_provider_1 = __webpack_require__(60);
const linkedin_provider_1 = __webpack_require__(69);
const reddit_provider_1 = __webpack_require__(70);
const dev_to_provider_1 = __webpack_require__(71);
const hashnode_provider_1 = __webpack_require__(72);
const medium_provider_1 = __webpack_require__(75);
const facebook_provider_1 = __webpack_require__(76);
const instagram_provider_1 = __webpack_require__(77);
const youtube_provider_1 = __webpack_require__(78);
const tiktok_provider_1 = __webpack_require__(81);
const pinterest_provider_1 = __webpack_require__(82);
const dribbble_provider_1 = __webpack_require__(84);
const linkedin_page_provider_1 = __webpack_require__(85);
const threads_provider_1 = __webpack_require__(86);
const discord_provider_1 = __webpack_require__(87);
const slack_provider_1 = __webpack_require__(88);
const mastodon_provider_1 = __webpack_require__(89);
const bluesky_provider_1 = __webpack_require__(90);
const lemmy_provider_1 = __webpack_require__(92);
const instagram_standalone_provider_1 = __webpack_require__(93);
const social_media_platform_config_service_1 = __webpack_require__(94);
// import { MastodonCustomProvider } from '@gitroom/nestjs-libraries/integrations/social/mastodon.custom.provider';
const farcaster_provider_1 = __webpack_require__(96);
const telegram_provider_1 = __webpack_require__(98);
const prisma_service_1 = __webpack_require__(10);
const customers_repository_1 = __webpack_require__(100);
const gbp_provider_1 = __webpack_require__(101);
const website_provider_1 = __webpack_require__(102);
const prismaService = new prisma_service_1.PrismaService();
const customerPrismaRepo = new prisma_service_1.PrismaRepository(prismaService);
const customersRepo = new customers_repository_1.CustomersRepository(customerPrismaRepo);
const gbpProvider = new gbp_provider_1.GbpProvider(customersRepo);
const websiteProvider = new website_provider_1.WebsiteProvider(customersRepo);
const socialIntegrationList = [
    new x_provider_1.XProvider(),
    new linkedin_provider_1.LinkedinProvider(),
    new linkedin_page_provider_1.LinkedinPageProvider(),
    new reddit_provider_1.RedditProvider(),
    new instagram_provider_1.InstagramProvider(),
    new instagram_standalone_provider_1.InstagramStandaloneProvider(),
    new facebook_provider_1.FacebookProvider(),
    new threads_provider_1.ThreadsProvider(),
    new youtube_provider_1.YoutubeProvider(),
    new tiktok_provider_1.TiktokProvider(),
    new pinterest_provider_1.PinterestProvider(),
    new dribbble_provider_1.DribbbleProvider(),
    new discord_provider_1.DiscordProvider(),
    new slack_provider_1.SlackProvider(),
    new mastodon_provider_1.MastodonProvider(),
    new bluesky_provider_1.BlueskyProvider(),
    new lemmy_provider_1.LemmyProvider(),
    new farcaster_provider_1.FarcasterProvider(),
    new telegram_provider_1.TelegramProvider(),
    gbpProvider,
    websiteProvider
    // new MastodonCustomProvider(),
];
const articleIntegrationList = [
    new dev_to_provider_1.DevToProvider(),
    new hashnode_provider_1.HashnodeProvider(),
    new medium_provider_1.MediumProvider(),
];
let IntegrationManager = class IntegrationManager {
    constructor(_socialMediaPlatformConfigService) {
        this._socialMediaPlatformConfigService = _socialMediaPlatformConfigService;
    }
    async getAllIntegrations() {
        return {
            social: await Promise.all(socialIntegrationList.map(async (p) => ({
                name: p.name,
                identifier: p.identifier,
                toolTip: p.toolTip,
                isExternal: !!p.externalUrl,
                isWeb3: !!p.isWeb3,
                ...(p.customFields ? { customFields: await p.customFields() } : {}),
            }))),
            article: articleIntegrationList.map((p) => ({
                name: p.name,
                identifier: p.identifier,
            })),
        };
    }
    getAllPlugs() {
        return socialIntegrationList
            .map((p) => {
            return {
                name: p.name,
                identifier: p.identifier,
                plugs: (Reflect.getMetadata('custom:plug', p.constructor.prototype) || []).map((p) => ({
                    ...p,
                    fields: p.fields.map((c) => ({
                        ...c,
                        validation: c?.validation?.toString(),
                    })),
                })),
            };
        })
            .filter((f) => f.plugs.length);
    }
    getInternalPlugs(providerName) {
        const p = socialIntegrationList.find((p) => p.identifier === providerName);
        return {
            internalPlugs: Reflect.getMetadata('custom:internal_plug', p.constructor.prototype) ||
                [],
        };
    }
    getAllowedSocialsIntegrations() {
        return socialIntegrationList.map((p) => p.identifier);
    }
    async getSocialIntegration(integration, orgId, customerId) {
        const integrationProvider = socialIntegrationList.find((i) => i.identifier === integration);
        if (!integrationProvider) {
            throw new Error(`SocialProvider with identifier '${integration}' not found`);
        }
        await this.setSocialIntegrationConfig(integrationProvider, orgId, customerId);
        return integrationProvider;
    }
    getAllowedArticlesIntegrations() {
        return articleIntegrationList.map((p) => p.identifier);
    }
    getArticlesIntegration(integration) {
        return articleIntegrationList.find((i) => i.identifier === integration);
    }
    async setSocialIntegrationConfig(socialIntegration, orgId, customerId) {
        if (socialIntegration && orgId) {
            try {
                // Fetch the platform configuration using `await`
                const config = await this._socialMediaPlatformConfigService.getPlatformConfig(socialIntegration.identifier, orgId, customerId ?? undefined);
                // Transform the `config` array into a key-value object
                if (config?.config) {
                    const configObject = config.config.reduce((acc, item) => {
                        acc[item.key] = item.value;
                        return acc;
                    }, {});
                    // Set the configuration on the socialIntegration object if `setConfig` exists
                    if (typeof socialIntegration.setConfig === 'function') {
                        socialIntegration.setConfig(configObject);
                    }
                }
                else {
                    throw new Error(`${socialIntegration.identifier} Configuration not found`);
                }
            }
            catch (error) {
                throw new Error(`Error fetching platform config for ${socialIntegration.identifier}`);
            }
        }
    }
};
exports.IntegrationManager = IntegrationManager;
exports.IntegrationManager = IntegrationManager = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof social_media_platform_config_service_1.SocialMediaPlatformConfigService !== "undefined" && social_media_platform_config_service_1.SocialMediaPlatformConfigService) === "function" ? _a : Object])
], IntegrationManager);


/***/ }),
/* 59 */
/***/ ((module) => {

module.exports = require("reflect-metadata");

/***/ }),
/* 60 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.XProvider = void 0;
const tslib_1 = __webpack_require__(3);
const twitter_api_v2_1 = __webpack_require__(61);
const mime_types_1 = __webpack_require__(51);
const sharp_1 = tslib_1.__importDefault(__webpack_require__(62));
const read_or_fetch_1 = __webpack_require__(63);
const remove_markdown_1 = tslib_1.__importDefault(__webpack_require__(64));
const social_abstract_1 = __webpack_require__(65);
const plug_decorator_1 = __webpack_require__(67);
const client_1 = __webpack_require__(11);
const timer_1 = __webpack_require__(66);
const post_plug_1 = __webpack_require__(68);
class XProvider extends social_abstract_1.SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'x';
        this.name = 'X';
        this.isBetweenSteps = false;
        this.scopes = [];
        this.toolTip = 'You will be logged in into your current account, if you would like a different account, change it first on X';
        this.config = {
            X_API_KEY: process.env.X_API_KEY || '',
            X_API_SECRET: process.env.X_API_SECRET || '',
        };
    }
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    getConfig() {
        return this.config;
    }
    async autoRepostPost(integration, id, fields) {
        // @ts-ignore
        // eslint-disable-next-line prefer-rest-params
        const [accessTokenSplit, accessSecretSplit] = integration.token.split(':');
        const client = new twitter_api_v2_1.TwitterApi({
            appKey: this.config.X_API_KEY,
            appSecret: this.config.X_API_SECRET,
            accessToken: accessTokenSplit,
            accessSecret: accessSecretSplit,
        });
        if ((await client.v2.tweetLikedBy(id)).meta.result_count >=
            +fields.likesAmount) {
            await (0, timer_1.timer)(2000);
            await client.v2.retweet(integration.internalId, id);
            return true;
        }
        return false;
    }
    async repostPostUsers(integration, originalIntegration, postId, information) {
        const [accessTokenSplit, accessSecretSplit] = integration.token.split(':');
        const client = new twitter_api_v2_1.TwitterApi({
            appKey: this.config.X_API_KEY,
            appSecret: this.config.X_API_SECRET,
            accessToken: accessTokenSplit,
            accessSecret: accessSecretSplit,
        });
        const { data: { id }, } = await client.v2.me();
        try {
            await client.v2.retweet(id, postId);
        }
        catch (err) {
            /** nothing **/
        }
    }
    async autoPlugPost(integration, id, fields) {
        // @ts-ignore
        // eslint-disable-next-line prefer-rest-params
        const [accessTokenSplit, accessSecretSplit] = integration.token.split(':');
        const client = new twitter_api_v2_1.TwitterApi({
            appKey: this.config.X_API_KEY,
            appSecret: this.config.X_API_SECRET,
            accessToken: accessTokenSplit,
            accessSecret: accessSecretSplit,
        });
        if ((await client.v2.tweetLikedBy(id)).meta.result_count >=
            +fields.likesAmount) {
            await (0, timer_1.timer)(2000);
            await client.v2.tweet({
                text: (0, remove_markdown_1.default)(fields.post.replace('\n', '𝔫𝔢𝔴𝔩𝔦𝔫𝔢')).replace('𝔫𝔢𝔴𝔩𝔦𝔫𝔢', '\n'),
                reply: { in_reply_to_tweet_id: id },
            });
            return true;
        }
        return false;
    }
    async refreshToken() {
        return {
            id: '',
            name: '',
            accessToken: '',
            refreshToken: '',
            expiresIn: 0,
            picture: '',
            username: '',
        };
    }
    async generateAuthUrl(clientInformation, customerId) {
        const client = new twitter_api_v2_1.TwitterApi({
            appKey: this.config.X_API_KEY,
            appSecret: this.config.X_API_SECRET,
        });
        const { url, oauth_token, oauth_token_secret } = await client.generateAuthLink(process.env.FRONTEND_URL + `/integrations/social/x?customerId=${customerId}`, {
            authAccessType: 'write',
            linkMode: 'authenticate',
            forceLogin: false,
        });
        return {
            url,
            codeVerifier: oauth_token + ':' + oauth_token_secret,
            state: oauth_token,
        };
    }
    async authenticate(params) {
        const { code, codeVerifier } = params;
        const [oauth_token, oauth_token_secret] = codeVerifier.split(':');
        const startingClient = new twitter_api_v2_1.TwitterApi({
            appKey: this.config.X_API_KEY,
            appSecret: this.config.X_API_SECRET,
            accessToken: oauth_token,
            accessSecret: oauth_token_secret,
        });
        const { accessToken, client, accessSecret } = await startingClient.login(code);
        const { data: { username, verified, profile_image_url, name, id }, } = await client.v2.me({
            'user.fields': [
                'username',
                'verified',
                'verified_type',
                'profile_image_url',
                'name',
            ],
        });
        return {
            id: String(id),
            accessToken: accessToken + ':' + accessSecret,
            name,
            refreshToken: '',
            expiresIn: 999999999,
            picture: profile_image_url,
            username,
            additionalSettings: [
                {
                    title: 'Verified',
                    description: 'Is this a verified user? (Premium)',
                    type: 'checkbox',
                    value: verified,
                },
            ],
        };
    }
    async post(id, accessToken, postDetails) {
        const [accessTokenSplit, accessSecretSplit] = accessToken.split(':');
        const client = new twitter_api_v2_1.TwitterApi({
            appKey: this.config.X_API_KEY,
            appSecret: this.config.X_API_SECRET,
            accessToken: accessTokenSplit,
            accessSecret: accessSecretSplit,
        });
        const { data: { username }, } = await client.v2.me({
            'user.fields': 'username',
        });
        // upload everything before, you don't want it to fail between the posts
        const uploadAll = (await Promise.all(postDetails.flatMap((p) => p?.media?.flatMap(async (m) => {
            return {
                id: await client.v1.uploadMedia(m.url.indexOf('mp4') > -1
                    ? Buffer.from(await (0, read_or_fetch_1.readOrFetch)(m.url))
                    : await (0, sharp_1.default)(await (0, read_or_fetch_1.readOrFetch)(m.url), {
                        animated: (0, mime_types_1.lookup)(m.url) === 'image/gif',
                    })
                        .resize({
                        width: 1000,
                    })
                        .gif()
                        .toBuffer(), {
                    mimeType: (0, mime_types_1.lookup)(m.url) || '',
                }),
                postId: p.id,
            };
        })))).reduce((acc, val) => {
            if (!val?.id) {
                return acc;
            }
            acc[val.postId] = acc[val.postId] || [];
            acc[val.postId].push(val.id);
            return acc;
        }, {});
        const ids = [];
        for (const post of postDetails) {
            const media_ids = (uploadAll[post.id] || []).filter((f) => f);
            // @ts-ignore
            const { data } = await client.v2.tweet({
                text: (0, remove_markdown_1.default)(post.message.replace('\n', '𝔫𝔢𝔴𝔩𝔦𝔫𝔢')).replace('𝔫𝔢𝔴𝔩𝔦𝔫𝔢', '\n'),
                ...(media_ids.length ? { media: { media_ids } } : {}),
                ...(ids.length
                    ? { reply: { in_reply_to_tweet_id: ids[ids.length - 1].postId } }
                    : {}),
            });
            ids.push({
                postId: data.id,
                id: post.id,
                releaseURL: `https://twitter.com/${username}/status/${data.id}`,
            });
        }
        return ids.map((p) => ({
            ...p,
            status: 'posted',
        }));
    }
}
exports.XProvider = XProvider;
tslib_1.__decorate([
    (0, plug_decorator_1.Plug)({
        identifier: 'x-autoRepostPost',
        title: 'Auto Repost Posts',
        description: 'When a post reached a certain number of likes, repost it to increase engagement (1 week old posts)',
        runEveryMilliseconds: 21600000,
        totalRuns: 3,
        fields: [
            {
                name: 'likesAmount',
                type: 'number',
                placeholder: 'Amount of likes',
                description: 'The amount of likes to trigger the repost',
                validation: /^\d+$/,
            },
        ],
    }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof client_1.Integration !== "undefined" && client_1.Integration) === "function" ? _a : Object, String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], XProvider.prototype, "autoRepostPost", null);
tslib_1.__decorate([
    (0, post_plug_1.PostPlug)({
        identifier: 'x-repost-post-users',
        title: 'Add Re-posters',
        description: 'Add accounts to repost your post',
        pickIntegration: ['x'],
        fields: [],
    }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_b = typeof client_1.Integration !== "undefined" && client_1.Integration) === "function" ? _b : Object, typeof (_c = typeof client_1.Integration !== "undefined" && client_1.Integration) === "function" ? _c : Object, String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], XProvider.prototype, "repostPostUsers", null);
tslib_1.__decorate([
    (0, plug_decorator_1.Plug)({
        identifier: 'x-autoPlugPost',
        title: 'Auto plug post',
        description: 'When a post reached a certain number of likes, add another post to it so you followers get a notification about your promotion',
        runEveryMilliseconds: 21600000,
        totalRuns: 3,
        fields: [
            {
                name: 'likesAmount',
                type: 'number',
                placeholder: 'Amount of likes',
                description: 'The amount of likes to trigger the repost',
                validation: /^\d+$/,
            },
            {
                name: 'post',
                type: 'richtext',
                placeholder: 'Post to plug',
                description: 'Message content to plug',
                validation: /^[\s\S]{3,}$/g,
            },
        ],
    }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_d = typeof client_1.Integration !== "undefined" && client_1.Integration) === "function" ? _d : Object, String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], XProvider.prototype, "autoPlugPost", null);


/***/ }),
/* 61 */
/***/ ((module) => {

module.exports = require("twitter-api-v2");

/***/ }),
/* 62 */
/***/ ((module) => {

module.exports = require("sharp");

/***/ }),
/* 63 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.readOrFetch = void 0;
const tslib_1 = __webpack_require__(3);
const fs_1 = __webpack_require__(55);
const axios_1 = tslib_1.__importDefault(__webpack_require__(53));
const readOrFetch = async (path) => {
    if (path.indexOf('http') === 0) {
        return (await (0, axios_1.default)({
            url: path,
            method: 'GET',
            responseType: 'arraybuffer',
        })).data;
    }
    return (0, fs_1.readFileSync)(path);
};
exports.readOrFetch = readOrFetch;


/***/ }),
/* 64 */
/***/ ((module) => {

module.exports = require("remove-markdown");

/***/ }),
/* 65 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SocialAbstract = exports.NotEnoughScopes = exports.BadBody = exports.RefreshToken = void 0;
const timer_1 = __webpack_require__(66);
class RefreshToken {
    constructor(identifier, json, body) {
        this.identifier = identifier;
        this.json = json;
        this.body = body;
    }
}
exports.RefreshToken = RefreshToken;
class BadBody {
    constructor(identifier, json, body) {
        this.identifier = identifier;
        this.json = json;
        this.body = body;
    }
}
exports.BadBody = BadBody;
class NotEnoughScopes {
    constructor(message = 'Not enough scopes') {
        this.message = message;
    }
}
exports.NotEnoughScopes = NotEnoughScopes;
class SocialAbstract {
    async fetch(url, options = {}, identifier = '', totalRetries = 0) {
        const request = await fetch(url, options);
        if (request.status === 200 || request.status === 201) {
            return request;
        }
        let json = '{}';
        try {
            json = await request.text();
            console.log(json);
        }
        catch (err) {
            json = '{}';
        }
        if (json.includes('rate_limit_exceeded') || json.includes('Rate limit')) {
            await (0, timer_1.timer)(2000);
            return this.fetch(url, options, identifier);
        }
        if (request.status === 401 ||
            (json.includes('OAuthException') &&
                !json.includes('The user is not an Instagram Business') &&
                !json.includes('Unsupported format') &&
                !json.includes('2207018') &&
                !json.includes('REVOKED_ACCESS_TOKEN'))) {
            throw new RefreshToken(identifier, json, options.body);
        }
        if (totalRetries < 2) {
            await (0, timer_1.timer)(2000);
            return this.fetch(url, options, identifier, totalRetries + 1);
        }
        throw new BadBody(identifier, json, options.body);
    }
    checkScopes(required, got) {
        if (Array.isArray(got)) {
            if (!required.every((scope) => got.includes(scope))) {
                throw new NotEnoughScopes();
            }
            return true;
        }
        const newGot = decodeURIComponent(got);
        const splitType = newGot.indexOf(',') > -1 ? ',' : ' ';
        const gotArray = newGot.split(splitType);
        if (!required.every((scope) => gotArray.includes(scope))) {
            throw new NotEnoughScopes();
        }
        return true;
    }
}
exports.SocialAbstract = SocialAbstract;


/***/ }),
/* 66 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.timer = void 0;
const timer = (ms) => new Promise(res => setTimeout(res, ms));
exports.timer = timer;


/***/ }),
/* 67 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Plug = Plug;
__webpack_require__(59);
function Plug(params) {
    return function (target, propertyKey, descriptor) {
        // Retrieve existing metadata or initialize an empty array
        const existingMetadata = Reflect.getMetadata('custom:plug', target) || [];
        // Add the metadata information for this method
        existingMetadata.push({ methodName: propertyKey, ...params });
        // Define metadata on the class prototype (so it can be retrieved from the class)
        Reflect.defineMetadata('custom:plug', existingMetadata, target);
    };
}


/***/ }),
/* 68 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PostPlug = PostPlug;
__webpack_require__(59);
function PostPlug(params) {
    return function (target, propertyKey, descriptor) {
        // Retrieve existing metadata or initialize an empty array
        const existingMetadata = Reflect.getMetadata('custom:internal_plug', target) || [];
        // Add the metadata information for this method
        existingMetadata.push({ methodName: propertyKey, ...params });
        // Define metadata on the class prototype (so it can be retrieved from the class)
        Reflect.defineMetadata('custom:internal_plug', existingMetadata, target);
    };
}


/***/ }),
/* 69 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LinkedinProvider = void 0;
const tslib_1 = __webpack_require__(3);
const make_is_1 = __webpack_require__(27);
const sharp_1 = tslib_1.__importDefault(__webpack_require__(62));
const mime_types_1 = __webpack_require__(51);
const read_or_fetch_1 = __webpack_require__(63);
const social_abstract_1 = __webpack_require__(65);
const client_1 = __webpack_require__(11);
const post_plug_1 = __webpack_require__(68);
class LinkedinProvider extends social_abstract_1.SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'linkedin';
        this.name = 'LinkedIn';
        this.oneTimeToken = true;
        this.isBetweenSteps = false;
        this.scopes = [
            'openid',
            'profile',
            'w_member_social',
            'r_basicprofile',
            'rw_organization_admin',
            'w_organization_social',
            'r_organization_social',
        ];
        this.refreshWait = true;
        this.config = {
            LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID || '',
            LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET || '',
        };
    }
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    getConfig() {
        return this.config;
    }
    async refreshToken(refresh_token) {
        const { access_token: accessToken, refresh_token: refreshToken, expires_in, } = await (await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token,
                client_id: this.config.LINKEDIN_CLIENT_ID,
                client_secret: this.config.LINKEDIN_CLIENT_SECRET,
            }),
        })).json();
        const { vanityName } = await (await this.fetch('https://api.linkedin.com/v2/me', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })).json();
        const { name, sub: id, picture, } = await (await this.fetch('https://api.linkedin.com/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })).json();
        return {
            id,
            accessToken,
            refreshToken,
            expiresIn: expires_in,
            name,
            picture,
            username: vanityName,
        };
    }
    async generateAuthUrl(clientInformation, customerId) {
        // const state = makeId(6);
        const state = `customerId:${customerId},uniqueState:${(0, make_is_1.makeId)(6)}`;
        const codeVerifier = (0, make_is_1.makeId)(30);
        const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${this.config.LINKEDIN_CLIENT_ID}&prompt=none&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/linkedin`)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(this.scopes.join(' '))}`;
        return {
            url,
            codeVerifier,
            state,
        };
    }
    async authenticate(params) {
        const body = new URLSearchParams();
        body.append('grant_type', 'authorization_code');
        body.append('code', params.code);
        body.append('redirect_uri', `${process.env.FRONTEND_URL}/integrations/social/linkedin${params.refresh ? `?refresh=${params.refresh}` : ''}`);
        body.append('client_id', this.config.LINKEDIN_CLIENT_ID);
        body.append('client_secret', this.config.LINKEDIN_CLIENT_SECRET);
        const { access_token: accessToken, expires_in: expiresIn, refresh_token: refreshToken, scope, } = await (await this.fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
        })).json();
        this.checkScopes(this.scopes, scope);
        const { name, sub: id, picture, } = await (await this.fetch('https://api.linkedin.com/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })).json();
        const { vanityName } = await (await this.fetch('https://api.linkedin.com/v2/me', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })).json();
        return {
            id,
            accessToken,
            refreshToken,
            expiresIn,
            name,
            picture,
            username: vanityName,
        };
    }
    async company(token, data) {
        const { url } = data;
        const getCompanyVanity = url.match(/^https?:\/\/(?:www\.)?linkedin\.com\/company\/([^/]+)\/?$/);
        if (!getCompanyVanity || !getCompanyVanity?.length) {
            throw new Error('Invalid LinkedIn company URL');
        }
        const { elements } = await (await this.fetch(`https://api.linkedin.com/rest/organizations?q=vanityName&vanityName=${getCompanyVanity[1]}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': '202402',
                Authorization: `Bearer ${token}`,
            },
        })).json();
        return {
            options: elements.map((e) => ({
                label: e.localizedName,
                value: `@[${e.localizedName}](urn:li:organization:${e.id})`,
            }))?.[0],
        };
    }
    async uploadPicture(fileName, accessToken, personId, picture, type = 'personal') {
        const { value: { uploadUrl, image, video, uploadInstructions, ...all }, } = await (await this.fetch(`https://api.linkedin.com/rest/${fileName.indexOf('mp4') > -1 ? 'videos' : 'images'}?action=initializeUpload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': '202402',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                initializeUploadRequest: {
                    owner: type === 'personal'
                        ? `urn:li:person:${personId}`
                        : `urn:li:organization:${personId}`,
                    ...(fileName.indexOf('mp4') > -1
                        ? {
                            fileSizeBytes: picture.length,
                            uploadCaptions: false,
                            uploadThumbnail: false,
                        }
                        : {}),
                },
            }),
        })).json();
        const sendUrlRequest = uploadInstructions?.[0]?.uploadUrl || uploadUrl;
        const finalOutput = video || image;
        const etags = [];
        for (let i = 0; i < picture.length; i += 1024 * 1024 * 2) {
            const upload = await this.fetch(sendUrlRequest, {
                method: 'PUT',
                headers: {
                    'X-Restli-Protocol-Version': '2.0.0',
                    'LinkedIn-Version': '202402',
                    Authorization: `Bearer ${accessToken}`,
                    ...(fileName.indexOf('mp4') > -1
                        ? { 'Content-Type': 'application/octet-stream' }
                        : {}),
                },
                body: picture.slice(i, i + 1024 * 1024 * 2),
            });
            etags.push(upload.headers.get('etag'));
        }
        if (fileName.indexOf('mp4') > -1) {
            const a = await this.fetch('https://api.linkedin.com/rest/videos?action=finalizeUpload', {
                method: 'POST',
                body: JSON.stringify({
                    finalizeUploadRequest: {
                        video,
                        uploadToken: '',
                        uploadedPartIds: etags,
                    },
                }),
                headers: {
                    'X-Restli-Protocol-Version': '2.0.0',
                    'LinkedIn-Version': '202402',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
            });
        }
        return finalOutput;
    }
    fixText(text) {
        const pattern = /@\[.+?]\(urn:li:organization.+?\)/g;
        const matches = text.match(pattern) || [];
        const splitAll = text.split(pattern);
        const splitTextReformat = splitAll.map((p) => {
            return p
                .replace(/\\/g, '\\\\')
                .replace(/</g, '\\<')
                .replace(/>/g, '\\>')
                .replace(/#/g, '\\#')
                .replace(/~/g, '\\~')
                .replace(/_/g, '\\_')
                .replace(/\|/g, '\\|')
                .replace(/\[/g, '\\[')
                .replace(/]/g, '\\]')
                .replace(/\*/g, '\\*')
                .replace(/\(/g, '\\(')
                .replace(/\)/g, '\\)')
                .replace(/\{/g, '\\{')
                .replace(/}/g, '\\}')
                .replace(/@/g, '\\@');
        });
        const connectAll = splitTextReformat.reduce((all, current) => {
            const match = matches.shift();
            all.push(current);
            if (match) {
                all.push(match);
            }
            return all;
        }, []);
        return connectAll.join('');
    }
    async post(id, accessToken, postDetails, integration, type = 'personal') {
        const [firstPost, ...restPosts] = postDetails;
        const uploadAll = (await Promise.all(postDetails.flatMap((p) => p?.media?.flatMap(async (m) => {
            return {
                id: await this.uploadPicture(m.url, accessToken, id, m.url.indexOf('mp4') > -1
                    ? Buffer.from(await (0, read_or_fetch_1.readOrFetch)(m.url))
                    : await (0, sharp_1.default)(await (0, read_or_fetch_1.readOrFetch)(m.url), {
                        animated: (0, mime_types_1.lookup)(m.url) === 'image/gif',
                    })
                        .toFormat('jpeg')
                        .resize({
                        width: 1000,
                    })
                        .toBuffer(), type),
                postId: p.id,
            };
        })))).reduce((acc, val) => {
            if (!val?.id) {
                return acc;
            }
            acc[val.postId] = acc[val.postId] || [];
            acc[val.postId].push(val.id);
            return acc;
        }, {});
        const media_ids = (uploadAll[firstPost.id] || []).filter((f) => f);
        const data = await this.fetch('https://api.linkedin.com/v2/posts', {
            method: 'POST',
            headers: {
                'X-Restli-Protocol-Version': '2.0.0',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                author: type === 'personal'
                    ? `urn:li:person:${id}`
                    : `urn:li:organization:${id}`,
                commentary: this.fixText(firstPost.message),
                visibility: 'PUBLIC',
                distribution: {
                    feedDistribution: 'MAIN_FEED',
                    targetEntities: [],
                    thirdPartyDistributionChannels: [],
                },
                ...(media_ids.length > 0
                    ? {
                        content: {
                            ...(media_ids.length === 0
                                ? {}
                                : media_ids.length === 1
                                    ? {
                                        media: {
                                            id: media_ids[0],
                                        },
                                    }
                                    : {
                                        multiImage: {
                                            images: media_ids.map((id) => ({
                                                id,
                                            })),
                                        },
                                    }),
                        },
                    }
                    : {}),
                lifecycleState: 'PUBLISHED',
                isReshareDisabledByAuthor: false,
            }),
        });
        if (data.status !== 201 && data.status !== 200) {
            throw new Error('Error posting to LinkedIn');
        }
        const topPostId = data.headers.get('x-restli-id');
        const ids = [
            {
                status: 'posted',
                postId: topPostId,
                id: firstPost.id,
                releaseURL: `https://www.linkedin.com/feed/update/${topPostId}`,
            },
        ];
        for (const post of restPosts) {
            const { object } = await (await this.fetch(`https://api.linkedin.com/v2/socialActions/${decodeURIComponent(topPostId)}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    actor: type === 'personal'
                        ? `urn:li:person:${id}`
                        : `urn:li:organization:${id}`,
                    object: topPostId,
                    message: {
                        text: this.fixText(post.message),
                    },
                }),
            })).json();
            ids.push({
                status: 'posted',
                postId: object,
                id: post.id,
                releaseURL: `https://www.linkedin.com/embed/feed/update/${object}`,
            });
        }
        return ids;
    }
    async repostPostUsers(integration, originalIntegration, postId, information, isPersonal = true) {
        try {
            await this.fetch(`https://api.linkedin.com/rest/posts`, {
                body: JSON.stringify({
                    author: (isPersonal ? 'urn:li:person:' : `urn:li:organization:`) +
                        `${integration.internalId}`,
                    commentary: '',
                    visibility: 'PUBLIC',
                    distribution: {
                        feedDistribution: 'MAIN_FEED',
                        targetEntities: [],
                        thirdPartyDistributionChannels: [],
                    },
                    lifecycleState: 'PUBLISHED',
                    isReshareDisabledByAuthor: false,
                    reshareContext: {
                        parent: postId,
                    },
                }),
                method: 'POST',
                headers: {
                    'X-Restli-Protocol-Version': '2.0.0',
                    'Content-Type': 'application/json',
                    'LinkedIn-Version': '202402',
                    Authorization: `Bearer ${integration.token}`,
                },
            });
        }
        catch (err) {
            return;
        }
    }
}
exports.LinkedinProvider = LinkedinProvider;
tslib_1.__decorate([
    (0, post_plug_1.PostPlug)({
        identifier: 'linkedin-repost-post-users',
        title: 'Add Re-posters',
        description: 'Add accounts to repost your post',
        pickIntegration: ['linkedin', 'linkedin-page'],
        fields: [],
    }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof client_1.Integration !== "undefined" && client_1.Integration) === "function" ? _a : Object, typeof (_b = typeof client_1.Integration !== "undefined" && client_1.Integration) === "function" ? _b : Object, String, Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], LinkedinProvider.prototype, "repostPostUsers", null);


/***/ }),
/* 70 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RedditProvider = void 0;
const make_is_1 = __webpack_require__(27);
const timer_1 = __webpack_require__(66);
const lodash_1 = __webpack_require__(12);
const social_abstract_1 = __webpack_require__(65);
class RedditProvider extends social_abstract_1.SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'reddit';
        this.name = 'Reddit';
        this.isBetweenSteps = false;
        this.scopes = ['read', 'identity', 'submit', 'flair'];
    }
    async refreshToken(refreshToken) {
        const { access_token: accessToken, refresh_token: newRefreshToken, expires_in: expiresIn, } = await (await this.fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64')}`,
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }),
        })).json();
        const { name, id, icon_img } = await (await this.fetch('https://oauth.reddit.com/api/v1/me', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })).json();
        return {
            id,
            name,
            accessToken,
            refreshToken: newRefreshToken,
            expiresIn,
            picture: icon_img.split('?')[0],
            username: name,
        };
    }
    async generateAuthUrl() {
        const state = (0, make_is_1.makeId)(6);
        const codeVerifier = (0, make_is_1.makeId)(30);
        const url = `https://www.reddit.com/api/v1/authorize?client_id=${process.env.REDDIT_CLIENT_ID}&response_type=code&state=${state}&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/reddit`)}&duration=permanent&scope=${encodeURIComponent(this.scopes.join(' '))}`;
        return {
            url,
            codeVerifier,
            state,
        };
    }
    async authenticate(params) {
        const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn, scope, } = await (await this.fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64')}`,
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: params.code,
                redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/reddit`,
            }),
        })).json();
        this.checkScopes(this.scopes, scope);
        const { name, id, icon_img } = await (await this.fetch('https://oauth.reddit.com/api/v1/me', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })).json();
        return {
            id,
            name,
            accessToken,
            refreshToken,
            expiresIn,
            picture: icon_img.split('?')[0],
            username: name,
        };
    }
    async post(id, accessToken, postDetails) {
        const [post, ...rest] = postDetails;
        const valueArray = [];
        for (const firstPostSettings of post.settings.subreddit) {
            const postData = {
                api_type: 'json',
                title: firstPostSettings.value.title || '',
                kind: firstPostSettings.value.type === 'media'
                    ? 'image'
                    : firstPostSettings.value.type,
                ...(firstPostSettings.value.flair
                    ? { flair_id: firstPostSettings.value.flair.id }
                    : {}),
                ...(firstPostSettings.value.type === 'link'
                    ? {
                        url: firstPostSettings.value.url,
                    }
                    : {}),
                ...(firstPostSettings.value.type === 'media'
                    ? {
                        url: `${firstPostSettings.value.media[0].path.indexOf('http') === -1
                            ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads`
                            : ``}${firstPostSettings.value.media[0].path}`,
                    }
                    : {}),
                text: post.message,
                sr: firstPostSettings.value.subreddit,
            };
            const { json: { data: { id, name, url }, }, } = await (await this.fetch('https://oauth.reddit.com/api/submit', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(postData),
            })).json();
            valueArray.push({
                postId: id,
                releaseURL: url,
                id: post.id,
                status: 'published',
            });
            for (const comment of rest) {
                const { json: { data: { things: [{ data: { id: commentId, permalink }, },], }, }, } = await (await this.fetch('https://oauth.reddit.com/api/comment', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        text: comment.message,
                        thing_id: name,
                        api_type: 'json',
                    }),
                })).json();
                // console.log(JSON.stringify(allTop, null, 2), JSON.stringify(allJson, null, 2), JSON.stringify(allData, null, 2));
                valueArray.push({
                    postId: commentId,
                    releaseURL: 'https://www.reddit.com' + permalink,
                    id: comment.id,
                    status: 'published',
                });
                if (rest.length > 1) {
                    await (0, timer_1.timer)(5000);
                }
            }
            if (post.settings.subreddit.length > 1) {
                await (0, timer_1.timer)(5000);
            }
        }
        return Object.values((0, lodash_1.groupBy)(valueArray, (p) => p.id)).map((p) => ({
            id: p[0].id,
            postId: p.map((p) => p.postId).join(','),
            releaseURL: p.map((p) => p.releaseURL).join(','),
            status: 'published',
        }));
    }
    async subreddits(accessToken, data) {
        const { data: { children }, } = await (await this.fetch(`https://oauth.reddit.com/subreddits/search?show=public&q=${data.word}&sort=activity&show_users=false&limit=10`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        })).json();
        return children
            .filter(({ data }) => data.subreddit_type === 'public' && data.submission_type !== 'image')
            .map(({ data: { title, url, id } }) => ({
            title,
            name: url,
            id,
        }));
    }
    getPermissions(submissionType, allow_images) {
        const permissions = [];
        if (['any', 'self'].indexOf(submissionType) > -1) {
            permissions.push('self');
        }
        if (['any', 'link'].indexOf(submissionType) > -1) {
            permissions.push('link');
        }
        // if (submissionType === 'any' || allow_images) {
        //   permissions.push('media');
        // }
        return permissions;
    }
    async restrictions(accessToken, data) {
        const { data: { submission_type, allow_images }, } = await (await this.fetch(`https://oauth.reddit.com/${data.subreddit}/about`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        })).json();
        const { is_flair_required } = await (await this.fetch(`https://oauth.reddit.com/api/v1/${data.subreddit.split('/r/')[1]}/post_requirements`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        })).json();
        // eslint-disable-next-line no-async-promise-executor
        const newData = await new Promise(async (res) => {
            try {
                const flair = await (await this.fetch(`https://oauth.reddit.com/${data.subreddit}/api/link_flair_v2`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                })).json();
                res(flair);
            }
            catch (err) {
                return res([]);
            }
        });
        return {
            subreddit: data.subreddit,
            allow: this.getPermissions(submission_type, allow_images),
            is_flair_required,
            flairs: newData?.map?.((p) => ({
                id: p.id,
                name: p.text,
            })) || [],
        };
    }
}
exports.RedditProvider = RedditProvider;


/***/ }),
/* 71 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DevToProvider = void 0;
class DevToProvider {
    constructor() {
        this.identifier = 'devto';
        this.name = 'Dev.to';
    }
    async authenticate(token) {
        const { name, id, profile_image, username } = await (await fetch('https://dev.to/api/users/me', {
            headers: {
                'api-key': token,
            },
        })).json();
        return {
            id,
            name,
            token,
            picture: profile_image,
            username
        };
    }
    async tags(token) {
        const tags = await (await fetch('https://dev.to/api/tags?per_page=1000&page=1', {
            headers: {
                'api-key': token,
            },
        })).json();
        return tags.map((p) => ({ value: p.id, label: p.name }));
    }
    async organizations(token) {
        const orgs = await (await fetch('https://dev.to/api/articles/me/all?per_page=1000', {
            headers: {
                'api-key': token,
            },
        })).json();
        const allOrgs = [
            ...new Set(orgs
                .flatMap((org) => org?.organization?.username)
                .filter((f) => f)),
        ];
        const fullDetails = await Promise.all(allOrgs.map(async (org) => {
            return (await fetch(`https://dev.to/api/organizations/${org}`, {
                headers: {
                    'api-key': token,
                },
            })).json();
        }));
        return fullDetails.map((org) => ({
            id: org.id,
            name: org.name,
            username: org.username,
        }));
    }
    async post(token, content, settings) {
        const { id, url } = await (await fetch(`https://dev.to/api/articles`, {
            method: 'POST',
            body: JSON.stringify({
                article: {
                    title: settings.title,
                    body_markdown: content,
                    published: true,
                    main_image: settings?.main_image?.path
                        ? `${settings?.main_image?.path.indexOf('http') === -1
                            ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/${process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY}`
                            : ``}${settings?.main_image?.path}`
                        : undefined,
                    tags: settings?.tags?.map((t) => t.label),
                    organization_id: settings.organization,
                },
            }),
            headers: {
                'Content-Type': 'application/json',
                'api-key': token,
            },
        })).json();
        return {
            postId: String(id),
            releaseURL: url,
        };
    }
}
exports.DevToProvider = DevToProvider;


/***/ }),
/* 72 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.HashnodeProvider = void 0;
const hashnode_tags_1 = __webpack_require__(73);
const json_to_graphql_query_1 = __webpack_require__(74);
class HashnodeProvider {
    constructor() {
        this.identifier = 'hashnode';
        this.name = 'Hashnode';
    }
    async authenticate(token) {
        try {
            const { data: { me: { name, id, profilePicture, username }, }, } = await (await fetch('https://gql.hashnode.com', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `${token}`,
                },
                body: JSON.stringify({
                    query: `
                    query {
                      me {
                        name,
                        id,
                        profilePicture
                        username
                      }
                    }
                `,
                }),
            })).json();
            return {
                id,
                name,
                token,
                picture: profilePicture,
                username
            };
        }
        catch (err) {
            return {
                id: '',
                name: '',
                token: '',
                picture: '',
                username: ''
            };
        }
    }
    async tags() {
        return hashnode_tags_1.tags.map((tag) => ({ value: tag.objectID, label: tag.name }));
    }
    async publications(token) {
        const { data: { me: { publications: { edges }, }, }, } = await (await fetch('https://gql.hashnode.com', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `${token}`,
            },
            body: JSON.stringify({
                query: `
            query {
              me {
                publications (first: 50) {
                  edges{
                    node {
                      id
                      title
                    }
                  }
                }
              }
            }
                `,
            }),
        })).json();
        return edges.map(({ node: { id, title } }) => ({
            id,
            name: title,
        }));
    }
    async post(token, content, settings) {
        const query = (0, json_to_graphql_query_1.jsonToGraphQLQuery)({
            mutation: {
                publishPost: {
                    __args: {
                        input: {
                            title: settings.title,
                            publicationId: settings.publication,
                            ...(settings.canonical
                                ? { originalArticleURL: settings.canonical }
                                : {}),
                            contentMarkdown: content,
                            tags: settings.tags.map((tag) => ({ id: tag.value })),
                            ...(settings.subtitle ? { subtitle: settings.subtitle } : {}),
                            ...(settings.main_image
                                ? {
                                    coverImageOptions: {
                                        coverImageURL: `${settings?.main_image?.path?.indexOf('http') === -1
                                            ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/${process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY}`
                                            : ``}${settings?.main_image?.path}`,
                                    },
                                }
                                : {}),
                        },
                    },
                    post: {
                        id: true,
                        url: true,
                    },
                },
            },
        }, { pretty: true });
        const { data: { publishPost: { post: { id, url }, }, }, } = await (await fetch('https://gql.hashnode.com', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `${token}`,
            },
            body: JSON.stringify({
                query,
            }),
        })).json();
        return {
            postId: id,
            releaseURL: url,
        };
    }
}
exports.HashnodeProvider = HashnodeProvider;


/***/ }),
/* 73 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.tags = void 0;
exports.tags = [
    {
        "name": "JavaScript",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1513320898547/BJjpblWfG.png",
        "slug": "javascript",
        "objectID": "56744721958ef13879b94cad"
    },
    {
        "name": "General Programming",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1535648192079/H1daWiBvQ.png",
        "slug": "programming",
        "objectID": "56744721958ef13879b94c7e"
    },
    {
        "name": "React",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1513321478077/ByCWNxZMf.png",
        "slug": "reactjs",
        "objectID": "56744723958ef13879b95434"
    },
    {
        "name": "Web Development",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450469658/vdxecajl3uwbprclsctm.jpg",
        "slug": "web-development",
        "objectID": "56744722958ef13879b94f1b"
    },
    {
        "name": "Python",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1534512408213/rJeQpSNIX.png",
        "slug": "python",
        "objectID": "56744721958ef13879b94d67"
    },
    {
        "name": "Node.js",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1513321388034/SJV3QgWfz.png",
        "slug": "nodejs",
        "objectID": "56744722958ef13879b94ffb"
    },
    {
        "name": "CSS",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1513316949083/By6UMkbfG.png",
        "slug": "css",
        "objectID": "56744721958ef13879b94b91"
    },
    {
        "name": "beginners",
        "slug": "beginners",
        "objectID": "56744723958ef13879b955a9"
    },
    {
        "name": "Java",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1534512378322/H1gM-pH4UQ.png",
        "slug": "java",
        "objectID": "56744721958ef13879b94c9f"
    },
    {
        "name": "Developer",
        "slug": "developer",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1554321431158/MqVqSHr8Q.jpeg",
        "objectID": "56744723958ef13879b952d7"
    },
    {
        "name": "HTML5",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1513322217442/SkZlDeWzz.png",
        "slug": "html5",
        "objectID": "56744723958ef13879b95483"
    },
    {
        "name": "2Articles1Week",
        "slug": "2articles1week",
        "logo": "",
        "objectID": "5f058ab0c9763d47e2d2eedc"
    },
    {
        "name": "learning",
        "slug": "learning",
        "objectID": "56744723958ef13879b9532b"
    },
    {
        "name": "PHP",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1513177307594/rJ4Jba0-G.png",
        "slug": "php",
        "objectID": "56744722958ef13879b94fd9"
    },
    {
        "name": "AWS",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450468151/vmrnzobr1lonnigttn3c.png",
        "slug": "aws",
        "objectID": "56744721958ef13879b94bc5"
    },
    {
        "name": "Tutorial",
        "slug": "tutorial",
        "objectID": "56744720958ef13879b947ce"
    },
    {
        "name": "programming blogs",
        "slug": "programming-blogs",
        "objectID": "56744721958ef13879b94ae7"
    },
    {
        "name": "coding",
        "slug": "coding",
        "objectID": "56744723958ef13879b954c1"
    },
    {
        "name": "Go Language",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1534512687168/S1D40rVLm.png",
        "slug": "go",
        "objectID": "56744721958ef13879b94bd0"
    },
    {
        "name": "Frontend Development",
        "slug": "frontend-development",
        "objectID": "56a399f292921b8f79d3633c"
    },
    {
        "name": "GitHub",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1513321555902/BkhLElZMG.png",
        "slug": "github",
        "objectID": "56744721958ef13879b94c63"
    },
    {
        "name": "Hashnode",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1619605440273/S3_X4Rf7V.jpeg",
        "slug": "hashnode",
        "objectID": "567ae5a72b926c3063c3061a"
    },
    {
        "name": "Python 3",
        "slug": "python3",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1503468096/axvqxfbcm0b7ourhshj7.jpg",
        "objectID": "56744723958ef13879b95342"
    },
    {
        "name": "Codenewbies",
        "slug": "codenewbies",
        "objectID": "5f22b52283e4e9440619af83"
    },
    {
        "name": "webdev",
        "slug": "webdev",
        "objectID": "56744723958ef13879b952af"
    },
    {
        "name": "Machine Learning",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1513321644252/Sk43El-fz.png",
        "slug": "machine-learning",
        "objectID": "56744722958ef13879b950a8"
    },
    {
        "name": "General Advice",
        "slug": "general-advice",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1516183731966/B13heohVM.jpeg",
        "objectID": "56fe3b2e7a82968f9f7d51c1"
    },
    {
        "name": "software development",
        "slug": "software-development",
        "objectID": "56744721958ef13879b94ad1"
    },
    {
        "name": "CSS3",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1513316988840/r1Htz1Wzz.png",
        "slug": "css3",
        "objectID": "56744721958ef13879b94b21"
    },
    {
        "name": "Android",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450468271/qbj34hxd8981nfdugyph.png",
        "slug": "android",
        "objectID": "56744723958ef13879b953d0"
    },
    {
        "name": "Productivity",
        "slug": "productivity",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1497250361/v3sij4jc8hz9xoic22eq.png",
        "objectID": "56744721958ef13879b94a60"
    },
    {
        "name": "React Native",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1475235386/rkij45wit50lfpkbte5q.jpg",
        "slug": "react-native",
        "objectID": "56744722958ef13879b94f4d"
    },
    {
        "name": "100DaysOfCode",
        "slug": "100daysofcode",
        "objectID": "576ab68f152618ad1dc938ad"
    },
    {
        "name": "Design",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1513324674454/r1qtxW-zf.png",
        "slug": "design",
        "objectID": "56744722958ef13879b94e89"
    },
    {
        "name": "Devops",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1496913014/cnvm0znfqcrwelhgtblb.png",
        "slug": "devops",
        "objectID": "56744723958ef13879b9550d"
    },
    {
        "name": "Open Source",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1496913431/hdg1q4zbmobhrq0csomm.png",
        "slug": "opensource",
        "objectID": "56744722958ef13879b94f32"
    },
    {
        "name": "Git",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1473706112/l2hom2y5xxpgwlgg0sz0.jpg",
        "slug": "git",
        "objectID": "56744723958ef13879b9526c"
    },
    {
        "name": "HTML",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1513322147587/Hk2jIxZGG.png",
        "slug": "html",
        "objectID": "56744722958ef13879b94f96"
    },
    {
        "name": "data science",
        "slug": "data-science",
        "objectID": "56744721958ef13879b94e35"
    },
    {
        "name": "Testing",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450619295/xszq3zb8t6rmgg6regon.png",
        "slug": "testing",
        "objectID": "56744723958ef13879b9549b"
    },
    {
        "name": "Linux",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450641462/ogpsvoxw5kt8aksuiptj.png",
        "slug": "linux",
        "objectID": "56744721958ef13879b94b55"
    },
    {
        "name": "Security",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1472744837/bnzk4gvspiy66dsmw9ku.png",
        "slug": "security",
        "objectID": "56744722958ef13879b94fb7"
    },
    {
        "name": "Laravel",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1454754733/exjubzyuvwz0pvvpxxwv.jpg",
        "slug": "laravel",
        "objectID": "56744721958ef13879b94a83"
    },
    {
        "name": "TypeScript",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1470054384/fuy3ypcjuj4cwdz4qpxn.jpg",
        "slug": "typescript",
        "objectID": "56744723958ef13879b954e0"
    },
    {
        "name": "APIs",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450468334/jirjz7cc54l2mstzpaab.png",
        "slug": "apis",
        "objectID": "56744723958ef13879b95245"
    },
    {
        "name": "Ruby",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1534512722989/BksL0SELm.png",
        "slug": "ruby",
        "objectID": "56744721958ef13879b94c0a"
    },
    {
        "name": "Vue.js",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1505294440/t5igqu22z1s86xa7nkqi.png",
        "slug": "vuejs",
        "objectID": "56744722958ef13879b950e4"
    },
    {
        "name": "technology",
        "slug": "technology",
        "objectID": "56744721958ef13879b94d26"
    },
    {
        "name": "Docker",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1453789075/ryxk99vk41tdn8bo28m4.png",
        "slug": "docker",
        "objectID": "56744721958ef13879b94b77"
    },
    {
        "name": "programming languages",
        "slug": "programming-languages",
        "objectID": "579a67e2cec33eafc07249c7"
    },
    {
        "name": "Programming Tips",
        "slug": "programming-tips",
        "objectID": "5f398753c4d5973f55c912fb"
    },
    {
        "name": "Cloud",
        "slug": "cloud",
        "objectID": "56744721958ef13879b94938"
    },
    {
        "name": "Blogging",
        "slug": "blogging",
        "objectID": "56744721958ef13879b949aa"
    },
    {
        "name": "newbie",
        "slug": "newbie",
        "objectID": "56744720958ef13879b947e8"
    },
    {
        "name": "Career",
        "slug": "career",
        "objectID": "56aa13e5f28f9d9d99e3a5de"
    },
    {
        "name": "Swift",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1534512662717/Sy1XAHNLQ.png",
        "slug": "swift",
        "objectID": "56744722958ef13879b94ead"
    },
    {
        "name": "Flutter Community",
        "slug": "flutter",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1560841840250/KhofPXnAk.jpeg",
        "objectID": "56744722958ef13879b9507c"
    },
    {
        "name": "python beginner",
        "slug": "python-beginner",
        "objectID": "5f3867d1c4d5973f55c90b8b"
    },
    {
        "name": "Software Engineering",
        "slug": "software-engineering",
        "objectID": "569d22c892921b8f79d35f68"
    },
    {
        "name": "learn coding",
        "slug": "learn-coding",
        "objectID": "5f3f40bfdfbb4247f7c14d4c"
    },
    {
        "name": "MongoDB",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450467711/awgzya1xei3pgch5b8xu.png",
        "slug": "mongodb",
        "objectID": "56744722958ef13879b94f6f"
    },
    {
        "name": "iOS",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450468231/t4x2aoglmhhz9yw3ezry.png",
        "slug": "ios",
        "objectID": "56744722958ef13879b94f11"
    },
    {
        "name": "algorithms",
        "slug": "algorithms",
        "objectID": "56744721958ef13879b94a8d"
    },
    {
        "name": "Web Design",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450622407/deczahnypldw1ftbdxog.png",
        "slug": "web-design",
        "objectID": "56744721958ef13879b94d32"
    },
    {
        "name": "Databases",
        "slug": "databases",
        "objectID": "56744722958ef13879b950eb"
    },
    {
        "name": "ES6",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1534512767931/S1dYCSNIm.png",
        "slug": "es6",
        "objectID": "56744723958ef13879b954cb"
    },
    {
        "name": "Learning Journey",
        "slug": "learning-journey",
        "objectID": "5f9435c7fbdce372c9a56fb6"
    },
    {
        "name": "Blockchain",
        "slug": "blockchain",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1540281064342/rkle7U3sQ.png",
        "objectID": "5690224191716a2d1dbadbc1"
    },
    {
        "name": "data structures",
        "slug": "data-structures",
        "objectID": "56744722958ef13879b951bb"
    },
    {
        "name": "Redux",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1513322046756/HyPSUgWMG.png",
        "slug": "redux",
        "objectID": "56744723958ef13879b95567"
    },
    {
        "name": "backend",
        "slug": "backend",
        "objectID": "56744722958ef13879b950bd"
    },
    {
        "name": "C#",
        "slug": "csharp",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1534512595400/HkoATH48Q.png",
        "objectID": "56744721958ef13879b94a30"
    },
    {
        "name": "Startups",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1459504275/iksgbnwvscz6zjzk5nhe.jpg",
        "slug": "startups",
        "objectID": "56744721958ef13879b94b5b"
    },
    {
        "name": "Django",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1475235489/g7q2vh5igqcxo8jlfwl9.jpg",
        "slug": "django",
        "objectID": "56744722958ef13879b94e81"
    },
    {
        "name": "UX",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1474023086/dnrwfr6sxylhx60mp26j.png",
        "slug": "ux",
        "objectID": "56744722958ef13879b94e9d"
    },
    {
        "name": "interview",
        "slug": "interview",
        "objectID": "56744720958ef13879b947e1"
    },
    {
        "name": "Visual Studio Code",
        "slug": "vscode",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1497045716/r3myqwr6m8olahqaxl5x.png",
        "objectID": "57323a8bae9d49b5a5a5b39c"
    },
    {
        "name": "internships",
        "slug": "internships",
        "objectID": "56744720958ef13879b94811"
    },
    {
        "name": "Next.js",
        "slug": "nextjs",
        "objectID": "584879f0c0aaf085e2012086"
    },
    {
        "name": "Kubernetes",
        "slug": "kubernetes",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1554318943530/J-r4NJeEi.png",
        "objectID": "56744723958ef13879b9522c"
    },
    {
        "name": "Computer Science",
        "slug": "computer-science",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1514959838703/BkDJVxqQM.jpeg",
        "objectID": "56744722958ef13879b9512b"
    },
    {
        "name": "REST API",
        "slug": "rest-api",
        "objectID": "56b1208d04f0061506b360ff"
    },
    {
        "name": "business",
        "slug": "business",
        "objectID": "56744723958ef13879b952a1"
    },
    {
        "name": "automation",
        "slug": "automation",
        "objectID": "56744723958ef13879b9535d"
    },
    {
        "name": "Kotlin",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1458728299/fuo7n9epkkxyafihrlhz.jpg",
        "slug": "kotlin",
        "objectID": "56c2f39e850906a7da47cdeb"
    },
    {
        "name": "Google",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450469897/djpesw0ajrbxvmlyoezx.png",
        "slug": "google",
        "objectID": "56744723958ef13879b95470"
    },
    {
        "name": "app development",
        "slug": "app-development",
        "objectID": "56744720958ef13879b947c4"
    },
    {
        "name": "Azure",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1524473475544/B1ntAzsnM.jpeg",
        "slug": "azure",
        "objectID": "56744721958ef13879b94d89"
    },
    {
        "name": "Game Development",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1473275923/lhhroyopcm9gpfvqxe44.jpg",
        "slug": "game-development",
        "objectID": "56744723958ef13879b953f2"
    },
    {
        "name": "C++",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1534512626199/BkcgCSNUm.png",
        "slug": "cpp",
        "objectID": "56744721958ef13879b948b7"
    },
    {
        "name": "js",
        "slug": "js",
        "objectID": "56744721958ef13879b94bf5"
    },
    {
        "name": "UI",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1487144606/jy8ee18buuag2zbsbqai.png",
        "slug": "ui",
        "objectID": "56744723958ef13879b954f5"
    },
    {
        "name": "Mobile Development",
        "slug": "mobile-development",
        "objectID": "568a9b8ce4c4e23aef243c1f"
    },
    {
        "name": "Cloud Computing",
        "slug": "cloud-computing",
        "objectID": "56744723958ef13879b9533a"
    },
    {
        "name": "frontend",
        "slug": "frontend",
        "objectID": "56744721958ef13879b94d0f"
    },
    {
        "name": "Artificial Intelligence",
        "slug": "artificial-intelligence",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1496737518/sgflljcm3hidlvipsriq.png",
        "objectID": "56744721958ef13879b94927"
    },
    {
        "name": "npm",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1460372304/ovff2sszokeskrwdfjjv.png",
        "slug": "npm",
        "objectID": "56744723958ef13879b95322"
    },
    {
        "name": "development",
        "slug": "development",
        "objectID": "56744721958ef13879b94d9b"
    },
    {
        "name": "Ruby on Rails",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1475235552/twnpcxcm29mub2gez4yf.jpg",
        "slug": "ruby-on-rails",
        "objectID": "56744722958ef13879b94ff1"
    },
    {
        "name": "WordPress",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450732925/vndlqh4zwgqoy6kbcs0j.jpg",
        "slug": "wordpress",
        "objectID": "56744721958ef13879b94beb"
    },
    {
        "name": "tips",
        "slug": "tips",
        "objectID": "56744723958ef13879b95319"
    },
    {
        "name": "javascript framework",
        "slug": "javascript-framework",
        "objectID": "56744723958ef13879b95527"
    },
    {
        "name": "Technical writing ",
        "slug": "technical-writing-1",
        "objectID": "5f3330322a23d9080d17a0da"
    },
    {
        "name": "Express",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1513936680781/HJbEP8qzM.png",
        "slug": "express",
        "objectID": "56744721958ef13879b9487d"
    },
    {
        "name": "serverless",
        "slug": "serverless",
        "objectID": "57979f8dcec33eafc07247a2"
    },
    {
        "name": "Angular",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450469536/svgqrg8jtoqihqdffiai.jpg",
        "slug": "angular",
        "objectID": "56744722958ef13879b94f59"
    },
    {
        "name": "DevLife",
        "slug": "devlife",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1516175805632/HkL6WK3Ez.jpeg",
        "objectID": "592fe1bf8515388d7dfc2650"
    },
    {
        "name": "Functional Programming",
        "slug": "functional-programming",
        "objectID": "568f5c6beea132481d017c36"
    },
    {
        "name": "programmer",
        "slug": "programmer",
        "objectID": "568409636b179c61d167f05d"
    },
    {
        "name": "python projects",
        "slug": "python-projects",
        "objectID": "5f76046e37eb052c1b80da9f"
    },
    {
        "name": "MySQL",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1496912606/hclufcmqr2btz24a6egj.png",
        "slug": "mysql",
        "objectID": "56744721958ef13879b94dff"
    },
    {
        "name": "Dart",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450601337/v7ng3klyzehzxtbjoym9.png",
        "slug": "dart",
        "objectID": "56744721958ef13879b94df0"
    },
    {
        "name": "Firebase",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1464240463/xo1rbiqimh25bmlgwb3g.jpg",
        "slug": "firebase",
        "objectID": "56744722958ef13879b94e99"
    },
    {
        "name": "Windows",
        "slug": "windows",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1554134710664/jnLVaVy-N.png",
        "objectID": "56744723958ef13879b953f7"
    },
    {
        "name": "code",
        "slug": "code",
        "objectID": "56744721958ef13879b94982"
    },
    {
        "name": "GraphQL",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1475235506/qbofja8kwx8cw8nuyaqg.jpg",
        "slug": "graphql",
        "objectID": "56744723958ef13879b9555c"
    },
    {
        "name": "SEO",
        "slug": "seo",
        "objectID": "56744722958ef13879b9519c"
    },
    {
        "name": "ReactHooks",
        "slug": "reacthooks",
        "objectID": "5f8523be6ad92638db4944a9"
    },
    {
        "name": "#beginners #learningtocode #100daysofcode",
        "slug": "beginners-learningtocode-100daysofcode",
        "objectID": "5f789ec19c3b6e410121699a"
    },
    {
        "name": "hacking",
        "slug": "hacking",
        "objectID": "56744723958ef13879b9553a"
    },
    {
        "name": "Cryptocurrency",
        "slug": "cryptocurrency",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1512988849862/SJ5heynZG.png",
        "objectID": "58e4c1144d64a3de3e94b31b"
    },
    {
        "name": "SQL",
        "slug": "sql",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1501338352/cv7owxtxvr39rjzxoolr.png",
        "objectID": "56744723958ef13879b953ed"
    },
    {
        "name": "hashnodebootcamp",
        "slug": "hashnodebootcamp",
        "objectID": "5f75f322b7a1d82bf9b34c6d"
    },
    {
        "name": "Tailwind CSS",
        "slug": "tailwind-css",
        "objectID": "5f4ebbb150b5c61ec6ef4ad2"
    },
    {
        "name": "webpack",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1457865805/st9hz4f5ufmpxhizmfpk.jpg",
        "slug": "webpack",
        "objectID": "56744722958ef13879b95055"
    },
    {
        "name": "learn",
        "slug": "learn",
        "objectID": "56a2235672ca04ea5d7a00c2"
    },
    {
        "name": "first post",
        "slug": "first-post-1",
        "objectID": "5f08ee681981c53c4987f2b3"
    },
    {
        "name": "design patterns",
        "slug": "design-patterns",
        "objectID": "56744721958ef13879b94968"
    },
    {
        "name": "ai",
        "slug": "ai",
        "objectID": "56744721958ef13879b9488e"
    },
    {
        "name": "Microservices",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1479724330/cpcqfxm9af8d8esgo8wp.jpg",
        "slug": "microservices",
        "objectID": "56744721958ef13879b948a2"
    },
    {
        "name": "data analysis",
        "slug": "data-analysis",
        "objectID": "56744722958ef13879b951ac"
    },
    {
        "name": "best practices",
        "slug": "best-practices",
        "objectID": "56744723958ef13879b95598"
    },
    {
        "name": "beginner",
        "slug": "beginner",
        "objectID": "56744723958ef13879b952b6"
    },
    {
        "name": "Deep Learning",
        "slug": "deep-learning",
        "objectID": "578f611523e94ba91a5bebd8"
    },
    {
        "name": "Ubuntu",
        "slug": "ubuntu",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1496151690/x8g04hsjiekjgkkuhrk7.png",
        "objectID": "56744721958ef13879b94988"
    },
    {
        "name": "C",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1475235467/zfbdpx1pe00glfy6lc6b.jpg",
        "slug": "c",
        "objectID": "56744721958ef13879b9492c"
    },
    {
        "name": "MERN Stack",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1534512793459/Hk-s0B4Im.png",
        "slug": "mern",
        "objectID": "56c32d8c316f8ee15e9e0fde"
    },
    {
        "name": "education",
        "slug": "education",
        "objectID": "56b631c8e6740d0959b6f3ef"
    },
    {
        "name": "authentication",
        "slug": "authentication",
        "objectID": "56744721958ef13879b94b00"
    },
    {
        "name": "community",
        "slug": "community",
        "objectID": "56744722958ef13879b9514c"
    },
    {
        "name": "marketing",
        "slug": "marketing",
        "objectID": "57449fa89ade925885158d1e"
    },
    {
        "name": "Hello World",
        "slug": "hello-world",
        "objectID": "591d0f67b5bbb96606f07af4"
    },
    {
        "name": "tools",
        "slug": "tools",
        "objectID": "56744721958ef13879b94e0c"
    },
    {
        "name": "ecommerce",
        "slug": "ecommerce",
        "objectID": "56744722958ef13879b95041"
    },
    {
        "name": "news",
        "slug": "news",
        "objectID": "56744721958ef13879b9493e"
    },
    {
        "name": "Microsoft",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450622053/ioqfwklxmzqwwy7jrxmj.png",
        "slug": "microsoft",
        "objectID": "56744721958ef13879b94d1d"
    },
    {
        "name": "jQuery",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450815745/cd8sl0j2hkeuoq2isuc3.png",
        "slug": "jquery",
        "objectID": "56744721958ef13879b94c2b"
    },
    {
        "name": "Javascript library",
        "slug": "javascript-library",
        "objectID": "568fa207525da8063d08fb68"
    },
    {
        "name": "data",
        "slug": "data",
        "objectID": "56744721958ef13879b949d3"
    },
    {
        "name": "clean code",
        "slug": "clean-code",
        "objectID": "573504d39835efadc8742016"
    },
    {
        "name": "web",
        "slug": "web",
        "objectID": "56744722958ef13879b94f40"
    },
    {
        "name": "programing",
        "slug": "programing",
        "objectID": "56ab1a78f28f9d9d99e3a6d1"
    },
    {
        "name": "tech ",
        "slug": "tech",
        "objectID": "5677de7c7dd5d4174dcc2073"
    },
    {
        "name": "Mobile apps",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450619495/qiwhbnoxoas2b5dtb6cx.png",
        "slug": "mobile-apps",
        "objectID": "56744721958ef13879b94c5b"
    },
    {
        "name": "performance",
        "slug": "performance",
        "objectID": "56744721958ef13879b94dc4"
    },
    {
        "name": "UI Design",
        "slug": "ui-design",
        "objectID": "5682df44aeae5c9e229cf9f9"
    },
    {
        "name": "PostgreSQL",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1460706552/iwl62ldvrzgf4k9rhame.jpg",
        "slug": "postgresql",
        "objectID": "56744721958ef13879b949b5"
    },
    {
        "name": "Rust",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1534512703511/HJDSCr4UQ.png",
        "slug": "rust",
        "objectID": "5684bee6bf03be7d4a9ed853"
    },
    {
        "name": "motivation",
        "slug": "motivation",
        "objectID": "56b0ba4604f0061506b35fae"
    },
    {
        "name": "software architecture",
        "slug": "software-architecture",
        "objectID": "56744722958ef13879b950c9"
    },
    {
        "name": "introduction",
        "slug": "introduction",
        "objectID": "56744721958ef13879b948cc"
    },
    {
        "name": "Bootstrap",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450470158/wpi0t8fj9kr8on9v6jmd.jpg",
        "slug": "bootstrap",
        "objectID": "56744721958ef13879b94be1"
    },
    {
        "name": "networking",
        "slug": "networking",
        "objectID": "56ffbb5d5861692778050361"
    },
    {
        "name": "blog",
        "slug": "blog",
        "objectID": "56744721958ef13879b948ac"
    },
    {
        "name": "jobs",
        "slug": "jobs",
        "objectID": "56a77939281161e11972fdd7"
    },
    {
        "name": "terminal",
        "slug": "terminal",
        "objectID": "56744721958ef13879b94da6"
    },
    {
        "name": "command line",
        "slug": "command-line",
        "objectID": "56744723958ef13879b9539a"
    },
    {
        "name": "website",
        "slug": "website",
        "objectID": "5674471d958ef13879b94785"
    },
    {
        "name": "Developer Tools",
        "slug": "developer-tools",
        "objectID": "57ebac0bd9b08ec06a77be05"
    },
    {
        "name": "aws lambda",
        "slug": "aws-lambda",
        "objectID": "57c7ea36e53060955aa8c0c0"
    },
    {
        "name": "Ethereum",
        "slug": "ethereum",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1512988945062/HJKfZJhWf.png",
        "objectID": "58e4c1144d64a3de3e94b31d"
    },
    {
        "name": "System Architecture",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1496913335/duppaieikvyvepmoj6uz.png",
        "slug": "system-architecture",
        "objectID": "56744723958ef13879b955b0"
    },
    {
        "name": "#cybersecurity",
        "slug": "cybersecurity-1",
        "objectID": "5f2e70c0b8ac395b1f23a6cb"
    },
    {
        "name": "linux for beginners",
        "slug": "linux-for-beginners",
        "objectID": "5fa5022a3e634314b5179cf5"
    },
    {
        "name": "Games",
        "slug": "games",
        "objectID": "578f6a105460288cdeb6f2ab"
    },
    {
        "name": "developers",
        "slug": "developers",
        "objectID": "56744722958ef13879b94f05"
    },
    {
        "name": "internet",
        "slug": "internet",
        "objectID": "56f260f15ec781bb472f83af"
    },
    {
        "name": "android app development",
        "slug": "android-app-development",
        "objectID": "56744721958ef13879b94890"
    },
    {
        "name": "full stack",
        "slug": "full-stack",
        "objectID": "56744723958ef13879b95387"
    },
    {
        "name": "server",
        "slug": "server",
        "objectID": "56744721958ef13879b94e17"
    },
    {
        "name": "projects",
        "slug": "projects",
        "objectID": "56744722958ef13879b95074"
    },
    {
        "name": "macOS",
        "slug": "macos",
        "objectID": "576a1d6e13cc2eb2d90e2383"
    },
    {
        "name": "project management",
        "slug": "project-management",
        "objectID": "569d22af46dfdb8479aa6921"
    },
    {
        "name": "writing",
        "slug": "writing",
        "objectID": "5674471d958ef13879b9477e"
    },
    {
        "name": "Flutter Examples",
        "slug": "flutter-examples",
        "objectID": "5f08f6a1b0bf5b3c273ea78b"
    },
    {
        "name": "guide",
        "slug": "guide",
        "objectID": "56744723958ef13879b955a7"
    },
    {
        "name": "deployment",
        "slug": "deployment",
        "objectID": "56744721958ef13879b94dad"
    },
    {
        "name": "array",
        "slug": "array",
        "objectID": "578e290c5460288cdeb6f187"
    },
    {
        "name": "Bash",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1464705930/i6dyhkbiwqezfwbsq4c2.jpg",
        "slug": "bash",
        "objectID": "56744722958ef13879b95119"
    },
    {
        "name": "Bitcoin",
        "slug": "bitcoin",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1512988974934/rJwNWJhZz.png",
        "objectID": "5697e90f46dfdb8479aa6708"
    },
    {
        "name": "Google Chrome",
        "slug": "chrome",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1502183259/uhcfgovkcf3pm66xjsl0.png",
        "objectID": "56744722958ef13879b94f68"
    },
    {
        "name": ".NET",
        "slug": "net",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1515075179602/rkEdLho7G.jpeg",
        "objectID": "56744723958ef13879b9556e"
    },
    {
        "name": "dotnet",
        "slug": "dotnet",
        "objectID": "5794f65abecb9ebac0d5fc55"
    },
    {
        "name": "life",
        "slug": "life",
        "objectID": "57bc257693309a25047c5e43"
    },
    {
        "name": "Twitter",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1464240092/ysal5yejuviop7p7bvbl.png",
        "slug": "twitter",
        "objectID": "56744721958ef13879b949ad"
    },
    {
        "name": "Object Oriented Programming",
        "slug": "object-oriented-programming",
        "objectID": "591e9732ab184fdc3bcd9185"
    },
    {
        "name": "iot",
        "slug": "iot",
        "objectID": "56744723958ef13879b9532f"
    },
    {
        "name": "json",
        "slug": "json",
        "objectID": "56744721958ef13879b94dec"
    },
    {
        "name": "api",
        "slug": "api",
        "objectID": "56744721958ef13879b94c20"
    },
    {
        "name": "Express.js",
        "slug": "expressjs-cilb5apda0066e053g7td7q24",
        "objectID": "56d729602c0ee8a839b966f1"
    },
    {
        "name": "basics",
        "slug": "basics",
        "objectID": "57b75ddd51da93ffde24c7d9"
    },
    {
        "name": "http",
        "slug": "http",
        "objectID": "56744721958ef13879b94c04"
    },
    {
        "name": "Self Improvement ",
        "slug": "self-improvement-1",
        "objectID": "5f2e55763b12e25afe3e4d05"
    },
    {
        "name": "GitLab",
        "slug": "gitlab",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1506019761/umvea3aqsquj7z9ighjt.png",
        "objectID": "56bb10616bd8ce129b0bcc6c"
    },
    {
        "name": "google cloud",
        "slug": "google-cloud",
        "objectID": "56744722958ef13879b951dd"
    },
    {
        "name": "Spring",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1458677282/mtezd0wf8jhhmbgkzo1g.jpg",
        "slug": "spring",
        "objectID": "5674471d958ef13879b94772"
    },
    {
        "name": "selenium",
        "slug": "selenium",
        "objectID": "56a1bb2a92921b8f79d3620f"
    },
    {
        "name": "Gatsby",
        "slug": "gatsby",
        "objectID": "58a37012803129b7f158f514"
    },
    {
        "name": "containers",
        "slug": "containers",
        "objectID": "571f798917ae2452d9887631"
    },
    {
        "name": "resources",
        "slug": "resources",
        "objectID": "56744721958ef13879b94d55"
    },
    {
        "name": "operating system",
        "slug": "operating-system",
        "objectID": "56744721958ef13879b94b09"
    },
    {
        "name": "product",
        "slug": "product",
        "objectID": "577f7bc442d3fa70a37e450e"
    },
    {
        "name": "cms",
        "slug": "cms",
        "objectID": "56744723958ef13879b953ff"
    },
    {
        "name": "ui ux designer",
        "slug": "ui-ux-designer",
        "objectID": "5f7af8bd9c3b6e4101218399"
    },
    {
        "name": "hosting",
        "slug": "hosting",
        "objectID": "56744721958ef13879b94b0f"
    },
    {
        "name": "social media",
        "slug": "social-media",
        "objectID": "5775ff2c57675ec2fcfd086e"
    },
    {
        "name": "debugging",
        "slug": "debugging",
        "objectID": "56744723958ef13879b95372"
    },
    {
        "name": "Heroku",
        "slug": "heroku",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1496175418/k6pahvykel6hcfqtkk3d.jpg",
        "objectID": "568935c69a4538cecc3ae55f"
    },
    {
        "name": "software",
        "slug": "software",
        "objectID": "56744721958ef13879b9481e"
    },
    {
        "name": "asp.net core",
        "slug": "aspnet-core",
        "objectID": "56bad3b76bd8ce129b0bcc04"
    },
    {
        "name": "hackathon",
        "slug": "hackathon",
        "objectID": "56744720958ef13879b947d4"
    },
    {
        "name": "framework",
        "slug": "framework",
        "objectID": "56744721958ef13879b94b4d"
    },
    {
        "name": "cli",
        "slug": "cli",
        "objectID": "56744723958ef13879b953a7"
    },
    {
        "name": "array methods",
        "slug": "array-methods",
        "objectID": "5f397a30c4d5973f55c91219"
    },
    {
        "name": "Electron",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1473241164/mqhaydhn8fhejzrsxofr.png",
        "slug": "electron",
        "objectID": "56744723958ef13879b95419"
    },
    {
        "name": "challenge",
        "slug": "challenge",
        "objectID": "56744721958ef13879b949c9"
    },
    {
        "name": "Freelancing",
        "slug": "freelancing",
        "objectID": "56744723958ef13879b953cc"
    },
    {
        "name": "linux-basics",
        "slug": "linux-basics",
        "objectID": "5fb01c1fc03b0e471014f758"
    },
    {
        "name": "portfolio",
        "slug": "portfolio",
        "objectID": "5690e78091716a2d1dbadc0f"
    },
    {
        "name": "functions",
        "slug": "functions",
        "objectID": "56744721958ef13879b94a01"
    },
    {
        "name": "Springboot",
        "slug": "springboot",
        "objectID": "58646144cc0caec55e2fd1d1"
    },
    {
        "name": "youtube",
        "slug": "youtube",
        "objectID": "56ced112f0ec33085f1cc5ab"
    },
    {
        "name": "Browsers",
        "slug": "browsers",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1502183382/psbzjcrqxjjndian3nph.png",
        "objectID": "56744721958ef13879b94d63"
    },
    {
        "name": "vue",
        "slug": "vue",
        "objectID": "570e5021115103c3b09785e1"
    },
    {
        "name": "Flask Framework",
        "slug": "flask",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1518503935975/S1_-_WePM.png",
        "objectID": "56744723958ef13879b95588"
    },
    {
        "name": "HashnodeCommunity",
        "slug": "hashnodecommunity",
        "objectID": "5f3272264332ee07eb55c4bd"
    },
    {
        "name": "Apple",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1465890893/iickievhb3ymoyga6wyw.png",
        "slug": "apple",
        "objectID": "56744721958ef13879b948ba"
    },
    {
        "name": "Business and Finance ",
        "slug": "business-and-finance",
        "objectID": "5f253857669da9610ee1771d"
    },
    {
        "name": "CSS Animation",
        "slug": "css-animation",
        "objectID": "567c03e03f1768f6bf48a678"
    },
    {
        "name": "books",
        "slug": "books",
        "objectID": "56744721958ef13879b94d2a"
    },
    {
        "name": "Technical interview",
        "slug": "technical-interview",
        "objectID": "5f0725a8570e2e29ce255012"
    },
    {
        "name": "PHP7",
        "slug": "php7",
        "objectID": "5680fde5aeae5c9e229cf8e2"
    },
    {
        "name": "side project",
        "slug": "side-project",
        "objectID": "576fa8aca245bcf2e2e91044"
    },
    {
        "name": "personal",
        "slug": "personal",
        "objectID": "56b41c593f1e4ff03c56b4e4"
    },
    {
        "name": "github-actions",
        "slug": "github-actions-1",
        "objectID": "5f4f0f5850b5c61ec6ef4eb4"
    },
    {
        "name": "Facebook",
        "slug": "facebook",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1496176300/khcjk48ycpejt19sfgav.png",
        "objectID": "56744721958ef13879b94da0"
    },
    {
        "name": "code review",
        "slug": "code-review",
        "objectID": "56744721958ef13879b949f9"
    },
    {
        "name": "elasticsearch",
        "slug": "elasticsearch",
        "objectID": "56744723958ef13879b95430"
    },
    {
        "name": "TDD (Test-driven development)",
        "slug": "tdd",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1502441836/zcgicxrtkoquz67dlkgs.png",
        "objectID": "56744721958ef13879b94898"
    },
    {
        "name": "Svelte",
        "slug": "svelte",
        "objectID": "583d0951f533d193a2e694d1"
    },
    {
        "name": "Sass",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1490082271/p0drxprfhz9qmkm0txrf.png",
        "slug": "sass",
        "objectID": "56744721958ef13879b94df7"
    },
    {
        "name": "Entrepreneurship",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1496913550/abhdc0juuwrn1kfjk966.png",
        "slug": "entrepreneurship",
        "objectID": "567a50052b926c3063c305c9"
    },
    {
        "name": "Bugs and Errors",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1465891233/e2dpkrprraf8jitcvc3i.png",
        "slug": "bugs-and-errors",
        "objectID": "575f9bc3da600b8ef43e5263"
    },
    {
        "name": "android apps",
        "slug": "android-apps",
        "objectID": "590c655dd7c4344afe6c3241"
    },
    {
        "name": "Flutter Widgets",
        "slug": "flutter-widgets",
        "objectID": "5f08f6a1b0bf5b3c273ea78c"
    },
    {
        "name": "documentation",
        "slug": "documentation",
        "objectID": "56744722958ef13879b950f8"
    },
    {
        "name": "Continuous Integration",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1460096831/jeyz4slnhjuflhkqbanb.png",
        "slug": "continuous-integration",
        "objectID": "56744721958ef13879b94de0"
    },
    {
        "name": "version control",
        "slug": "version-control",
        "objectID": "56744722958ef13879b9506b"
    },
    {
        "name": "asynchronous",
        "slug": "asynchronous",
        "objectID": "56744722958ef13879b94e66"
    },
    {
        "name": "Magento",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1487144361/a8xaya1bv8advcuoj90m.png",
        "slug": "magento",
        "objectID": "56eadc94bcca2d711e191c4c"
    },
    {
        "name": "Netlify",
        "slug": "netlify",
        "objectID": "57ce27e495368c463b098050"
    },
    {
        "name": "nginx",
        "slug": "nginx",
        "objectID": "56744722958ef13879b94f8b"
    },
    {
        "name": "web scraping",
        "slug": "web-scraping",
        "objectID": "58dfb250eb0ffea9e764936d"
    },
    {
        "name": "ios app development",
        "slug": "ios-app-development",
        "objectID": "584a50f7e1ffd7084c8b1e6c"
    },
    {
        "name": "Redis",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1513324425585/r1M9y-bMM.png",
        "slug": "redis",
        "objectID": "56744721958ef13879b94c41"
    },
    {
        "name": "infrastructure",
        "slug": "infrastructure",
        "objectID": "56a4e1d28e1dd6d05014efdb"
    },
    {
        "name": "shell",
        "slug": "shell",
        "objectID": "56744723958ef13879b95561"
    },
    {
        "name": "CSS Frameworks",
        "slug": "css-frameworks",
        "objectID": "56744721958ef13879b94b82"
    },
    {
        "name": "Responsive Web Design",
        "slug": "responsive-web-design",
        "objectID": "574dc610be8cff2ed6571a40"
    },
    {
        "name": "bootcamp",
        "slug": "bootcamp",
        "objectID": "58d54af36047f98ddcae780b"
    },
    {
        "name": "Competitive programming",
        "slug": "competitive-programming",
        "objectID": "56fb79d4da7018d48c208e91"
    },
    {
        "name": "podcast",
        "slug": "podcast",
        "objectID": "56744722958ef13879b950d3"
    },
    {
        "name": "email",
        "slug": "email",
        "objectID": "56744722958ef13879b95038"
    },
    {
        "name": "Material Design",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1474050455/stm5thxo0n1evvzpl7np.png",
        "slug": "material-design",
        "objectID": "56744722958ef13879b95029"
    },
    {
        "name": "NoSQL",
        "slug": "nosql",
        "objectID": "56744721958ef13879b94b41"
    },
    {
        "name": "markdown",
        "slug": "markdown",
        "objectID": "56744722958ef13879b950b2"
    },
    {
        "name": "components",
        "slug": "components",
        "objectID": "571c5374fc5b53a1ace37ce8"
    },
    {
        "name": "unit testing",
        "slug": "unit-testing",
        "objectID": "56744721958ef13879b94ac4"
    },
    {
        "name": "management",
        "slug": "management",
        "objectID": "56744721958ef13879b948d1"
    },
    {
        "name": "research",
        "slug": "research",
        "objectID": "56744723958ef13879b952cb"
    },
    {
        "name": "Ionic Framework",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1513839196650/HyrD9A_fM.jpeg",
        "slug": "ionic",
        "objectID": "56744721958ef13879b94b62"
    },
    {
        "name": "vim",
        "slug": "vim",
        "objectID": "56744722958ef13879b95126"
    },
    {
        "name": "Accessibility",
        "slug": "accessibility",
        "objectID": "56744723958ef13879b95230"
    },
    {
        "name": "remote",
        "slug": "remote",
        "objectID": "56744721958ef13879b94841"
    },
    {
        "name": "agile",
        "slug": "agile",
        "objectID": "56744723958ef13879b9551b"
    },
    {
        "name": "analytics",
        "slug": "analytics",
        "objectID": "56744721958ef13879b9495b"
    },
    {
        "name": "vscode extensions",
        "slug": "vscode-extensions",
        "objectID": "5f5c6d4213599a5f2e33f00f"
    },
    {
        "name": "statistics",
        "slug": "statistics",
        "objectID": "56744721958ef13879b949ea"
    },
    {
        "name": "react router",
        "slug": "react-router",
        "objectID": "56744721958ef13879b949bc"
    },
    {
        "name": "IDEs",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450468381/x5vcqb3xxe7wdheuopww.png",
        "slug": "ides",
        "objectID": "56744722958ef13879b94eff"
    },
    {
        "name": "forms",
        "slug": "forms",
        "objectID": "56744721958ef13879b948fa"
    },
    {
        "name": "Terraform",
        "slug": "terraform",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1617121672721/6r0bN-GSK.png",
        "objectID": "57bf546693309a25047c6206"
    },
    {
        "name": "animation",
        "slug": "animation",
        "objectID": "56744723958ef13879b95338"
    },
    {
        "name": "Developer Blogging",
        "slug": "developer-blogging",
        "objectID": "5f1c1e25e8769101a9ef64d2"
    },
    {
        "name": "PWA",
        "slug": "pwa",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1496404433/rlgbcgsuycivf0ukgxrl.png",
        "objectID": "57cbc5d49b3eb82e014a0320"
    },
    {
        "name": "JAMstack",
        "slug": "jamstack",
        "objectID": "58f9253e01cb858c63429c31"
    },
    {
        "name": "Elixir",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1452000435/svfntjev0f681f6oiptm.png",
        "slug": "elixir",
        "objectID": "56744723958ef13879b95392"
    },
    {
        "name": "dotnetcore",
        "slug": "dotnetcore",
        "objectID": "5794f65abecb9ebac0d5fc56"
    },
    {
        "name": "ShowHashnode",
        "slug": "showhashnode",
        "objectID": "5d946e601971c92f3298b280"
    },
    {
        "name": "coding challenge",
        "slug": "coding-challenge",
        "objectID": "5f16831dfefe35614464e44b"
    },
    {
        "name": "Android Studio",
        "slug": "android-studio",
        "objectID": "5868042db99398bc30c43e77"
    },
    {
        "name": "variables",
        "slug": "variables",
        "objectID": "56744721958ef13879b94863"
    },
    {
        "name": "ci-cd",
        "slug": "ci-cd",
        "objectID": "5f0ed0dd7611e111fbd7194f"
    },
    {
        "name": "nlp",
        "slug": "nlp",
        "objectID": "573a8e38a5dc678fc9090d31"
    },
    {
        "name": "#howtos",
        "slug": "howtos",
        "objectID": "5f18178960b5d372e20d5a86"
    },
    {
        "name": "Web Hosting",
        "slug": "web-hosting",
        "objectID": "571faab486b33947d9bdbab2"
    },
    {
        "name": "oop",
        "slug": "oop",
        "objectID": "5674471d958ef13879b94779"
    },
    {
        "name": "DigitalOcean",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1491567594/mtbp3w2posceqcdj8rx5.jpg",
        "slug": "digitalocean",
        "objectID": "56744721958ef13879b948c3"
    },
    {
        "name": "SVG",
        "slug": "svg",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1500325020/kp4vjytdfuqbhaibiqm7.png",
        "objectID": "56744723958ef13879b95469"
    },
    {
        "name": "promises",
        "slug": "promises",
        "objectID": "56744722958ef13879b951d9"
    },
    {
        "name": "womenwhocode",
        "slug": "womenwhocode",
        "objectID": "5f1fdd28ed20ff21a11e7126"
    },
    {
        "name": "Flutter SDK",
        "slug": "flutter-sdk",
        "objectID": "5f08f6a1b0bf5b3c273ea78a"
    },
    {
        "name": "optimization",
        "slug": "optimization",
        "objectID": "56744721958ef13879b94821"
    },
    {
        "name": "work",
        "slug": "work",
        "objectID": "56a361abff99ae055eeffd33"
    },
    {
        "name": "database",
        "slug": "database",
        "objectID": "56744722958ef13879b950ef"
    },
    {
        "name": "pandas",
        "slug": "pandas",
        "objectID": "56744723958ef13879b953e6"
    },
    {
        "name": "chrome extension",
        "slug": "chrome-extension",
        "objectID": "56b1945b04f0061506b361db"
    },
    {
        "name": "privacy",
        "slug": "privacy",
        "objectID": "56744723958ef13879b952fc"
    },
    {
        "name": "events",
        "slug": "events",
        "objectID": "575d75e2da600b8ef43e506d"
    },
    {
        "name": "ansible",
        "slug": "ansible",
        "objectID": "56744722958ef13879b95152"
    },
    {
        "name": "Mathematics",
        "slug": "mathematics",
        "objectID": "592d60cb8a6f7b0a1195412a"
    },
    {
        "name": "startup",
        "slug": "startup",
        "objectID": "56744721958ef13879b94bbb"
    },
    {
        "name": "music",
        "slug": "music",
        "objectID": "56744721958ef13879b949c6"
    },
    {
        "name": "problem solving skills",
        "slug": "problem-solving-skills",
        "objectID": "5f8560a8e83ccb407537a1ee"
    },
    {
        "name": "review",
        "slug": "review",
        "objectID": "56744723958ef13879b953b4"
    },
    {
        "name": "GIS",
        "slug": "gis",
        "objectID": "57fb4f226849a80ac266ca71"
    },
    {
        "name": "unity",
        "slug": "unity",
        "objectID": "56744721958ef13879b94885"
    },
    {
        "name": "test",
        "slug": "test",
        "objectID": "56744722958ef13879b951d6"
    },
    {
        "name": "TIL",
        "slug": "til",
        "objectID": "5d93238ce235795f6eb6dd79"
    },
    {
        "name": "Auth0",
        "slug": "auth0",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1627916134204/sEaEU0wiP.png",
        "objectID": "56fb1506ea33a5b266f2ffc3"
    },
    {
        "name": "Certification",
        "slug": "certification",
        "objectID": "57d4461ed17cab545cab66de"
    },
    {
        "name": "webdevelopment",
        "slug": "webdevelopment",
        "objectID": "56744721958ef13879b94b20"
    },
    {
        "name": "lifestyle",
        "slug": "lifestyle",
        "objectID": "56744721958ef13879b948f2"
    },
    {
        "name": "course",
        "slug": "course",
        "objectID": "575150c412a8cb07bb842118"
    },
    {
        "name": "Story",
        "slug": "story",
        "objectID": "57348ce934963cba3535abb4"
    },
    {
        "name": "job search",
        "slug": "job-search",
        "objectID": "5f08ee681981c53c4987f2b4"
    },
    {
        "name": "Raspberry Pi",
        "slug": "raspberry-pi",
        "objectID": "56d2cbb4099859fa044d68c0"
    },
    {
        "name": "Amazon Web Services",
        "slug": "amazon-web-services",
        "objectID": "56a6742dc84f2c6913b8eac3"
    },
    {
        "name": "tutorials",
        "slug": "tutorials",
        "objectID": "56744721958ef13879b94dcc"
    },
    {
        "slug": "flutter-cjx3aa7op001jims1kuwl3ekz",
        "objectID": "5d0a3b36c7de780e772aff0a"
    },
    {
        "name": "#data visualisation",
        "slug": "data-visualisation-1",
        "objectID": "5f4b7d61f540845bb26f0291"
    },
    {
        "name": "continuous deployment",
        "slug": "continuous-deployment",
        "objectID": "56744722958ef13879b94f92"
    },
    {
        "name": "video",
        "slug": "video",
        "objectID": "56744723958ef13879b954e9"
    },
    {
        "name": "DOM",
        "slug": "dom",
        "objectID": "56744723958ef13879b95376"
    },
    {
        "name": "search",
        "slug": "search",
        "objectID": "56744721958ef13879b9497b"
    },
    {
        "name": "JWT",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1464240237/bqu9k0lklrg7xxvk2pzq.jpg",
        "slug": "jwt",
        "objectID": "56744723958ef13879b9536e"
    },
    {
        "name": "Interviews",
        "slug": "interviews",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1496318621/g6yz7ukrqftqat2y3ycn.png",
        "objectID": "56744721958ef13879b948b1"
    },
    {
        "name": "vanilla-js",
        "slug": "vanilla-js-1",
        "objectID": "5f9aaeaba1658252d1a7b620"
    },
    {
        "name": "monitoring",
        "slug": "monitoring",
        "objectID": "56744723958ef13879b95361"
    },
    {
        "name": "Text Editors",
        "slug": "text-editors",
        "objectID": "571459a7162bdaad9f92b0d7"
    },
    {
        "name": "gaming",
        "slug": "gaming",
        "objectID": "57e951b155544e5132a4d5df"
    },
    {
        "name": "mongoose",
        "slug": "mongoose",
        "objectID": "56744723958ef13879b9540c"
    },
    {
        "name": "SaaS",
        "slug": "saas",
        "objectID": "56744722958ef13879b950a5"
    },
    {
        "name": "content",
        "slug": "content",
        "objectID": "56744721958ef13879b94849"
    },
    {
        "name": "apache",
        "slug": "apache",
        "objectID": "56744723958ef13879b95513"
    },
    {
        "name": "engineering",
        "slug": "engineering",
        "objectID": "56744722958ef13879b950b5"
    },
    {
        "name": "headless cms",
        "slug": "headless-cms",
        "objectID": "5914be36db93b4aae8008897"
    },
    {
        "name": "newsletter",
        "slug": "newsletter",
        "objectID": "56744722958ef13879b9516a"
    },
    {
        "name": "network",
        "slug": "network",
        "objectID": "56744721958ef13879b94923"
    },
    {
        "name": "IT",
        "slug": "it",
        "objectID": "57628dcd820dd45f3fbd8eb5"
    },
    {
        "name": "mobile app development",
        "slug": "mobile-app-development",
        "objectID": "56744723958ef13879b95222"
    },
    {
        "name": "freeCodeCamp.org",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1518534240940/ByFDRugwf.jpeg",
        "slug": "freecodecamp",
        "objectID": "57039f98f950faa9ab7ec552"
    },
    {
        "name": "Cryptography",
        "slug": "cryptography",
        "objectID": "58426a8997063da359fe2cf4"
    },
    {
        "name": "Augmented Reality",
        "slug": "augmented-reality",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1506666999/lnnrwwh9td4xm87lh13d.png",
        "objectID": "57ce29fde5e41a2a5c24fa98"
    },
    {
        "name": "training",
        "slug": "training",
        "objectID": "56b0a1600a7ca0c6f70c3703"
    },
    {
        "name": "Objects",
        "slug": "objects",
        "objectID": "57e793cdef99cf03582fe42b"
    },
    {
        "name": "flexbox",
        "slug": "flexbox",
        "objectID": "56744721958ef13879b94afb"
    },
    {
        "name": "SSL",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450712342/u2tfvtrfojyne6qzaflq.jpg",
        "slug": "ssl",
        "objectID": "56744721958ef13879b94912"
    },
    {
        "name": "ASP.NET",
        "slug": "aspnet",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1515075607732/ByxXu3jQG.jpeg",
        "objectID": "567e2a600db88211bac0a032"
    },
    {
        "name": "distributed system",
        "slug": "distributed-system",
        "objectID": "568c90725e7a940b3d3e08ed"
    },
    {
        "name": "logging",
        "slug": "logging",
        "objectID": "568bb9dbe99c5444f3233893"
    },
    {
        "name": "Applications",
        "slug": "applications",
        "objectID": "56ea7aebbcca2d711e191c02"
    },
    {
        "name": "user experience",
        "slug": "user-experience",
        "objectID": "56744721958ef13879b948d4"
    },
    {
        "name": "architecture",
        "slug": "architecture",
        "objectID": "56744723958ef13879b9529a"
    },
    {
        "name": "package",
        "slug": "package",
        "objectID": "56744723958ef13879b9533c"
    },
    {
        "name": "tricks",
        "slug": "tricks",
        "objectID": "56744721958ef13879b94b19"
    },
    {
        "name": "R Language",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1490864688/fiw7ngemmxkumjpkntdp.png",
        "slug": "r",
        "objectID": "56744722958ef13879b95111"
    },
    {
        "name": "css flexbox",
        "slug": "css-flexbox",
        "objectID": "56744721958ef13879b94c3a"
    },
    {
        "name": "Xcode",
        "slug": "xcode",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1502355718/vddmkshskl3sbl4xogwn.jpg",
        "objectID": "56744720958ef13879b947ff"
    },
    {
        "name": "Monetization",
        "slug": "monetization",
        "objectID": "5736a1db6a4640415dc89e28"
    },
    {
        "name": "async",
        "slug": "async",
        "objectID": "56cbdb23b70682283f9edeb8"
    },
    {
        "name": "SQL Server",
        "slug": "sql-server",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1551380133166/kHlXAcxdU.jpeg",
        "objectID": "56744720958ef13879b947b6"
    },
    {
        "name": "tensorflow",
        "slug": "tensorflow",
        "objectID": "56744722958ef13879b9518a"
    },
    {
        "name": "Vercel Hashnode Hackathon",
        "slug": "vercelhashnode",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1610701406772/nrAD-f_i6.png",
        "objectID": "6001530cf611a365208ad66a"
    },
    {
        "name": "extension",
        "slug": "extension",
        "objectID": "569f6b4492921b8f79d36061"
    },
    {
        "name": "free",
        "slug": "free",
        "objectID": "56744723958ef13879b95214"
    },
    {
        "name": "kotlin beginner",
        "slug": "kotlin-beginner",
        "objectID": "5f081e73b587713318b74a42"
    },
    {
        "name": "SurviveJS",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1461251276/bmmcz554bnl0zk83l1iz.png",
        "slug": "survivejs",
        "objectID": "5718ec0fc4b104334fad928e"
    },
    {
        "name": "Rails",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1453793832/qypx8pjpm7tybpcbfhif.jpg",
        "slug": "rails",
        "objectID": "56744722958ef13879b94eb5"
    },
    {
        "name": "Web Perf",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1472485302/gvihfpia52e0l5r3rau9.jpg",
        "slug": "webperf",
        "objectID": "56744722958ef13879b950c6"
    },
    {
        "name": "big data",
        "slug": "big-data",
        "objectID": "56744721958ef13879b94e3b"
    },
    {
        "name": "communication",
        "slug": "communication",
        "objectID": "57d2d92415ae0c65b80ace44"
    },
    {
        "name": "Solidity",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1512988916861/ryTxWknbG.png",
        "slug": "solidity",
        "objectID": "595ab8b5a3e02ebe146b2f2a"
    },
    {
        "name": "Experience ",
        "slug": "experience",
        "objectID": "587dbc32d40f782e50cf92e0"
    },
    {
        "name": "Amazon S3",
        "slug": "amazon-s3",
        "objectID": "569d145446dfdb8479aa690d"
    },
    {
        "name": "Meteor",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450467991/aaskzxstfaadd1sbhxj2.png",
        "slug": "meteor",
        "objectID": "56744722958ef13879b94fa7"
    },
    {
        "name": "agile development",
        "slug": "agile-development",
        "objectID": "56744721958ef13879b94dba"
    },
    {
        "name": "Oracle",
        "slug": "oracle",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1516182996908/ByaA6q2NG.jpeg",
        "objectID": "56744721958ef13879b9498a"
    },
    {
        "name": "scss",
        "slug": "scss",
        "objectID": "56744722958ef13879b951f1"
    },
    {
        "name": "GCP",
        "slug": "gcp",
        "objectID": "58d4d1fbcfc5bd6596a0a6b5"
    },
    {
        "name": "domain",
        "slug": "domain",
        "objectID": "5714fe4e151fa7c4488cc1ae"
    },
    {
        "name": "Regex",
        "slug": "regex",
        "objectID": "56f6aef0aa013a5f87413615"
    },
    {
        "name": "Symfony",
        "slug": "symfony",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1541163459741/BknTF6t3m.png",
        "objectID": "572d6c67bf97af427dd07f13"
    },
    {
        "name": "app",
        "slug": "app",
        "objectID": "56744721958ef13879b94a0e"
    },
    {
        "name": "Junior developer ",
        "slug": "junior-developer",
        "objectID": "5f071caa6e04d8269a566170"
    },
    {
        "name": "advice",
        "slug": "advice",
        "objectID": "56744723958ef13879b95333"
    },
    {
        "name": "Powershell",
        "slug": "powershell",
        "objectID": "56f7871ffc7154468758edb7"
    },
    {
        "name": "Babel",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1504815622/wo9hjfe0klgxj8mahf6j.png",
        "slug": "babel",
        "objectID": "56744722958ef13879b95045"
    },
    {
        "name": "Reactive Programming",
        "slug": "reactive-programming",
        "objectID": "56744721958ef13879b94aee"
    },
    {
        "name": "Smart Contracts",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1512989048807/S1WtW1hZz.png",
        "slug": "smart-contracts",
        "objectID": "5a2e407a5b9ed1636662b8f9"
    },
    {
        "name": "string",
        "slug": "string",
        "objectID": "57448e2a9ade925885158cfe"
    },
    {
        "name": "images",
        "slug": "images",
        "objectID": "56744723958ef13879b95229"
    },
    {
        "name": "hiring",
        "slug": "hiring",
        "objectID": "56744721958ef13879b9497e"
    },
    {
        "name": "Christmas Hackathon",
        "slug": "christmashackathon",
        "logo": null,
        "objectID": "5fe187955620145ec6e3a5c2"
    },
    {
        "name": "services",
        "slug": "services",
        "objectID": "5682e64e2c29f7e0c86d024b"
    },
    {
        "name": "aws-cdk",
        "slug": "aws-cdk",
        "objectID": "5f743910a3a6d515f7142eb4"
    },
    {
        "name": "Laravel 5",
        "slug": "laravel-5",
        "objectID": "56ec06ac5edec9d7189a0ad6"
    },
    {
        "name": "crypto",
        "slug": "crypto",
        "objectID": "57b188c971be21426cb4916e"
    },
    {
        "name": "instagram",
        "slug": "instagram",
        "objectID": "56744721958ef13879b94aec"
    },
    {
        "name": "questions",
        "slug": "questions",
        "objectID": "56744723958ef13879b952fe"
    },
    {
        "name": "bot",
        "slug": "bot",
        "objectID": "56744721958ef13879b948df"
    },
    {
        "name": "chatbot",
        "slug": "chatbot",
        "objectID": "57444f35468ae9e479434fac"
    },
    {
        "name": "risingstack",
        "slug": "risingstack",
        "objectID": "587745676b985e96ec6d48b7"
    },
    {
        "name": "trends",
        "slug": "trends",
        "objectID": "56744721958ef13879b94a2a"
    },
    {
        "name": "Jest",
        "slug": "jest",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1496389933/s2t8atgotu6wvjgojpn6.png",
        "objectID": "56cfe81bfa28f5fe7f74d215"
    },
    {
        "name": "refactoring",
        "slug": "refactoring",
        "objectID": "56744720958ef13879b947df"
    },
    {
        "name": "frameworks",
        "slug": "frameworks",
        "objectID": "56744721958ef13879b94db1"
    },
    {
        "name": "arrays",
        "slug": "arrays",
        "objectID": "579350e1d87e23e5efe30d84"
    },
    {
        "name": "cheatsheet",
        "slug": "cheatsheet",
        "objectID": "56cc66fff978c91273a36237"
    },
    {
        "name": "team",
        "slug": "team",
        "objectID": "56744723958ef13879b952e7"
    },
    {
        "name": "docker images",
        "slug": "docker-images",
        "objectID": "5f442ff51b2ea309b7529267"
    },
    {
        "name": "classes",
        "slug": "classes",
        "objectID": "56744723958ef13879b955a3"
    },
    {
        "name": "workflow",
        "slug": "workflow",
        "objectID": "56744722958ef13879b94e77"
    },
    {
        "name": "ML",
        "slug": "ml",
        "objectID": "57c6e7bdb274bac7e601abe2"
    },
    {
        "name": "neural networks",
        "slug": "neural-networks",
        "objectID": "56af3b4ccc975f0cc6878c8a"
    },
    {
        "name": "javascript modules",
        "slug": "javascript-modules",
        "objectID": "56cbdab9b70682283f9edeae"
    },
    {
        "name": "skills",
        "slug": "skills",
        "objectID": "576b3918decdd3bf3610c80b"
    },
    {
        "name": "Internet of Things",
        "slug": "internet-of-things",
        "objectID": "58f8acb0e928dad5e4c7ab2b"
    },
    {
        "name": "dns",
        "slug": "dns",
        "objectID": "5674471d958ef13879b94798"
    },
    {
        "name": "Blazor ",
        "slug": "blazor-1",
        "objectID": "5f219f52ef20f63bcf9822c6"
    },
    {
        "name": "Script",
        "slug": "script",
        "objectID": "56a294beff99ae055eeffcea"
    },
    {
        "name": "Help Needed",
        "slug": "help",
        "objectID": "5674471d958ef13879b94764"
    },
    {
        "name": "mobile",
        "slug": "mobile",
        "objectID": "56744723958ef13879b9524e"
    },
    {
        "name": "Amplify Hashnode",
        "slug": "amplifyhashnode",
        "logo": null,
        "objectID": "60223d4f281265375d643d83"
    },
    {
        "name": "ssh",
        "slug": "ssh",
        "objectID": "5677ff6aec7aa67e51f1e096"
    },
    {
        "name": "Software Testing",
        "slug": "software-testing",
        "objectID": "56b54dae8dabdc6142c1ac86"
    },
    {
        "name": "dev tools",
        "slug": "dev-tools",
        "objectID": "56744723958ef13879b9527c"
    },
    {
        "name": "https",
        "slug": "https",
        "objectID": "56744722958ef13879b94e73"
    },
    {
        "name": "Inspiration",
        "slug": "inspiration",
        "objectID": "57de56e3c61e5b59729da2a8"
    },
    {
        "name": "Ajax",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1459504130/huzynvc2g3hd5w8sjw6w.jpg",
        "slug": "ajax",
        "objectID": "56744722958ef13879b95140"
    },
    {
        "name": "DEVCommunity",
        "slug": "devcommunity",
        "objectID": "5f1ccb30f4016901885cc50f"
    },
    {
        "name": "oauth",
        "slug": "oauth",
        "objectID": "56744722958ef13879b951b1"
    },
    {
        "name": "design principles",
        "slug": "design-principles",
        "objectID": "5f965c1c40346172a86c2c4b"
    },
    {
        "name": "mentalhealth",
        "slug": "mentalhealth-1",
        "objectID": "5f7e39240e5d207780d949e9"
    },
    {
        "name": "#hacktoberfest ",
        "slug": "hacktoberfest-1",
        "objectID": "5f6629266dfc523d0a89357b"
    },
    {
        "name": "MobX",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1534512814483/SJUnRS4U7.jpeg",
        "slug": "mobx",
        "objectID": "5729bc14faa06f875ef32e95"
    },
    {
        "name": "ec2",
        "slug": "ec2",
        "objectID": "56744721958ef13879b94a18"
    },
    {
        "name": "setup",
        "slug": "setup",
        "objectID": "57a37bf75bfdd08aeffb5832"
    },
    {
        "name": "devtools",
        "slug": "devtools",
        "objectID": "56744722958ef13879b950fe"
    },
    {
        "name": "ecmascript",
        "slug": "ecmascript",
        "objectID": "56744722958ef13879b9511f"
    },
    {
        "name": "styled-components",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1486104606/jbhiqodxlyhaqogfuqwy.png",
        "slug": "styled-components",
        "objectID": "58900d47afa2b4bce2efb44f"
    },
    {
        "name": "REST",
        "slug": "rest",
        "objectID": "56744721958ef13879b949f6"
    },
    {
        "name": "caching",
        "slug": "caching",
        "objectID": "56744723958ef13879b9540f"
    },
    {
        "name": "7daystreak",
        "slug": "7daystreak",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1626280769878/xaxdZgS0N.png",
        "objectID": "60ed9e18fc37a15ec15683b3"
    },
    {
        "name": "image processing",
        "slug": "image-processing",
        "objectID": "5674471d958ef13879b94776"
    },
    {
        "name": "Web API",
        "slug": "web-api",
        "objectID": "5894ec2f47e4163deb72c252"
    },
    {
        "name": "ideas",
        "slug": "ideas",
        "objectID": "56744721958ef13879b948f6"
    },
    {
        "name": "hack",
        "slug": "hack",
        "objectID": "56744723958ef13879b95426"
    },
    {
        "name": "hardware",
        "slug": "hardware",
        "objectID": "568439646b179c61d167f08d"
    },
    {
        "name": "web application",
        "slug": "web-application",
        "objectID": "56744723958ef13879b952c2"
    },
    {
        "name": "library",
        "slug": "library",
        "objectID": "56744721958ef13879b94d94"
    },
    {
        "name": "opencv",
        "slug": "opencv",
        "objectID": "587745676b985e96ec6d48b8"
    },
    {
        "name": "AWS Certified Solutions Architect Associate",
        "slug": "aws-certified-solutions-architect-associate",
        "objectID": "5f71b762eb14b172f1d4bc39"
    },
    {
        "name": "CSS Grid",
        "slug": "css-grid",
        "objectID": "58becf402a99d222c65c24d8"
    },
    {
        "name": "job",
        "slug": "job",
        "objectID": "56744721958ef13879b94a46"
    },
    {
        "name": "leadership",
        "slug": "leadership",
        "objectID": "57c15e52387df20e0b9f94a0"
    },
    {
        "name": "Jenkins",
        "slug": "jenkins",
        "objectID": "57d6d71cf72dd3705c15ffcf"
    },
    {
        "name": "eslint",
        "slug": "eslint",
        "objectID": "570f716a115103c3b0978698"
    },
    {
        "name": "time",
        "slug": "time",
        "objectID": "58f7bab0e1eb1bd4e45f05f0"
    },
    {
        "name": "realtime",
        "slug": "realtime",
        "objectID": "56744721958ef13879b94bdf"
    },
    {
        "name": "Math",
        "slug": "math",
        "objectID": "581ad086c055bbfb46d8811b"
    },
    {
        "name": "conference",
        "slug": "conference",
        "objectID": "56744721958ef13879b9493b"
    },
    {
        "name": "general",
        "slug": "general",
        "objectID": "56fd6444404be5549d3de51b"
    },
    {
        "name": "encryption",
        "slug": "encryption",
        "objectID": "56744723958ef13879b9528d"
    },
    {
        "name": "files",
        "slug": "files",
        "objectID": "57f7bbb9813841efc19c3488"
    },
    {
        "name": "error handling",
        "slug": "error-handling",
        "objectID": "56744722958ef13879b95084"
    },
    {
        "name": "Auth0Hackathon",
        "slug": "auth0hackathon",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1627916253311/DuFTo1seC.png",
        "objectID": "6108059fb97c436d241bddc5"
    },
    {
        "name": "numpy",
        "slug": "numpy",
        "objectID": "57c7c7c7e53060955aa8c018"
    },
    {
        "name": "D3.js",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1459873316/fdlqr3pk587gddsrirxe.jpg",
        "slug": "d3js",
        "objectID": "56744721958ef13879b94d8c"
    },
    {
        "name": "Apollo GraphQL",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1467922175/sbxeze75uotah3qeqhbh.png",
        "slug": "apollo",
        "objectID": "57053ef1115103c3b0977fb0"
    },
    {
        "name": "Nuxt",
        "slug": "nuxt",
        "objectID": "591c5a1956856e7d71046403"
    },
    {
        "name": "DDD",
        "slug": "ddd",
        "objectID": "576b14ad41d2cbca360cf875"
    },
    {
        "name": "excel",
        "slug": "excel",
        "objectID": "591414b39e2b75ff7c5fa62d"
    },
    {
        "name": "branding",
        "slug": "branding",
        "objectID": "56b71ac92894c38346c06670"
    },
    {
        "name": "Web Components",
        "slug": "web-components",
        "objectID": "56744723958ef13879b95564"
    },
    {
        "name": "dynamodb",
        "slug": "dynamodb",
        "objectID": "56744722958ef13879b950d8"
    },
    {
        "name": "College",
        "slug": "college",
        "objectID": "587dbc32d40f782e50cf92df"
    },
    {
        "name": "journal",
        "slug": "journal",
        "objectID": "5674471d958ef13879b94791"
    },
    {
        "name": "state",
        "slug": "state",
        "objectID": "584ac47b9747b36ae2a28c8a"
    },
    {
        "name": "impostor syndrome",
        "slug": "impostor-syndrome",
        "objectID": "56744723958ef13879b95306"
    },
    {
        "name": "creativity",
        "slug": "creativity",
        "objectID": "56744721958ef13879b94829"
    },
    {
        "name": "SheCodeAfrica ",
        "slug": "shecodeafrica",
        "objectID": "5f115a51d6c58d29e0240e45"
    },
    {
        "name": "SocketIO",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1472485355/zsypm63fq6998mc1pqvl.png",
        "slug": "socketio",
        "objectID": "56744721958ef13879b94b52"
    },
    {
        "name": "HTML Canvas",
        "slug": "html-canvas",
        "objectID": "5692580fcad8946e563c570a"
    },
    {
        "name": "QA",
        "slug": "qa",
        "objectID": "56a20c4d92921b8f79d36276"
    },
    {
        "name": "linux kernel",
        "slug": "linux-kernel",
        "objectID": "5faadc16d6009557c49f5bbb"
    },
    {
        "name": "Travel",
        "slug": "travel",
        "objectID": "58859588abf4ad10c6ac08b6"
    },
    {
        "name": "authorization",
        "slug": "authorization",
        "objectID": "56744722958ef13879b9518c"
    },
    {
        "name": "Scrum",
        "slug": "scrum",
        "objectID": "570a9a273aeb5317437380e4"
    },
    {
        "name": "Validation",
        "slug": "validation",
        "objectID": "56c093923ddee41359169468"
    },
    {
        "name": "messaging",
        "slug": "messaging",
        "objectID": "57d832bbd17cab545cab9dbf"
    },
    {
        "name": "Computer Vision",
        "slug": "computer-vision",
        "objectID": "57534dab82cbbab8dcd475b9"
    },
    {
        "name": "ios app developer",
        "slug": "ios-app-developer",
        "objectID": "56744723958ef13879b9542c"
    },
    {
        "name": "Xamarin",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1464701189/ms3lwj8fdp2agynrxrly.jpg",
        "slug": "xamarin",
        "objectID": "56744721958ef13879b94825"
    },
    {
        "name": "mvc",
        "slug": "mvc",
        "objectID": "56744721958ef13879b94995"
    },
    {
        "name": "fonts",
        "slug": "fonts",
        "objectID": "56744721958ef13879b9499e"
    },
    {
        "name": "video streaming",
        "slug": "video-streaming",
        "objectID": "590c71fe1ae3d06072e8956c"
    },
    {
        "name": "closure",
        "slug": "closure",
        "objectID": "56744721958ef13879b94b1e"
    },
    {
        "name": "HarperDB Hackathon",
        "slug": "harperdbhackathon",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1623401171709/jCXKCcOIl.png",
        "objectID": "60b7952425dc276ffb940618"
    },
    {
        "name": "axios",
        "slug": "axios",
        "objectID": "58887bba81421379798066f5"
    },
    {
        "name": "mentorship",
        "slug": "mentorship",
        "objectID": "575c2d212f07b512c4dce579"
    },
    {
        "name": "code smell ",
        "slug": "code-smell-1",
        "objectID": "5fa7f4cac0d56c5ae62e3471"
    },
    {
        "name": "Web Accessibility",
        "slug": "web-accessibility",
        "objectID": "5f3f1dcc5b3ac8481821c47c"
    },
    {
        "name": "#growth",
        "slug": "growth-1",
        "objectID": "5f21ee72ef20f63bcf98250b"
    },
    {
        "name": "shopify",
        "slug": "shopify",
        "objectID": "57d2f8b8739df23de32d9a0b"
    },
    {
        "name": "dailydev",
        "slug": "dailydev",
        "objectID": "5f4e6e6de613341d6f8cd33e"
    },
    {
        "name": "expressjs",
        "slug": "expressjs",
        "objectID": "56744721958ef13879b94d81"
    },
    {
        "name": "fun",
        "slug": "fun",
        "objectID": "56744723958ef13879b954b1"
    },
    {
        "name": "android development",
        "slug": "android-development",
        "objectID": "56744722958ef13879b95086"
    },
    {
        "name": "DevBlogging",
        "slug": "devblogging",
        "objectID": "5f323f334332ee07eb55c25e"
    },
    {
        "name": "Scala",
        "slug": "scala",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1496318498/u1ogtyiakscd683ar63g.png",
        "objectID": "56744723958ef13879b952a7"
    },
    {
        "name": "repository",
        "slug": "repository",
        "objectID": "56744721958ef13879b94932"
    },
    {
        "name": "Gulp",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1455107024/ymnvwdrzghdaupgnh1pa.png",
        "slug": "gulp",
        "objectID": "56744723958ef13879b954b9"
    },
    {
        "name": "CodePen",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1490300926/zpeedkxkcyorvxzepwdq.png",
        "slug": "codepen",
        "objectID": "56744722958ef13879b94f3e"
    },
    {
        "name": "front-end",
        "slug": "front-end-cik5w32oi016zos53hitiymhh",
        "objectID": "56b118e610979efc2b9a8d91"
    },
    {
        "name": "Salesforce",
        "slug": "salesforce",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1542629160319/SkxND7eC7.jpeg",
        "objectID": "578d40c45460288cdeb6f094"
    },
    {
        "name": "Auth ",
        "slug": "auth",
        "objectID": "5762d998d163d06a3fca2d8d"
    },
    {
        "name": "sorting",
        "slug": "sorting",
        "objectID": "56e79a12c10bbcfb0ce541b1"
    },
    {
        "name": "slack",
        "slug": "slack",
        "objectID": "56744723958ef13879b952bc"
    },
    {
        "name": "languages",
        "slug": "languages",
        "objectID": "56744723958ef13879b95347"
    },
    {
        "name": "Amazon",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1469216724/nxiuwpm6dybqbn9dhybc.png",
        "slug": "amazon",
        "objectID": "56744721958ef13879b94906"
    },
    {
        "name": "storage",
        "slug": "storage",
        "objectID": "5708ff9c115103c3b09782d7"
    },
    {
        "name": "algorithm",
        "slug": "algorithm",
        "objectID": "56744721958ef13879b94de3"
    },
    {
        "name": "pdf",
        "slug": "pdf",
        "objectID": "57962622bdb2f5db657ae6c3"
    },
    {
        "name": "fetch",
        "slug": "fetch",
        "objectID": "5758618112a8cb07bb8426d2"
    },
    {
        "name": "dependency injection",
        "slug": "dependency-injection",
        "objectID": "56e6d5598c0bb8288a559c95"
    },
    {
        "name": "template",
        "slug": "template",
        "objectID": "56c4cd6eedfec14f66f81d98"
    },
    {
        "name": "RxJS",
        "slug": "rxjs",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1512113179321/HJXmNY0lf.jpeg",
        "objectID": "56744723958ef13879b95559"
    },
    {
        "name": "WebAssembly",
        "slug": "webassembly",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1510296821/n90fqabiufcs8kbridxm.png",
        "objectID": "56744722958ef13879b95043"
    },
    {
        "name": "game",
        "slug": "game",
        "objectID": "56744721958ef13879b9496d"
    },
    {
        "name": "lambda",
        "slug": "lambda",
        "objectID": "56744721958ef13879b94867"
    },
    {
        "name": "JSX",
        "slug": "jsx",
        "objectID": "577b65e0a1ac2f52aea75814"
    },
    {
        "name": "GUI",
        "slug": "gui",
        "objectID": "574dd005be8cff2ed6571a4f"
    },
    {
        "name": "theme",
        "slug": "theme",
        "objectID": "58e1a2b84200d85d6bfc1457"
    },
    {
        "name": "routing",
        "slug": "routing",
        "objectID": "56744721958ef13879b949fb"
    },
    {
        "name": "Firefox",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1511214305890/HJ9ka6gxM.jpeg",
        "slug": "firefox",
        "objectID": "56744721958ef13879b94929"
    },
    {
        "name": "visual studio",
        "slug": "visual-studio",
        "objectID": "56744723958ef13879b953df"
    },
    {
        "name": "migration",
        "slug": "migration",
        "objectID": "56744723958ef13879b9534f"
    },
    {
        "name": "Foundation",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450470022/sfgwosxc2dgxo9yslapu.png",
        "slug": "foundation",
        "objectID": "56744722958ef13879b94fc2"
    },
    {
        "name": "LinkedIn",
        "slug": "linkedin",
        "objectID": "575ebcbada600b8ef43e51c4"
    },
    {
        "name": "planning",
        "slug": "planning",
        "objectID": "57ed528897eba84632db5b88"
    },
    {
        "name": "static",
        "slug": "static",
        "objectID": "57cbff559b3eb82e014a0364"
    },
    {
        "name": "Indie Maker",
        "slug": "indie-maker",
        "objectID": "5f1edf42cf3e61138dbef956"
    },
    {
        "name": "ThreeJS",
        "slug": "threejs",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1520160600492/Bklw1UKOM.jpeg",
        "objectID": "571fa589cfc14de85d6aca42"
    },
    {
        "name": "Yarn",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1477030779/nbhawthd7lervqjdiwrz.jpg",
        "slug": "yarn",
        "objectID": "5801b9c24c0f5aee780a3883"
    },
    {
        "name": "User Interface",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1462773835/uvhdwekyfkkh1tldkew7.jpg",
        "slug": "user-interface",
        "objectID": "56744721958ef13879b94823"
    },
    {
        "name": "fullstack",
        "slug": "fullstack",
        "objectID": "56744721958ef13879b94a6c"
    },
    {
        "name": "web performance",
        "slug": "web-performance",
        "objectID": "56744721958ef13879b94950"
    },
    {
        "name": "websockets",
        "slug": "websockets",
        "objectID": "56744721958ef13879b94a0f"
    },
    {
        "name": "SEO for Developers",
        "slug": "seo-for-developers",
        "objectID": "5f58d1c9ffbb8f35dd030cdd"
    },
    {
        "name": "graphic design",
        "slug": "graphic-design",
        "objectID": "56ab4801960088c21db4d845"
    },
    {
        "name": "bootstrap 4",
        "slug": "bootstrap-4",
        "objectID": "56744723958ef13879b953a4"
    },
    {
        "name": "push notifications",
        "slug": "push-notifications",
        "objectID": "577d40e61e03c69a78fb0dac"
    },
    {
        "name": "color",
        "slug": "color",
        "objectID": "5774aa8157675ec2fcfd0744"
    },
    {
        "name": "Scope",
        "slug": "scope",
        "objectID": "56f16b6cea857e0c6af05a4c"
    },
    {
        "name": "create-react-app",
        "slug": "create-react-app",
        "objectID": "58ec8cb535aeeb5330e71961"
    },
    {
        "name": "scalability",
        "slug": "scalability",
        "objectID": "5691193ecad8946e563c56e9"
    },
    {
        "name": "server hosting",
        "slug": "server-hosting",
        "objectID": "56744723958ef13879b9553e"
    },
    {
        "name": "login",
        "slug": "login",
        "objectID": "56b45894500fd79e29bd7bf4"
    },
    {
        "name": "Chat",
        "slug": "chat",
        "objectID": "575e6494ed4fa39df4f9af08"
    },
    {
        "name": "Culture",
        "slug": "culture",
        "objectID": "568a70511f77b14a93d83737"
    },
    {
        "name": "Recursion",
        "slug": "recursion",
        "objectID": "56903d0e91716a2d1dbadbca"
    },
    {
        "name": "cloudflare",
        "slug": "cloudflare",
        "objectID": "56744720958ef13879b947e6"
    },
    {
        "name": "whatsapp",
        "slug": "whatsapp",
        "objectID": "5732da8af311f7ed13dddcb3"
    },
    {
        "name": "Off Topic",
        "slug": "off-topic",
        "objectID": "575ab7852f07b512c4dce46e"
    },
    {
        "name": "passwords",
        "slug": "passwords",
        "objectID": "578395f816a33191db0432f4"
    },
    {
        "name": "map",
        "slug": "map",
        "objectID": "56fd21cd770db0f14a63ee67"
    },
    {
        "slug": "go-cjffccfnf0024tjs1mcwab09t",
        "objectID": "5abf7c154496b1f745e95fce"
    },
    {
        "name": "Tailwind CSS Tutorial",
        "slug": "tailwind-css-tutorial",
        "objectID": "5f76e2947d160d41227d65b9"
    },
    {
        "name": "SQLite",
        "slug": "sqlite",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1516183050940/BJXG0cn4z.jpeg",
        "objectID": "56d9e25a4aa5f35f09dd6c98"
    },
    {
        "name": "WebGL",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1472831587/ajchcv7sjghl7p5k1tgm.jpg",
        "slug": "webgl",
        "objectID": "56744721958ef13879b94a3f"
    },
    {
        "name": "Phoenix framework",
        "slug": "phoenix",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1522051540209/Hy20FXI5G.jpeg",
        "objectID": "56744721958ef13879b94abc"
    },
    {
        "name": "magento 2",
        "slug": "magento-2",
        "objectID": "587789c03c79514bec516060"
    },
    {
        "name": "editors",
        "slug": "editors",
        "objectID": "56744723958ef13879b95262"
    },
    {
        "name": "google sheets",
        "slug": "google-sheets",
        "objectID": "56e669b622f645300192ed17"
    },
    {
        "name": "kafka",
        "slug": "kafka",
        "objectID": "572527cf5ec4095ed6f48bf3"
    },
    {
        "name": "Art",
        "slug": "art",
        "objectID": "56efa81abcca2d711e191eb9"
    },
    {
        "name": "generators",
        "slug": "generators",
        "objectID": "56744722958ef13879b950b8"
    },
    {
        "name": "Company",
        "slug": "company",
        "objectID": "572ca231bf97af427dd07e6c"
    },
    {
        "name": "console",
        "slug": "console",
        "objectID": "56744723958ef13879b952e1"
    },
    {
        "name": "Virtual Reality",
        "slug": "virtual-reality",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1506666919/d9j2ku0cjlhrzrboojit.png",
        "objectID": "56c87d289b87edaf6e25f825"
    },
    {
        "name": "apps",
        "slug": "apps",
        "objectID": "56744721958ef13879b94ac2"
    },
    {
        "name": "plugins",
        "slug": "plugins",
        "objectID": "56744723958ef13879b95204"
    },
    {
        "name": "terminal command",
        "slug": "terminal-command",
        "objectID": "5f6afc44cbf0b22e6d444142"
    },
    {
        "name": "arduino",
        "slug": "arduino",
        "objectID": "56744722958ef13879b951db"
    },
    {
        "name": "email marketing",
        "slug": "email-marketing",
        "objectID": "57b76044a629e4147b4251d5"
    },
    {
        "name": "project",
        "slug": "project",
        "objectID": "56744721958ef13879b94aae"
    },
    {
        "name": "3d",
        "slug": "3d",
        "objectID": "56744721958ef13879b94ad9"
    },
    {
        "name": "charts",
        "slug": "charts",
        "objectID": "56744720958ef13879b947d1"
    },
    {
        "name": "e-learning",
        "slug": "e-learning",
        "objectID": "569c9b4c72ca04ea5d79fc6c"
    },
    {
        "name": "browser",
        "slug": "browser",
        "objectID": "56744721958ef13879b94a11"
    },
    {
        "name": "snippets",
        "slug": "snippets",
        "objectID": "56744721958ef13879b948ae"
    },
    {
        "name": "Flux",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450468113/cariy62rvjvlnz8ks7qw.png",
        "slug": "flux",
        "objectID": "56744721958ef13879b94d46"
    },
    {
        "name": "mac",
        "slug": "mac",
        "objectID": "56744721958ef13879b94a22"
    },
    {
        "name": "os",
        "slug": "os",
        "objectID": "568f6e425e7a940b3d3e0a92"
    },
    {
        "name": "integration",
        "slug": "integration",
        "objectID": "57f58a9917809963610207dd"
    },
    {
        "name": "logic",
        "slug": "logic",
        "objectID": "57b23c4cab585a4d6c1529cd"
    },
    {
        "name": "history",
        "slug": "history",
        "objectID": "572706c827ca2053d6613898"
    },
    {
        "name": "SOLID principles",
        "slug": "solid-principles",
        "objectID": "5f4dd1ae6f2d7874d4060e9b"
    },
    {
        "name": "Blogger",
        "slug": "blogger-1",
        "objectID": "5f2a4ee0d7d55f162b5da120"
    },
    {
        "name": "developer relations",
        "slug": "developer-relations",
        "objectID": "56744723958ef13879b953b6"
    },
    {
        "name": "Service Workers",
        "slug": "service-workers",
        "objectID": "56a746ba6e715c3c7fc5b7ef"
    },
    {
        "name": "iphone",
        "slug": "iphone",
        "objectID": "56744722958ef13879b95166"
    },
    {
        "name": "Parse",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1457160633/ybpgyd9fhrucyvgwda6a.png",
        "slug": "parse",
        "objectID": "56744722958ef13879b94efb"
    },
    {
        "slug": "sagar-jaybhay",
        "objectID": "5cd9909c45e85c572ab538f7"
    },
    {
        "name": "design review",
        "slug": "design-review",
        "objectID": "5fb179420f6d4f4d2f66a32a"
    },
    {
        "name": "Career Coach",
        "slug": "career-coach",
        "objectID": "5f0bc6ef3fe8405bdb8d80be"
    },
    {
        "name": "hadoop",
        "slug": "hadoop",
        "objectID": "56744720958ef13879b94799"
    },
    {
        "name": "graph database",
        "slug": "graph-database",
        "objectID": "58b96527be993da9e4853150"
    },
    {
        "name": "continuous delivery",
        "slug": "continuous-delivery",
        "objectID": "56744721958ef13879b949a3"
    },
    {
        "name": "concurrency",
        "slug": "concurrency",
        "objectID": "56744723958ef13879b95312"
    },
    {
        "name": "compiler",
        "slug": "compiler",
        "objectID": "58790ce83c79514bec51631b"
    },
    {
        "name": "gsoc",
        "slug": "gsoc",
        "objectID": "56744721958ef13879b94dea"
    },
    {
        "name": "spa",
        "slug": "spa",
        "objectID": "56744721958ef13879b94d40"
    },
    {
        "name": "Collaboration",
        "slug": "collaboration",
        "objectID": "57d0839fb64935c2e8fdba94"
    },
    {
        "name": "Event Loop",
        "slug": "event-loop",
        "objectID": "56f7b7c59cad82b1e979026a"
    },
    {
        "name": "crud",
        "slug": "crud",
        "objectID": "56f71ff1aa013a5f87413652"
    },
    {
        "name": "Hoisting",
        "slug": "hoisting",
        "objectID": "56db37c9e853431899d03773"
    },
    {
        "name": "life-hack",
        "slug": "life-hack",
        "objectID": "5f96548740346172a86c2be7"
    },
    {
        "name": "mobile application design",
        "slug": "mobile-application-design",
        "objectID": "56744723958ef13879b95516"
    },
    {
        "name": "unix",
        "slug": "unix",
        "objectID": "56744721958ef13879b94a53"
    },
    {
        "name": "AdonisJS",
        "slug": "adonisjs",
        "objectID": "5770f47198002dc2b990254a"
    },
    {
        "name": "ecmascript6",
        "slug": "ecmascript6",
        "objectID": "56744720958ef13879b947db"
    },
    {
        "name": "stack",
        "slug": "stack",
        "objectID": "56744723958ef13879b95368"
    },
    {
        "slug": "cybersecurity",
        "objectID": "593a98f803de49038fb02fd4"
    },
    {
        "name": "streaming",
        "slug": "streaming",
        "objectID": "56744722958ef13879b9505d"
    },
    {
        "name": "sysadmin",
        "slug": "sysadmin",
        "objectID": "56744721958ef13879b94aa2"
    },
    {
        "name": "build",
        "slug": "build",
        "objectID": "56744723958ef13879b95552"
    },
    {
        "name": "smart home",
        "slug": "smart-home",
        "objectID": "590d86fe042257bf29db782c"
    },
    {
        "name": "modules",
        "slug": "modules",
        "objectID": "56744722958ef13879b95197"
    },
    {
        "name": "CDN",
        "slug": "cdn",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1496755229/pmzin0lidq2ld88qeba5.png",
        "objectID": "56744720958ef13879b947ae"
    },
    {
        "name": "#the-technical-writing-bootcamp",
        "slug": "the-technical-writing-bootcamp-1",
        "objectID": "5f732a92f955ec0a130f6290"
    },
    {
        "name": "Sublime Text",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1497046439/xny5lu0xfjzpfybrrl9c.png",
        "slug": "sublime-text",
        "objectID": "56744723958ef13879b95216"
    },
    {
        "name": "Ember.js",
        "slug": "emberjs",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1498115063/txor4lfourtkcofjipii.png",
        "objectID": "56744721958ef13879b94c17"
    },
    {
        "name": "Vuex",
        "slug": "vuex",
        "objectID": "580209af0c9f06220778a866"
    },
    {
        "name": "wordpress plugins",
        "slug": "wordpress-plugins",
        "objectID": "56744721958ef13879b94965"
    },
    {
        "name": "zsh",
        "slug": "zsh",
        "objectID": "56744723958ef13879b95202"
    },
    {
        "name": "recruitment",
        "slug": "recruitment",
        "objectID": "57b0b5a1fbdd622c03136428"
    },
    {
        "name": "Server side rendering",
        "slug": "server-side-rendering",
        "objectID": "5759222f462c2daddc9ac412"
    },
    {
        "name": "Roadmap",
        "slug": "roadmap",
        "objectID": "58cd6353557528fb61666e5d"
    },
    {
        "name": "hashnodebootcamp2",
        "slug": "hashnodebootcamp2-1",
        "objectID": "5faec06b7fcc8d387fc0d1a6"
    },
    {
        "name": "Polymer",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450468312/zwtljjmofmpplvho1wfa.png",
        "slug": "polymer",
        "objectID": "56744723958ef13879b954ab"
    },
    {
        "name": "Expo",
        "slug": "expo",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1515394575880/SkuMI5gEM.jpeg",
        "objectID": "58cb5f69ecb020d9744a6487"
    },
    {
        "name": "xml",
        "slug": "xml",
        "objectID": "56744721958ef13879b94b0b"
    },
    {
        "name": "tooling",
        "slug": "tooling",
        "objectID": "56744723958ef13879b95335"
    },
    {
        "name": "canvas",
        "slug": "canvas",
        "objectID": "56744722958ef13879b94f55"
    },
    {
        "name": "Backup",
        "slug": "backup",
        "objectID": "57df9e894a6aa43e72a98a15"
    },
    {
        "name": "Explain like I am five",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1516175943338/SJ1IzFnVf.jpeg",
        "slug": "explain-like-i-am-five",
        "objectID": "5991e91f0bcf15061f140b7f"
    },
    {
        "name": "embedded",
        "slug": "embedded",
        "objectID": "571eb24785916079574f035e"
    },
    {
        "name": "bots",
        "slug": "bots",
        "objectID": "56f2726a35c92c494c5e3a73"
    },
    {
        "name": "Homebrew",
        "slug": "homebrew",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1502355995/yusx5q732shmiaypoq3f.png",
        "objectID": "56744722958ef13879b951e9"
    },
    {
        "name": "webdesign",
        "slug": "webdesign",
        "objectID": "56744721958ef13879b949ec"
    },
    {
        "name": "styling",
        "slug": "styling",
        "objectID": "580515064c0f5aee780a3c9b"
    },
    {
        "name": "Mozilla",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1477481389/i3tfvov4fuqfkg2yeddv.png",
        "slug": "mozilla",
        "objectID": "56744721958ef13879b94c4f"
    },
    {
        "name": "javascript books",
        "slug": "javascript-books",
        "objectID": "56744723958ef13879b953fa"
    },
    {
        "name": "Atom",
        "slug": "atom",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1497040963/kh7an2akihm9tf1w5ab2.png",
        "objectID": "56744721958ef13879b94aa6"
    },
    {
        "name": "dev",
        "slug": "dev",
        "objectID": "56744721958ef13879b948bc"
    },
    {
        "name": "Best of Hashnode",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1556009843016/9mcKMnTI3.png",
        "slug": "best-of-hashnode",
        "objectID": "5c0c2ed6659f658d077550cf"
    },
    {
        "name": "Stack Overflow",
        "slug": "stackoverflow",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1499949492/jff8br3fbln1yccb1tpb.png",
        "objectID": "56744721958ef13879b949d7"
    },
    {
        "name": "progressive web apps",
        "slug": "progressive-web-apps",
        "objectID": "5702d00aabbcb496574bce11"
    },
    {
        "name": "animations",
        "slug": "animations",
        "objectID": "56744721958ef13879b948b4"
    },
    {
        "name": "translation",
        "slug": "translation",
        "objectID": "576ccb742d4c0ff55a8ae17a"
    },
    {
        "name": "desktop",
        "slug": "desktop",
        "objectID": "56744721958ef13879b948ce"
    },
    {
        "name": "habits",
        "slug": "habits",
        "objectID": "57e22bd48b1fca72b28833a4"
    },
    {
        "name": "#codingNewbies",
        "slug": "codingnewbies",
        "objectID": "5f7f9e43b8638504a7c122ed"
    },
    {
        "name": "google maps",
        "slug": "google-maps",
        "objectID": "57496c3892b151fb90adc735"
    },
    {
        "name": "back4app",
        "slug": "back4app",
        "objectID": "578bf0674416601b9574cb3b"
    },
    {
        "name": "Libraries",
        "slug": "libraries",
        "objectID": "568ecddf91716a2d1dbadb19"
    },
    {
        "name": "prototyping",
        "slug": "prototyping",
        "objectID": "56744723958ef13879b95241"
    },
    {
        "name": "Real Estate",
        "slug": "real-estate",
        "objectID": "56ee695b5edec9d7189a0be5"
    },
    {
        "name": "cache",
        "slug": "cache",
        "objectID": "567bfb342b926c3063c307dc"
    },
    {
        "name": "teaching",
        "slug": "teaching",
        "objectID": "56744723958ef13879b955b7"
    },
    {
        "name": "multithreading",
        "slug": "multithreading",
        "objectID": "56744723958ef13879b95300"
    },
    {
        "name": "opinion pieces",
        "slug": "opinion-pieces",
        "objectID": "5f0ffe5eaa660c1c354c06fc"
    },
    {
        "name": ".net core",
        "slug": "net-core",
        "objectID": "57d7d0d0f72dd3705c16014a"
    },
    {
        "name": "freelance",
        "slug": "freelance",
        "objectID": "56744722958ef13879b94e57"
    },
    {
        "name": "deployment automation",
        "slug": "deployment-automation",
        "objectID": "56744722958ef13879b95067"
    },
    {
        "name": "icon",
        "slug": "icon",
        "objectID": "56744723958ef13879b95289"
    },
    {
        "name": "Hashing",
        "slug": "hashing",
        "objectID": "591fd9bfe1cc498f829bf264"
    },
    {
        "name": "boilerplate",
        "slug": "boilerplate",
        "objectID": "56744723958ef13879b953b2"
    },
    {
        "name": "navigation",
        "slug": "navigation",
        "objectID": "574125dadf1e4d3563843066"
    },
    {
        "name": "Geospatial",
        "slug": "geospatial",
        "objectID": "5f25726a90ac4260edf35078"
    },
    {
        "name": "angular material",
        "slug": "angular-material",
        "objectID": "57c3ba45cb80370904fc5b48"
    },
    {
        "name": "ios apps",
        "slug": "ios-apps",
        "objectID": "56744721958ef13879b94ae2"
    },
    {
        "name": "wordpress themes",
        "slug": "wordpress-themes",
        "objectID": "56744721958ef13879b94af8"
    },
    {
        "name": "k8s",
        "slug": "k8s",
        "objectID": "58456f2afc2da7579e5f3ed0"
    },
    {
        "name": "Hugo",
        "slug": "hugo",
        "objectID": "57ce27e495368c463b09804f"
    },
    {
        "name": "a11y",
        "slug": "a11y",
        "objectID": "57aa00d170387a4ab0fe0cf8"
    },
    {
        "name": "webapps",
        "slug": "webapps",
        "objectID": "56744721958ef13879b94b6f"
    },
    {
        "name": "features",
        "slug": "features",
        "objectID": "56744722958ef13879b9515c"
    },
    {
        "name": "Prettier",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1496483511/fdbnmvy2bkecx03csbom.png",
        "slug": "prettier",
        "objectID": "592d689fa6614cba3f738146"
    },
    {
        "name": "WebRTC",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1465362672/yzdode4h9er49uccfvbu.png",
        "slug": "webrtc",
        "objectID": "56744722958ef13879b94f0e"
    },
    {
        "name": "web developers",
        "slug": "web-developers",
        "objectID": "56744722958ef13879b94e6b"
    },
    {
        "name": "Emails",
        "slug": "emails",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1496150225/u6kgjtvvqkkefncoyovl.png",
        "objectID": "57458b6c92b151fb90adc493"
    },
    {
        "name": "bundling",
        "slug": "bundling",
        "objectID": "5777dbd757675ec2fcfd09fb"
    },
    {
        "name": "localstorage",
        "slug": "localstorage",
        "objectID": "56744722958ef13879b95107"
    },
    {
        "name": "Earth Engine",
        "slug": "earth-engine",
        "objectID": "5f26246490ac4260edf3596e"
    },
    {
        "name": "test driven development",
        "slug": "test-driven-development",
        "objectID": "56744723958ef13879b95595"
    },
    {
        "name": "S3",
        "slug": "s3",
        "objectID": "588f13c9ae0398620533ed80"
    },
    {
        "name": "message queue",
        "slug": "message-queue",
        "objectID": "5688d3a00716b983ccc79766"
    },
    {
        "name": "mentor",
        "slug": "mentor",
        "objectID": "56744721958ef13879b94dc8"
    },
    {
        "name": "websites",
        "slug": "websites",
        "objectID": "56744721958ef13879b94c58"
    },
    {
        "name": "maven",
        "slug": "maven",
        "objectID": "56744723958ef13879b95232"
    },
    {
        "name": "turkish",
        "slug": "turkish",
        "objectID": "5f61e4c5dc74720d9b85ed19"
    },
    {
        "name": "MEAN Stack",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1472484615/gnwpbhw8nqe9aj4frzzh.jpg",
        "slug": "mean",
        "objectID": "56744721958ef13879b94bc0"
    },
    {
        "name": "Emacs",
        "slug": "emacs",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1502978326/qzxw4oqebc9su0pzpvqt.png",
        "objectID": "56744721958ef13879b949cf"
    },
    {
        "name": "Preact",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1459503980/i2tjk2olam4wqr7kyqet.jpg",
        "slug": "preact",
        "objectID": "56fe1c265db965849f7b379f"
    },
    {
        "name": "Future",
        "slug": "future",
        "objectID": "5699066c72ca04ea5d79faa1"
    },
    {
        "name": "es2015",
        "slug": "es2015",
        "objectID": "5678d29ae0956f4764b3edfb"
    },
    {
        "name": "sales",
        "slug": "sales",
        "objectID": "58cd06ec68e963fa61d68d7f"
    },
    {
        "name": "versioning",
        "slug": "versioning",
        "objectID": "578b9582b1a4a0d81ffbb1fe"
    },
    {
        "name": "computer",
        "slug": "computer",
        "objectID": "57628dcd820dd45f3fbd8eb6"
    },
    {
        "name": "cookies",
        "slug": "cookies",
        "objectID": "56744721958ef13879b94a7d"
    },
    {
        "name": "proxy",
        "slug": "proxy",
        "objectID": "56744721958ef13879b94917"
    },
    {
        "name": "Drupal",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1490298700/uqjjgtu4a1lpqxjcdshb.png",
        "slug": "drupal",
        "objectID": "57444da29ade925885158cb0"
    },
    {
        "name": "graphics",
        "slug": "graphics",
        "objectID": "578378ebfcb4d586db19492c"
    },
    {
        "name": "Scraping",
        "slug": "scraping",
        "objectID": "5834805addfa96eb7c5d478b"
    },
    {
        "name": "typography",
        "slug": "typography",
        "objectID": "56744721958ef13879b94944"
    },
    {
        "name": "marketplace",
        "slug": "marketplace",
        "objectID": "586d0df986a586aec93327e1"
    },
    {
        "name": "OOPS",
        "slug": "oops",
        "objectID": "5713f234162bdaad9f92b0c1"
    },
    {
        "name": "production",
        "slug": "production",
        "objectID": "57067a5e115103c3b097818b"
    },
    {
        "name": "process",
        "slug": "process",
        "objectID": "5694af13c1c0117cef5aea67"
    },
    {
        "name": "API basics ",
        "slug": "api-basics",
        "objectID": "5f8dd8dffc30613d8cd9379a"
    },
    {
        "name": "PaaS",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1461694808/ip8ls4fz7nxi01uhvmch.jpg",
        "slug": "paas",
        "objectID": "56744721958ef13879b94ddc"
    },
    {
        "name": "Website design",
        "slug": "website-design",
        "objectID": "5866a4c0b99398bc30c43daa"
    },
    {
        "name": "SSR",
        "slug": "ssr",
        "objectID": "5747fbbd9ade925885158f94"
    },
    {
        "name": "i18n",
        "slug": "i18n",
        "objectID": "568f1af6525da8063d08fb2d"
    },
    {
        "name": "ci",
        "slug": "ci",
        "objectID": "56744721958ef13879b94a16"
    },
    {
        "name": "centos",
        "slug": "centos",
        "objectID": "57a67d66e6998a66b06f40e6"
    },
    {
        "name": "social",
        "slug": "social",
        "objectID": "5709b8c3115103c3b0978327"
    },
    {
        "slug": "go-cjidm6n1p00lpq9s29dy2bsiq",
        "objectID": "5b218969e0d20c016e052f69"
    },
    {
        "name": "patterns",
        "slug": "patterns",
        "objectID": "56744721958ef13879b94db8"
    },
    {
        "name": "workathome",
        "slug": "workathome",
        "objectID": "5f19d647cef915427a14ca2c"
    },
    {
        "name": "selenium-webdriver",
        "slug": "selenium-webdriver-1",
        "objectID": "5f0c3b23880268625262ba76"
    },
    {
        "name": "macbook",
        "slug": "macbook",
        "objectID": "56744721958ef13879b94dc2"
    },
    {
        "name": "Voice",
        "slug": "voice",
        "objectID": "590102fd9863a67f4cc93055"
    },
    {
        "name": "orm",
        "slug": "orm",
        "objectID": "56b632b3a0967efc587c7d24"
    },
    {
        "name": "Bitbucket",
        "slug": "bitbucket",
        "objectID": "580e08175fec191d85b14fc7"
    },
    {
        "name": "dashboard",
        "slug": "dashboard",
        "objectID": "56b45894500fd79e29bd7bf3"
    },
    {
        "name": "composer",
        "slug": "composer",
        "objectID": "56b234f2a71b2df12bea6e43"
    },
    {
        "name": "Remote Sensing ",
        "slug": "remote-sensing",
        "objectID": "5f25726a90ac4260edf35077"
    },
    {
        "name": "ELM",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1491295764/mh4haipogztgffbnt4y4.png",
        "slug": "elm",
        "objectID": "567bbdf52b926c3063c30713"
    },
    {
        "name": "spark",
        "slug": "spark",
        "objectID": "56744722958ef13879b95180"
    },
    {
        "name": "ionic framework",
        "slug": "ionic-framework",
        "objectID": "56744723958ef13879b95254"
    },
    {
        "name": "robotics",
        "slug": "robotics",
        "objectID": "56744723958ef13879b953a2"
    },
    {
        "name": "twilio",
        "slug": "twilio",
        "objectID": "57e57691ef99cf03582fe2b3"
    },
    {
        "name": "mvp",
        "slug": "mvp",
        "objectID": "56744723958ef13879b95572"
    },
    {
        "name": "medium",
        "slug": "medium",
        "objectID": "56744721958ef13879b94871"
    },
    {
        "slug": "devjourney",
        "objectID": "5e43fc8b8c89a92316ccd6c2"
    },
    {
        "name": "azure certified",
        "slug": "azure-certified",
        "objectID": "5f28ea6e3e336e0de23093c0"
    },
    {
        "name": "PostCSS",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1459504796/nipxkl4fu2zf7sqfl5fj.jpg",
        "slug": "postcss",
        "objectID": "56744721958ef13879b94e29"
    },
    {
        "name": "AR",
        "slug": "ar",
        "objectID": "586cd5ae615b9737b81b3ddb"
    },
    {
        "name": "photoshop",
        "slug": "photoshop",
        "objectID": "5674471d958ef13879b94796"
    },
    {
        "name": "crm",
        "slug": "crm",
        "objectID": "580df8332a45c6fdcb43fa14"
    },
    {
        "name": "funny",
        "slug": "funny",
        "objectID": "56744723958ef13879b9547b"
    },
    {
        "name": "Frontend frameworks",
        "slug": "frontend-frameworks",
        "objectID": "56a0676792921b8f79d360f5"
    },
    {
        "name": "technology stack",
        "slug": "technology-stack",
        "objectID": "56b99e6cacee1cee848702ec"
    },
    {
        "name": "jekyll",
        "slug": "jekyll",
        "objectID": "56744721958ef13879b948e8"
    },
    {
        "name": "cloudinary",
        "slug": "cloudinary",
        "objectID": "5678a007e0956f4764b3ed53"
    },
    {
        "name": "queue",
        "slug": "queue",
        "objectID": "56744723958ef13879b952c0"
    },
    {
        "name": "sdk",
        "slug": "sdk",
        "objectID": "56f972afea33a5b266f2fe04"
    },
    {
        "name": "styleguide",
        "slug": "styleguide",
        "objectID": "56744722958ef13879b951a4"
    },
    {
        "name": "Meta",
        "slug": "meta",
        "objectID": "58b6c12eb2566b537ac16cb7"
    },
    {
        "name": "CORS",
        "slug": "cors",
        "objectID": "5676154ae64b075af6ade54e"
    },
    {
        "name": "props",
        "slug": "props",
        "objectID": "5f2959166face9141b78fa82"
    },
    {
        "name": "Aurelia",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1453819641/j5c2dwhqwvzh9apczioe.jpg",
        "slug": "aurelia",
        "objectID": "56744722958ef13879b94f49"
    },
    {
        "name": "YAML",
        "slug": "yaml",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1499159858/ude93xlquvvbxbw5xkg4.png",
        "objectID": "56d9941a489cf60d99aa90c4"
    },
    {
        "name": "EQCSS",
        "slug": "eqcss",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1520491825399/HJF4pLCdz.png",
        "objectID": "5784baeefcb4d586db194a64"
    },
    {
        "name": "layout",
        "slug": "layout",
        "objectID": "56d2f72f1878dfef04178e6e"
    },
    {
        "name": "flow",
        "slug": "flow",
        "objectID": "56744721958ef13879b94a2e"
    },
    {
        "name": "admin",
        "slug": "admin",
        "objectID": "57778738f271844db9e1eb41"
    },
    {
        "name": "tech",
        "slug": "tech-cilba77mg0010ya53d05qtkuu",
        "objectID": "56d7498b6722ee828dbeafe3"
    },
    {
        "name": "Cordova",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1520160966692/ByyCeLt_M.jpeg",
        "slug": "cordova",
        "objectID": "56744721958ef13879b94a1b"
    },
    {
        "name": "Build tool",
        "slug": "build-tool",
        "objectID": "56744722958ef13879b950a3"
    },
    {
        "name": "vps",
        "slug": "vps",
        "objectID": "56744722958ef13879b951c4"
    },
    {
        "name": "gradle",
        "slug": "gradle",
        "objectID": "56744722958ef13879b95164"
    },
    {
        "name": "ebook",
        "slug": "ebook",
        "objectID": "56744721958ef13879b948f0"
    },
    {
        "slug": "hooks",
        "objectID": "5c1778c2252f6d5b707ae169"
    },
    {
        "name": "gmail",
        "slug": "gmail",
        "objectID": "58596eaaeb509c3ba23d4c87"
    },
    {
        "name": "inheritance",
        "slug": "inheritance",
        "objectID": "573349a7181d813d33746639"
    },
    {
        "name": "stripe",
        "slug": "stripe",
        "objectID": "56744723958ef13879b9554c"
    },
    {
        "name": "#sucessful blogging",
        "slug": "sucessful-blogging",
        "objectID": "5fb801781b7ab0041800c67c"
    },
    {
        "name": "watercooler",
        "slug": "watercooler",
        "objectID": "5f36e920877a013acb03cd10"
    },
    {
        "name": "eloquent",
        "slug": "eloquent",
        "objectID": "56ed7b765edec9d7189a0b73"
    },
    {
        "name": "image",
        "slug": "image",
        "objectID": "56744721958ef13879b948fc"
    },
    {
        "name": "book",
        "slug": "book",
        "objectID": "56744720958ef13879b947b2"
    },
    {
        "name": "router",
        "slug": "router",
        "objectID": "56744723958ef13879b95210"
    },
    {
        "name": "#ChooseToChallenge",
        "slug": "choosetochallenge",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1614605641484/1qeXO9QXg.png",
        "objectID": "603cc4b61f91337d465bee68"
    },
    {
        "name": "geemap",
        "slug": "geemap",
        "objectID": "5f465bac9b597625e2dec06a"
    },
    {
        "name": "ASP",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1451108441/qt4zgtcynwzy2rjvk0t6.png",
        "slug": "asp",
        "objectID": "5674471d958ef13879b9477c"
    },
    {
        "name": "front end",
        "slug": "front-end",
        "objectID": "56744723958ef13879b95554"
    },
    {
        "name": "SVG Animation",
        "slug": "svg-animation",
        "objectID": "569cd00972ca04ea5d79fca2"
    },
    {
        "name": "meteorjs",
        "slug": "meteorjs",
        "objectID": "56744723958ef13879b9558f"
    },
    {
        "name": "nest",
        "slug": "nest",
        "objectID": "583ca6c6ddfa96eb7c5d896f"
    },
    {
        "name": "podcasts",
        "slug": "podcasts",
        "objectID": "56744722958ef13879b95194"
    },
    {
        "name": "designing",
        "slug": "designing",
        "objectID": "56744721958ef13879b94bd9"
    },
    {
        "name": "Clerk.dev",
        "slug": "clerkdev",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1625245518596/nW4Y4hYHH.png",
        "objectID": "60df384f03707d644a4feb38"
    },
    {
        "name": "web servers",
        "slug": "web-servers",
        "objectID": "56744721958ef13879b94a88"
    },
    {
        "name": "function",
        "slug": "function",
        "objectID": "56744720958ef13879b947ea"
    },
    {
        "name": "DraftJS",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1491387822/zwctxp8006exywfg17pd.jpg",
        "slug": "draftjs",
        "objectID": "56f4d674990bca7c25e99318"
    },
    {
        "name": "redux-saga",
        "slug": "redux-saga",
        "objectID": "5776f09cf271844db9e1eb05"
    },
    {
        "name": "responsive designs",
        "slug": "responsive-designs",
        "objectID": "56744721958ef13879b94d5b"
    },
    {
        "name": "Socket.io",
        "slug": "socketio-cijy9e2c700c6vm5357q8xsf3",
        "objectID": "56aa0ea0960088c21db4d77a"
    },
    {
        "name": "OSS",
        "slug": "oss",
        "objectID": "581875942ca37f164781f4b1"
    },
    {
        "name": "chartjs",
        "slug": "chartjs",
        "objectID": "56744721958ef13879b94993"
    },
    {
        "slug": "deno",
        "objectID": "5cca9dd21077bc6278d31cc7"
    },
    {
        "slug": "cisco",
        "objectID": "5d9cc879f74b4d4660eede6b"
    },
    {
        "name": "emoji",
        "slug": "emoji",
        "objectID": "571751b03c2a84abc85a1e11"
    },
    {
        "name": "await",
        "slug": "await",
        "objectID": "56cbdb23b70682283f9edeb7"
    },
    {
        "name": "hibernate",
        "slug": "hibernate",
        "objectID": "56744723958ef13879b955ac"
    },
    {
        "name": "Julia",
        "slug": "julia",
        "objectID": "58749cfee6e8728a7f133535"
    },
    {
        "name": "vagrant",
        "slug": "vagrant",
        "objectID": "56744721958ef13879b94a24"
    },
    {
        "name": "grid",
        "slug": "grid",
        "objectID": "56744723958ef13879b952d3"
    },
    {
        "name": "naming",
        "slug": "naming",
        "objectID": "5747655e92b151fb90adc622"
    },
    {
        "name": "error",
        "slug": "error",
        "objectID": "56744721958ef13879b9496b"
    },
    {
        "name": "templates",
        "slug": "templates",
        "objectID": "56744721958ef13879b94853"
    },
    {
        "name": "design and architecture",
        "slug": "design-and-architecture",
        "objectID": "5f38bd060801bf3f76e5f9e5"
    },
    {
        "name": "Haskell",
        "slug": "haskell",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1496182720/z8gaemi99htfdnclmicj.png",
        "objectID": "56744723958ef13879b9537a"
    },
    {
        "name": "PayPal",
        "slug": "paypal",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1504679615/ds7ftsav58hjetqeeqq3.jpg",
        "objectID": "56ee65cfcb06805ba9b7c66d"
    },
    {
        "name": "native",
        "slug": "native",
        "objectID": "56744723958ef13879b9530a"
    },
    {
        "name": "maps",
        "slug": "maps",
        "objectID": "574853c092b151fb90adc6b1"
    },
    {
        "name": "class",
        "slug": "class",
        "objectID": "573c6a7803e642f04bb03d47"
    },
    {
        "name": "mobile application development",
        "slug": "mobile-application-development",
        "objectID": "56744721958ef13879b949b7"
    },
    {
        "name": "The Clerk Hackathon on Hashnode",
        "slug": "clerkhackathon",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1625245553278/S6gbVfdNp.png",
        "objectID": "60df381403707d644a4feb2f"
    },
    {
        "name": "web3",
        "slug": "web3",
        "logo": null,
        "objectID": "59df443dfb1deef9745a4ef0"
    },
    {
        "slug": "wsl",
        "objectID": "595ed5ae8f1dffe434c00000"
    },
    {
        "name": "geolocation",
        "slug": "geolocation",
        "objectID": "579f2a6bb5724a7273404206"
    },
    {
        "name": "coroutines",
        "slug": "coroutines",
        "objectID": "56facb5fbac95334fc2fa50b"
    },
    {
        "name": "object",
        "slug": "object",
        "objectID": "56744722958ef13879b9505b"
    },
    {
        "name": "debug",
        "slug": "debug",
        "objectID": "56744721958ef13879b94922"
    },
    {
        "name": "freelancer",
        "slug": "freelancer",
        "objectID": "56744723958ef13879b9550a"
    },
    {
        "name": "Cosmic JS",
        "slug": "cosmic-js",
        "objectID": "590743c50e14932382c2ad5a"
    },
    {
        "name": "WhoIsHiring",
        "slug": "whoishiring",
        "objectID": "5d946e4ec510092a323bc34a"
    },
    {
        "name": "ide",
        "slug": "ide",
        "objectID": "56744721958ef13879b94879"
    },
    {
        "name": "pair programming",
        "slug": "pair-programming",
        "objectID": "56744722958ef13879b95071"
    },
    {
        "slug": "health-cjaeh844x02vvo3wtj5r2s75q",
        "objectID": "5a189c9fee67ea9312f02c18"
    },
    {
        "name": "code smell",
        "slug": "code-smell",
        "objectID": "57361d1cffaaff8febd12cee"
    },
    {
        "name": "V8",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1450536374/hnlihf5tv3veoxx1igpa.jpg",
        "slug": "v8",
        "objectID": "56744723958ef13879b954f0"
    },
    {
        "name": "Erlang",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1475321105/tp4co0lnolmi4x7ln7f6.jpg",
        "slug": "erlang",
        "objectID": "56744722958ef13879b94e60"
    },
    {
        "name": "Clojure",
        "slug": "clojure",
        "objectID": "56b01bce0a7ca0c6f70c1ef8"
    },
    {
        "name": "rabbitmq",
        "slug": "rabbitmq",
        "objectID": "56a4fc8ec84f2c6913b8e9f9"
    },
    {
        "name": "Sketch",
        "slug": "sketch",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1522266937699/ByGS7dtcG.jpeg",
        "objectID": "56744722958ef13879b94e7d"
    },
    {
        "name": "backend as a service",
        "slug": "backend-as-a-service",
        "objectID": "577f08da16a33191db042f9e"
    },
    {
        "name": "mocha",
        "slug": "mocha",
        "objectID": "56744721958ef13879b94a3a"
    },
    {
        "name": "stream",
        "slug": "stream",
        "objectID": "56744723958ef13879b95580"
    },
    {
        "name": "container",
        "slug": "container",
        "objectID": "56744721958ef13879b94ad6"
    },
    {
        "name": "woocommerce",
        "slug": "woocommerce",
        "objectID": "56744720958ef13879b94808"
    },
    {
        "name": "webperf",
        "slug": "webperf-ciur6tor503mfpx53ic2rvrs2",
        "objectID": "5810e609a901f605c438b691"
    },
    {
        "name": "form",
        "slug": "form",
        "objectID": "56744722958ef13879b95138"
    },
    {
        "name": "#⛺the-technical-writing-bootcamp",
        "slug": "the-technical-writing-bootcamp",
        "objectID": "5f6d12a1005ded5336f6f534"
    },
    {
        "name": "HTML Emails",
        "slug": "html-emails",
        "objectID": "56a1b72a72ca04ea5d7a003b"
    },
    {
        "name": "PHPUnit",
        "slug": "phpunit",
        "objectID": "57ea3f2397eba84632db561a"
    },
    {
        "name": "http2",
        "slug": "http2",
        "objectID": "56744721958ef13879b94a76"
    },
    {
        "name": "kibana",
        "slug": "kibana",
        "objectID": "56744721958ef13879b9486d"
    },
    {
        "name": "osx",
        "slug": "osx",
        "objectID": "56744723958ef13879b9523e"
    },
    {
        "name": "ghost",
        "slug": "ghost",
        "objectID": "56744722958ef13879b951c6"
    },
    {
        "name": "hybrid apps",
        "slug": "hybrid-apps",
        "objectID": "56744721958ef13879b94e08"
    },
    {
        "name": "virtual dom",
        "slug": "virtual-dom",
        "objectID": "56744720958ef13879b947fc"
    },
    {
        "name": "editor",
        "slug": "editor",
        "objectID": "5674471d958ef13879b94781"
    },
    {
        "name": "Session",
        "slug": "session",
        "objectID": "57c8241860189c8953a67f81"
    },
    {
        "name": "parse server",
        "slug": "parse-server",
        "objectID": "578ae4e4b1a4a0d81ffbb1bb"
    },
    {
        "slug": "tailwind",
        "objectID": "5ddd484e94c050e177a6aa7e"
    },
    {
        "name": "mongo",
        "slug": "mongo",
        "objectID": "56744721958ef13879b94a93"
    },
    {
        "name": "what successful blogging means to me",
        "slug": "what-successful-blogging-means-to-me",
        "objectID": "5faff31939a1f54636490632"
    },
    {
        "name": "windows server",
        "slug": "windows-server",
        "objectID": "5f1dd296f4016901885ccbf8"
    },
    {
        "name": "Objective C",
        "slug": "objective-c",
        "objectID": "56744721958ef13879b94bfe"
    },
    {
        "name": "vr",
        "slug": "vr",
        "objectID": "5674d5807446b75bb60141f8"
    },
    {
        "name": "microsoft edge",
        "slug": "microsoft-edge",
        "objectID": "56744720958ef13879b9480c"
    },
    {
        "name": "zurb",
        "slug": "zurb",
        "objectID": "56744721958ef13879b94a36"
    },
    {
        "name": "promise",
        "slug": "promise",
        "objectID": "56744721958ef13879b9488b"
    },
    {
        "slug": "growth",
        "objectID": "5a64fbe6e30c5b6655a6a4df"
    },
    {
        "name": "Meetup",
        "slug": "meetup",
        "objectID": "56d9b1b0e853431899d036ce"
    },
    {
        "name": "modal",
        "slug": "modal",
        "objectID": "56ace1e6cc975f0cc6878bc0"
    },
    {
        "name": "Benchmark",
        "slug": "benchmark",
        "objectID": "5680fde5aeae5c9e229cf8e1"
    },
    {
        "name": "Lua",
        "slug": "lua",
        "objectID": "5726e4fac1f71f91e880ad2b"
    },
    {
        "name": "perl",
        "slug": "perl",
        "objectID": "56744722958ef13879b9512e"
    },
    {
        "name": "postgres",
        "slug": "postgres",
        "objectID": "56744722958ef13879b94f0b"
    },
    {
        "name": "Element Queries",
        "slug": "element-queries",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1498763362/lvxxrbdpyjwm1c8pxjck.png",
        "objectID": "581a55d4c055bbfb46d880da"
    },
    {
        "name": "logstash",
        "slug": "logstash",
        "objectID": "56744723958ef13879b953c3"
    },
    {
        "name": "FaaS",
        "slug": "faas",
        "objectID": "58cbe70848830eae2c11fdf4"
    },
    {
        "name": "laravel ",
        "slug": "laravel-cikr40o0m01r27453d8eux03p",
        "objectID": "56c4ad109c7666b0da73f29d"
    },
    {
        "name": "immutable",
        "slug": "immutable",
        "objectID": "56744722958ef13879b9514a"
    },
    {
        "slug": "pmlcourse",
        "objectID": "5e4a6b728c89a92316cd4a33"
    },
    {
        "name": "alternative",
        "slug": "alternative",
        "objectID": "58085c202a45c6fdcb43f3c3"
    },
    {
        "name": "Smalltalk",
        "slug": "smalltalk",
        "objectID": "57da642fd17cab545caba0d3"
    },
    {
        "name": "cpu",
        "slug": "cpu",
        "objectID": "57ae11c08dae0c2f1d4420cb"
    },
    {
        "name": "survey",
        "slug": "survey",
        "objectID": "56744721958ef13879b949c2"
    },
    {
        "name": "Cassandra",
        "slug": "cassandra",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1516175375653/BJdMlF34z.jpeg",
        "objectID": "56744721958ef13879b9490e"
    },
    {
        "name": "css3 animation",
        "slug": "css3-animation",
        "objectID": "56744722958ef13879b94ef0"
    },
    {
        "name": "Semantic UI",
        "slug": "semantic-ui",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1496405644/rsuq8bqv2aoqqnq8ckzw.png",
        "objectID": "56744723958ef13879b95206"
    },
    {
        "name": "restful",
        "slug": "restful",
        "objectID": "56744723958ef13879b952c6"
    },
    {
        "name": "Deploy ",
        "slug": "deploy",
        "objectID": "57578b6282cbbab8dcd47842"
    },
    {
        "name": "solid",
        "slug": "solid",
        "objectID": "56e6d5598c0bb8288a559c97"
    },
    {
        "name": "font awesome",
        "slug": "font-awesome",
        "objectID": "56744721958ef13879b9492f"
    },
    {
        "slug": "flutter-cjxern4nz000zx6s1d95hxw7x",
        "objectID": "5d14d342867d9aba094fd8f5"
    },
    {
        "slug": "nestjs",
        "objectID": "59e46480ebcd60373ac04db3"
    },
    {
        "name": "junit",
        "slug": "junit",
        "objectID": "57935f8804cd973c9154652c"
    },
    {
        "name": "TLS",
        "slug": "tls",
        "objectID": "56a6742dc84f2c6913b8eac2"
    },
    {
        "name": "NetworkAutomation",
        "slug": "networkautomation",
        "objectID": "5f9da80a701b426a980950db"
    },
    {
        "name": "Less",
        "slug": "less",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1509610482/o0vybjlg9bncpy4tq0x0.png",
        "objectID": "56744721958ef13879b949ef"
    },
    {
        "name": "bdd",
        "slug": "bdd",
        "objectID": "56744721958ef13879b94aa0"
    },
    {
        "name": "baas",
        "slug": "baas",
        "objectID": "56744723958ef13879b953ad"
    },
    {
        "name": "MVVM",
        "slug": "mvvm",
        "objectID": "56a0ee5172ca04ea5d79ff9d"
    },
    {
        "name": "responsive",
        "slug": "responsive",
        "objectID": "56744723958ef13879b95520"
    },
    {
        "name": "Error Tracking",
        "slug": "error-tracking",
        "objectID": "58d2b7fa440c92dcfd4c5801"
    },
    {
        "name": "media queries",
        "slug": "media-queries",
        "objectID": "56744721958ef13879b949f2"
    },
    {
        "slug": "2articles1week-1",
        "objectID": "5f0b171bf80d68509e50d2c1"
    },
    {
        "name": "RethinkDB",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1455115223/oluebzm7a23ayicyyr93.png",
        "slug": "rethinkdb",
        "objectID": "5674471d958ef13879b94774"
    },
    {
        "name": ".NET",
        "slug": "net-cikag7ck9004u4153550rzs6c",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1515074840143/Bkl7B3sXz.jpeg",
        "objectID": "56b54dae8dabdc6142c1ac87"
    },
    {
        "name": "codeigniter",
        "slug": "codeigniter",
        "objectID": "577d5a59f5d62870bc1e3436"
    },
    {
        "name": "web dev",
        "slug": "web-dev",
        "objectID": "56744722958ef13879b951f5"
    },
    {
        "name": "Question",
        "slug": "question",
        "objectID": "56b4ee44ed97cf2d3faa9e85"
    },
    {
        "name": "passport",
        "slug": "passport",
        "objectID": "56744723958ef13879b955b5"
    },
    {
        "slug": "strapi",
        "objectID": "5a60b356acaaf63131a26558"
    },
    {
        "name": "ECS",
        "slug": "ecs",
        "objectID": "58456f2afc2da7579e5f3ece"
    },
    {
        "name": "Motivation ",
        "slug": "motivation-1",
        "objectID": "5f95c76540346172a86c28c1"
    },
    {
        "name": "KoaJS",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1472485426/mypuzb6iv30nivcnj67f.jpg",
        "slug": "koa",
        "objectID": "56744720958ef13879b947fb"
    },
    {
        "name": "HapiJS",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1472485161/dtjd0iyqgwiqqksg3see.png",
        "slug": "hapijs",
        "objectID": "56744721958ef13879b94dd2"
    },
    {
        "name": "Java Framework",
        "slug": "java-framework",
        "objectID": "5674471d958ef13879b9476f"
    },
    {
        "name": "NativeScript",
        "slug": "nativescript",
        "objectID": "578f329a5460288cdeb6f281"
    },
    {
        "name": "realtime apps",
        "slug": "realtime-apps",
        "objectID": "56744721958ef13879b94a1e"
    },
    {
        "name": "DevRant",
        "slug": "devrant",
        "objectID": "5d946e601971c92f3298b281"
    },
    {
        "name": "amp",
        "slug": "amp",
        "objectID": "56744723958ef13879b9556c"
    },
    {
        "name": "grunt",
        "slug": "grunt",
        "objectID": "56744723958ef13879b9547f"
    },
    {
        "name": "es5",
        "slug": "es5",
        "objectID": "56744722958ef13879b94e5a"
    },
    {
        "name": "servers",
        "slug": "servers",
        "objectID": "56744722958ef13879b94e49"
    },
    {
        "name": "rss",
        "slug": "rss",
        "objectID": "56744721958ef13879b949e6"
    },
    {
        "slug": "flask-cje4g3tgk00wdm0wtaepqxd29",
        "objectID": "5a94378b2e2d22686d3319ec"
    },
    {
        "slug": "vpn",
        "objectID": "5a66e6714c88fdb11626d866"
    },
    {
        "name": "writing ",
        "slug": "writing-1",
        "objectID": "5f541f8fd34e0b0a2135b7ac"
    },
    {
        "name": "CouchDB",
        "slug": "couchdb",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1516182897537/HJ9_TqnNG.jpeg",
        "objectID": "56744722958ef13879b94e52"
    },
    {
        "name": "responsive design",
        "slug": "responsive-design",
        "objectID": "568104b15d0b198322f23be3"
    },
    {
        "name": "functional",
        "slug": "functional",
        "objectID": "56744723958ef13879b9541e"
    },
    {
        "name": "es7",
        "slug": "es7",
        "objectID": "56744722958ef13879b9516e"
    },
    {
        "name": "flowtype",
        "slug": "flowtype",
        "objectID": "57a07b7703626115baea275d"
    },
    {
        "name": "airbnb",
        "slug": "airbnb",
        "objectID": "56744721958ef13879b9495f"
    },
    {
        "slug": "swiftui",
        "objectID": "5d117acd15a6b27b36bb063b"
    },
    {
        "name": "offline",
        "slug": "offline",
        "objectID": "57ff8bed7a5d253b23bc40dd"
    },
    {
        "name": "css preprocessors",
        "slug": "css-preprocessors",
        "objectID": "56744723958ef13879b95314"
    },
    {
        "name": "web app",
        "slug": "web-app",
        "objectID": "56744722958ef13879b950de"
    },
    {
        "name": "beta",
        "slug": "beta",
        "objectID": "56c6bd7d46a50cb768ba7d04"
    },
    {
        "name": "webdriver",
        "slug": "webdriver",
        "objectID": "56a1bb2a92921b8f79d3620e"
    },
    {
        "name": "Algolia",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1454497142/tmtr6swfz0tqfeiphd0q.png",
        "slug": "algolia",
        "objectID": "56744723958ef13879b95404"
    },
    {
        "name": "tech stacks",
        "slug": "tech-stacks",
        "objectID": "56744721958ef13879b94aea"
    },
    {
        "name": "relay",
        "slug": "relay",
        "objectID": "56744720958ef13879b947a8"
    },
    {
        "name": "Sequelize",
        "slug": "sequelize",
        "objectID": "56bf8908f7a8a564cd3cf417"
    },
    {
        "name": "CoffeeScript",
        "slug": "coffeescript",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1524116531939/ry2EnsS2M.jpeg",
        "objectID": "56744722958ef13879b9519f"
    },
    {
        "name": "browserify",
        "slug": "browserify",
        "objectID": "56744721958ef13879b94c51"
    },
    {
        "slug": "rtos",
        "objectID": "5e94317328f1a84f59c49fb9"
    },
    {
        "slug": "spanish",
        "objectID": "5d24dd07963b3099469e31b1"
    },
    {
        "name": "universal",
        "slug": "universal",
        "objectID": "5691098591906f99ef523690"
    },
    {
        "name": "software design",
        "slug": "software-design",
        "objectID": "56744721958ef13879b94acd"
    },
    {
        "name": "CSS Modules",
        "slug": "css-modules",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1502977775/w0xxhrabmj1zhddsdiu1.png",
        "objectID": "56bf8908f7a8a564cd3cf415"
    },
    {
        "name": "PhpStorm",
        "slug": "phpstorm",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1497046152/nmpeb8i0lo2zofxg7xo5.png",
        "objectID": "56eae87928492b76a9948344"
    },
    {
        "name": "scaling",
        "slug": "scaling",
        "objectID": "56744721958ef13879b94aa9"
    },
    {
        "name": "tool",
        "slug": "tool",
        "objectID": "568bb9dbe99c5444f3233892"
    },
    {
        "name": "charting library",
        "slug": "charting-library",
        "objectID": "56744721958ef13879b94e41"
    },
    {
        "slug": "devblog",
        "objectID": "5cdbcce2d7898f811504a6c9"
    },
    {
        "name": "IWD2021",
        "slug": "iwd2021",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1614605663765/dl9O9JyP9.png",
        "objectID": "603cecbcc8eb04017922ce83"
    },
    {
        "slug": "cpp-ck4ra5k7300nlv2s1jbkdp2qh",
        "objectID": "5e08e075bcc8c0ce78e93263"
    },
    {
        "name": "smtp",
        "slug": "smtp",
        "objectID": "56744723958ef13879b953c9"
    },
    {
        "name": "plugin",
        "slug": "plugin",
        "objectID": "56744722958ef13879b94ff8"
    },
    {
        "name": "cto",
        "slug": "cto",
        "objectID": "56744720958ef13879b9480f"
    },
    {
        "name": "100DaysOfCloud",
        "slug": "100daysofcloud",
        "objectID": "5f216568938147308462a35b"
    },
    {
        "name": "PhoneGap",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1475235526/igis5i1twypixaebdkun.jpg",
        "slug": "phonegap",
        "objectID": "56744720958ef13879b947fa"
    },
    {
        "name": "SailsJS",
        "logo": "https://res.cloudinary.com/hashnode/image/upload/v1472484652/puabwwilk0dvwv9gsepb.png",
        "slug": "sailsjs",
        "objectID": "56744723958ef13879b9527a"
    },
    {
        "name": "socket",
        "slug": "socket",
        "objectID": "576bd575956de5c931689074"
    },
    {
        "name": "wasm",
        "slug": "wasm",
        "objectID": "57612cfa7e4505f8314fb29a"
    },
    {
        "name": "rxjava",
        "slug": "rxjava",
        "objectID": "56d93d14696d94e491c06f47"
    },
    {
        "name": "Testing Library",
        "slug": "testing-library",
        "logo": "https://cdn.hashnode.com/res/hashnode/image/upload/v1618896704282/9Z3cbqhmn.png",
        "objectID": "607e6751eb2bd30d2d22a556"
    },
    {
        "name": "c#",
        "slug": "c-cikbdqjwh0042l553122kmxlz",
        "objectID": "56b629b2e6740d0959b6f3d9"
    },
    {
        "name": "Alexa",
        "slug": "alexa",
        "objectID": "57bb2f081351c2290bba1d24"
    },
    {
        "name": "mern-stack",
        "slug": "mern-stack",
        "objectID": "56c752ab34d45a99221aa34f"
    },
    {
        "name": "microservice",
        "slug": "microservice",
        "objectID": "56744723958ef13879b95421"
    },
    {
        "name": "lodash",
        "slug": "lodash",
        "objectID": "56744722958ef13879b95162"
    },
    {
        "name": "code splitting",
        "slug": "code-splitting",
        "objectID": "56e17a0f5d4f204da59e0058"
    },
    {
        "name": "GraphQL ",
        "slug": "graphql-cintl8ori01p0y353nth5857g",
        "objectID": "572a9b9f109fb69b463406e9"
    },
    {
        "name": "isomorphic apps",
        "slug": "isomorphic-apps",
        "objectID": "56744723958ef13879b95505"
    },
    {
        "name": "internet explorer",
        "slug": "internet-explorer",
        "objectID": "56744721958ef13879b94c7b"
    },
    {
        "name": "mobile app",
        "slug": "mobile-app",
        "objectID": "576934c7a841f03b9338c6b3"
    }
];


/***/ }),
/* 74 */
/***/ ((module) => {

module.exports = require("json-to-graphql-query");

/***/ }),
/* 75 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MediumProvider = void 0;
class MediumProvider {
    constructor() {
        this.identifier = 'medium';
        this.name = 'Medium';
    }
    async authenticate(token) {
        const { data: { name, id, imageUrl, username }, } = await (await fetch('https://api.medium.com/v1/me', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })).json();
        return {
            id,
            name,
            token,
            picture: imageUrl,
            username,
        };
    }
    async publications(token) {
        const { id } = await this.authenticate(token);
        const { data } = await (await fetch(`https://api.medium.com/v1/users/${id}/publications`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })).json();
        return data;
    }
    async post(token, content, settings) {
        const { id } = await this.authenticate(token);
        const { data } = await (await fetch(settings?.publication
            ? `https://api.medium.com/v1/publications/${settings?.publication}/posts`
            : `https://api.medium.com/v1/users/${id}/posts`, {
            method: 'POST',
            body: JSON.stringify({
                title: settings.title,
                contentFormat: 'markdown',
                content,
                ...(settings.canonical ? { canonicalUrl: settings.canonical } : {}),
                ...(settings?.tags?.length
                    ? { tags: settings?.tags?.map((p) => p.value) }
                    : {}),
                publishStatus: settings?.publication ? 'draft' : 'public',
            }),
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        })).json();
        return {
            postId: data.id,
            releaseURL: data.url,
        };
    }
}
exports.MediumProvider = MediumProvider;


/***/ }),
/* 76 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FacebookProvider = void 0;
const tslib_1 = __webpack_require__(3);
const make_is_1 = __webpack_require__(27);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
const social_abstract_1 = __webpack_require__(65);
class FacebookProvider extends social_abstract_1.SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'facebook';
        this.name = 'Facebook Page';
        this.isBetweenSteps = true;
        this.scopes = [
            'pages_show_list',
            'business_management',
            'pages_manage_posts',
            'pages_manage_engagement',
            'pages_read_engagement',
            'read_insights',
        ];
        this.config = {
            FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID || '',
            FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET || '',
        };
    }
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    getConfig() {
        return this.config;
    }
    async refreshToken(refresh_token) {
        return {
            refreshToken: '',
            expiresIn: 0,
            accessToken: '',
            id: '',
            name: '',
            picture: '',
            username: '',
        };
    }
    async generateAuthUrl(clientInformation, customerId) {
        // const state = makeId(6);
        // Generate a unique state value that includes the customerId
        const state = `customerId:${customerId},uniqueState:${(0, make_is_1.makeId)(6)}`;
        return {
            url: 'https://www.facebook.com/v20.0/dialog/oauth' +
                `?client_id=${this.config.FACEBOOK_APP_ID}` +
                `&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/facebook`)}` +
                `&state=${encodeURIComponent(state)}` +
                `&scope=${this.scopes.join(',')}`,
            codeVerifier: (0, make_is_1.makeId)(10),
            state,
        };
    }
    async reConnect(id, requiredId, accessToken) {
        const information = await this.fetchPageInformation(accessToken, requiredId);
        return {
            id: information.id,
            name: information.name,
            accessToken: information.access_token,
            refreshToken: information.access_token,
            expiresIn: (0, dayjs_1.default)().add(59, 'days').unix() - (0, dayjs_1.default)().unix(),
            picture: information.picture,
            username: information.username,
        };
    }
    async authenticate(params) {
        try {
            const getAccessToken = await (await this.fetch('https://graph.facebook.com/v20.0/oauth/access_token' +
                `?client_id=${this.config.FACEBOOK_APP_ID}` +
                `&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/facebook${params.refresh ? `?refresh=${params.refresh}` : ''}`)}` +
                `&client_secret=${this.config.FACEBOOK_APP_SECRET}` +
                `&code=${params.code}`)).json();
            const { access_token } = await (await this.fetch('https://graph.facebook.com/v20.0/oauth/access_token' +
                '?grant_type=fb_exchange_token' +
                `&client_id=${this.config.FACEBOOK_APP_ID}` +
                `&client_secret=${this.config.FACEBOOK_APP_SECRET}` +
                `&fb_exchange_token=${getAccessToken.access_token}&fields=access_token,expires_in`)).json();
            const { data } = await (await this.fetch(`https://graph.facebook.com/v20.0/me/permissions?access_token=${access_token}`)).json();
            const permissions = data
                .filter((d) => d.status === 'granted')
                .map((p) => p.permission);
            this.checkScopes(this.scopes, permissions);
            const { id, name, picture: { data: { url }, }, } = await (await this.fetch(`https://graph.facebook.com/v20.0/me?fields=id,name,picture&access_token=${access_token}`)).json();
            return {
                id,
                name,
                accessToken: access_token,
                refreshToken: access_token,
                expiresIn: (0, dayjs_1.default)().add(59, 'days').unix() - (0, dayjs_1.default)().unix(),
                picture: url,
                username: '',
            };
        }
        catch (error) {
            return 'Authentication failed';
        }
    }
    async pages(accessToken) {
        const { data } = await (await this.fetch(`https://graph.facebook.com/v20.0/me/accounts?fields=id,username,name,picture.type(large)&access_token=${accessToken}`)).json();
        return data;
    }
    async fetchPageInformation(accessToken, pageId) {
        const { id, name, access_token, username, picture: { data: { url }, }, } = await (await this.fetch(`https://graph.facebook.com/v20.0/${pageId}?fields=username,access_token,name,picture.type(large)&access_token=${accessToken}`)).json();
        return {
            id,
            name,
            access_token,
            picture: url,
            username,
        };
    }
    async post(id, accessToken, postDetails) {
        const [firstPost, ...comments] = postDetails;
        let finalId = '';
        let finalUrl = '';
        if ((firstPost?.media?.[0]?.url?.indexOf('mp4') || -2) > -1) {
            const { id: videoId, permalink_url, ...all } = await (await this.fetch(`https://graph.facebook.com/v20.0/${id}/videos?access_token=${accessToken}&fields=id,permalink_url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    file_url: firstPost?.media?.[0]?.url,
                    description: firstPost.message,
                    published: true,
                }),
            }, 'upload mp4')).json();
            finalUrl = 'https://www.facebook.com/reel/' + videoId;
            finalId = videoId;
        }
        else {
            const uploadPhotos = !firstPost?.media?.length
                ? []
                : await Promise.all(firstPost.media.map(async (media) => {
                    const { id: photoId } = await (await this.fetch(`https://graph.facebook.com/v20.0/${id}/photos?access_token=${accessToken}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            url: media.url,
                            published: false,
                        }),
                    }, 'upload images slides')).json();
                    return { media_fbid: photoId };
                }));
            const { id: postId, permalink_url, ...all } = await (await this.fetch(`https://graph.facebook.com/v20.0/${id}/feed?access_token=${accessToken}&fields=id,permalink_url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...(uploadPhotos?.length ? { attached_media: uploadPhotos } : {}),
                    message: firstPost.message,
                    published: true,
                }),
            }, 'finalize upload')).json();
            finalUrl = permalink_url;
            finalId = postId;
        }
        const postsArray = [];
        for (const comment of comments) {
            const data = await (await this.fetch(`https://graph.facebook.com/v20.0/${finalId}/comments?access_token=${accessToken}&fields=id,permalink_url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...(comment.media?.length
                        ? { attachment_url: comment.media[0].url }
                        : {}),
                    message: comment.message,
                }),
            }, 'add comment')).json();
            postsArray.push({
                id: comment.id,
                postId: data.id,
                releaseURL: data.permalink_url,
                status: 'success',
            });
        }
        return [
            {
                id: firstPost.id,
                postId: finalId,
                releaseURL: finalUrl,
                status: 'success',
            },
            ...postsArray,
        ];
    }
    async analytics(id, accessToken, date) {
        const until = (0, dayjs_1.default)().endOf('day').unix();
        const since = (0, dayjs_1.default)().subtract(date, 'day').unix();
        const { data } = await (await this.fetch(`https://graph.facebook.com/v20.0/${id}/insights?metric=page_impressions_unique,page_posts_impressions_unique,page_post_engagements,page_daily_follows,page_video_views&access_token=${accessToken}&period=day&since=${since}&until=${until}`)).json();
        return (data?.map((d) => ({
            label: d.name === 'page_impressions_unique'
                ? 'Page Impressions'
                : d.name === 'page_post_engagements'
                    ? 'Posts Engagement'
                    : d.name === 'page_daily_follows'
                        ? 'Page followers'
                        : d.name === 'page_video_views'
                            ? 'Videos views'
                            : 'Posts Impressions',
            percentageChange: 5,
            data: d?.values?.map((v) => ({
                total: v.value,
                date: (0, dayjs_1.default)(v.end_time).format('YYYY-MM-DD'),
            })),
        })) || []);
    }
}
exports.FacebookProvider = FacebookProvider;


/***/ }),
/* 77 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.InstagramProvider = void 0;
const tslib_1 = __webpack_require__(3);
const make_is_1 = __webpack_require__(27);
const timer_1 = __webpack_require__(66);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
const social_abstract_1 = __webpack_require__(65);
class InstagramProvider extends social_abstract_1.SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'instagram';
        this.name = 'Instagram\n(Facebook Business)';
        this.isBetweenSteps = true;
        this.toolTip = 'Instagram must be business and connected to a Facebook page';
        this.scopes = [
            'instagram_basic',
            'pages_show_list',
            'pages_read_engagement',
            'business_management',
            'instagram_content_publish',
            'instagram_manage_comments',
            'instagram_manage_insights',
        ];
        this.config = {
            FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID || '',
            FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET || '',
        };
    }
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    getConfig() {
        return this.config;
    }
    async refreshToken(refresh_token) {
        return {
            refreshToken: '',
            expiresIn: 0,
            accessToken: '',
            id: '',
            name: '',
            picture: '',
            username: '',
        };
    }
    async reConnect(id, requiredId, accessToken) {
        const findPage = (await this.pages(accessToken)).find((p) => p.id === requiredId);
        const information = await this.fetchPageInformation(accessToken, {
            id: requiredId,
            pageId: findPage?.pageId,
        });
        return {
            id: information.id,
            name: information.name,
            accessToken: information.access_token,
            refreshToken: information.access_token,
            expiresIn: (0, dayjs_1.default)().add(59, 'days').unix() - (0, dayjs_1.default)().unix(),
            picture: information.picture,
            username: information.username,
        };
    }
    async generateAuthUrl(clientInformation, customerId) {
        // const state = makeId(6);
        const state = `customerId:${customerId},uniqueState:${(0, make_is_1.makeId)(6)}`;
        return {
            url: 'https://www.facebook.com/v20.0/dialog/oauth' +
                `?client_id=${this.config.FACEBOOK_APP_ID}` +
                `&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/instagram`)}` +
                // `&state=${state}` +
                `&state=${encodeURIComponent(state)}` +
                `&scope=${encodeURIComponent(this.scopes.join(','))}`,
            codeVerifier: (0, make_is_1.makeId)(10),
            state,
        };
    }
    async authenticate(params) {
        const getAccessToken = await (await this.fetch('https://graph.facebook.com/v20.0/oauth/access_token' +
            `?client_id=${this.config.FACEBOOK_APP_ID}` +
            `&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/instagram${params.refresh ? `?refresh=${params.refresh}` : ''}`)}` +
            `&client_secret=${this.config.FACEBOOK_APP_SECRET}` +
            `&code=${params.code}`)).json();
        const { access_token, expires_in, ...all } = await (await this.fetch('https://graph.facebook.com/v20.0/oauth/access_token' +
            '?grant_type=fb_exchange_token' +
            `&client_id=${this.config.FACEBOOK_APP_ID}` +
            `&client_secret=${this.config.FACEBOOK_APP_SECRET}` +
            `&fb_exchange_token=${getAccessToken.access_token}`)).json();
        const { data } = await (await this.fetch(`https://graph.facebook.com/v20.0/me/permissions?access_token=${access_token}`)).json();
        const permissions = data
            .filter((d) => d.status === 'granted')
            .map((p) => p.permission);
        this.checkScopes(this.scopes, permissions);
        const { id, name, picture: { data: { url }, }, } = await (await this.fetch(`https://graph.facebook.com/v20.0/me?fields=id,name,picture&access_token=${access_token}`)).json();
        return {
            id,
            name,
            accessToken: access_token,
            refreshToken: access_token,
            expiresIn: (0, dayjs_1.default)().add(59, 'days').unix() - (0, dayjs_1.default)().unix(),
            picture: url,
            username: '',
        };
    }
    async pages(accessToken) {
        const { data } = await (await this.fetch(`https://graph.facebook.com/v20.0/me/accounts?fields=id,instagram_business_account,username,name,picture.type(large)&access_token=${accessToken}&limit=500`)).json();
        const onlyConnectedAccounts = await Promise.all(data
            .filter((f) => f.instagram_business_account)
            .map(async (p) => {
            return {
                pageId: p.id,
                ...(await (await this.fetch(`https://graph.facebook.com/v20.0/${p.instagram_business_account.id}?fields=name,profile_picture_url&access_token=${accessToken}&limit=500`)).json()),
                id: p.instagram_business_account.id,
            };
        }));
        return onlyConnectedAccounts.map((p) => ({
            pageId: p.pageId,
            id: p.id,
            name: p.name,
            picture: { data: { url: p.profile_picture_url } },
        }));
    }
    async fetchPageInformation(accessToken, data) {
        const { access_token, ...all } = await (await this.fetch(`https://graph.facebook.com/v20.0/${data.pageId}?fields=access_token,name,picture.type(large)&access_token=${accessToken}`)).json();
        const { id, name, profile_picture_url, username } = await (await this.fetch(`https://graph.facebook.com/v20.0/${data.id}?fields=username,name,profile_picture_url&access_token=${accessToken}`)).json();
        console.log(id, name, profile_picture_url, username);
        return {
            id,
            name,
            picture: profile_picture_url,
            access_token,
            username,
        };
    }
    async post(id, accessToken, postDetails, integration, type = 'graph.facebook.com') {
        const [firstPost, ...theRest] = postDetails;
        console.log('in progress');
        const isStory = firstPost.settings.post_type === 'story';
        const medias = await Promise.all(firstPost?.media?.map(async (m) => {
            const caption = firstPost.media?.length === 1
                ? `&caption=${encodeURIComponent(firstPost.message)}`
                : ``;
            const isCarousel = (firstPost?.media?.length || 0) > 1 ? `&is_carousel_item=true` : ``;
            const mediaType = m.url.indexOf('.mp4') > -1
                ? firstPost?.media?.length === 1
                    ? isStory
                        ? `video_url=${m.url}&media_type=STORIES`
                        : `video_url=${m.url}&media_type=REELS`
                    : isStory
                        ? `video_url=${m.url}&media_type=STORIES`
                        : `video_url=${m.url}&media_type=VIDEO`
                : isStory
                    ? `image_url=${m.url}&media_type=STORIES`
                    : `image_url=${m.url}`;
            console.log('in progress1');
            const collaborators = firstPost?.settings?.collaborators?.length && !isStory
                ? `&collaborators=${JSON.stringify(firstPost?.settings?.collaborators.map((p) => p.label))}`
                : ``;
            console.log(collaborators);
            const { id: photoId } = await (await this.fetch(`https://${type}/v20.0/${id}/media?${mediaType}${isCarousel}${collaborators}&access_token=${accessToken}${caption}`, {
                method: 'POST',
            })).json();
            console.log('in progress2');
            let status = 'IN_PROGRESS';
            while (status === 'IN_PROGRESS') {
                const { status_code } = await (await this.fetch(`https://${type}/v20.0/${photoId}?access_token=${accessToken}&fields=status_code`)).json();
                await (0, timer_1.timer)(3000);
                status = status_code;
            }
            console.log('in progress3');
            return photoId;
        }) || []);
        const arr = [];
        let containerIdGlobal = '';
        let linkGlobal = '';
        if (medias.length === 1) {
            const { id: mediaId } = await (await this.fetch(`https://${type}/v20.0/${id}/media_publish?creation_id=${medias[0]}&access_token=${accessToken}&field=id`, {
                method: 'POST',
            })).json();
            containerIdGlobal = mediaId;
            const { permalink } = await (await this.fetch(`https://${type}/v20.0/${mediaId}?fields=permalink&access_token=${accessToken}`)).json();
            arr.push({
                id: firstPost.id,
                postId: mediaId,
                releaseURL: permalink,
                status: 'success',
            });
            linkGlobal = permalink;
        }
        else {
            const { id: containerId, ...all3 } = await (await this.fetch(`https://${type}/v20.0/${id}/media?caption=${encodeURIComponent(firstPost?.message)}&media_type=CAROUSEL&children=${encodeURIComponent(medias.join(','))}&access_token=${accessToken}`, {
                method: 'POST',
            })).json();
            let status = 'IN_PROGRESS';
            while (status === 'IN_PROGRESS') {
                const { status_code } = await (await this.fetch(`https://${type}/v20.0/${containerId}?fields=status_code&access_token=${accessToken}`)).json();
                await (0, timer_1.timer)(3000);
                status = status_code;
            }
            const { id: mediaId, ...all4 } = await (await this.fetch(`https://${type}/v20.0/${id}/media_publish?creation_id=${containerId}&access_token=${accessToken}&field=id`, {
                method: 'POST',
            })).json();
            containerIdGlobal = mediaId;
            const { permalink } = await (await this.fetch(`https://${type}/v20.0/${mediaId}?fields=permalink&access_token=${accessToken}`)).json();
            arr.push({
                id: firstPost.id,
                postId: mediaId,
                releaseURL: permalink,
                status: 'success',
            });
            linkGlobal = permalink;
        }
        for (const post of theRest) {
            const { id: commentId } = await (await this.fetch(`https://${type}/v20.0/${containerIdGlobal}/comments?message=${encodeURIComponent(post.message)}&access_token=${accessToken}`, {
                method: 'POST',
            })).json();
            arr.push({
                id: firstPost.id,
                postId: commentId,
                releaseURL: linkGlobal,
                status: 'success',
            });
        }
        return arr;
    }
    async analytics(id, accessToken, date) {
        const until = (0, dayjs_1.default)().endOf('day').unix();
        const since = (0, dayjs_1.default)().subtract(date, 'day').unix();
        const { data, ...all } = await (await fetch(`https://graph.facebook.com/v20.0/${id}/insights?metric=follower_count,impressions,reach,profile_views&access_token=${accessToken}&period=day&since=${since}&until=${until}`)).json();
        return (data?.map((d) => ({
            label: d.title,
            percentageChange: 5,
            data: d.values.map((v) => ({
                total: v.value,
                date: (0, dayjs_1.default)(v.end_time).format('YYYY-MM-DD'),
            })),
        })) || []);
    }
    music(accessToken, data) {
        return this.fetch(`https://graph.facebook.com/v20.0/music/search?q=${encodeURIComponent(data.q)}&access_token=${accessToken}`);
    }
}
exports.InstagramProvider = InstagramProvider;


/***/ }),
/* 78 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.YoutubeProvider = void 0;
const tslib_1 = __webpack_require__(3);
const make_is_1 = __webpack_require__(27);
const googleapis_1 = __webpack_require__(79);
const axios_1 = tslib_1.__importDefault(__webpack_require__(53));
const social_abstract_1 = __webpack_require__(65);
const process = tslib_1.__importStar(__webpack_require__(80));
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
const clientAndYoutube = (config) => {
    const client = new googleapis_1.google.auth.OAuth2({
        clientId: config.YOUTUBE_CLIENT_ID,
        clientSecret: config.YOUTUBE_CLIENT_SECRET,
        redirectUri: `${process.env.FRONTEND_URL}/integrations/social/youtube`,
    });
    const youtube = (newClient) => googleapis_1.google.youtube({
        version: 'v3',
        auth: newClient,
    });
    const youtubeAnalytics = (newClient) => googleapis_1.google.youtubeAnalytics({
        version: 'v2',
        auth: newClient,
    });
    const oauth2 = (newClient) => googleapis_1.google.oauth2({
        version: 'v2',
        auth: newClient,
    });
    return { client, youtube, oauth2, youtubeAnalytics };
};
class YoutubeProvider extends social_abstract_1.SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'youtube';
        this.name = 'YouTube';
        this.isBetweenSteps = false;
        this.scopes = [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/youtube',
            'https://www.googleapis.com/auth/youtube.force-ssl',
            'https://www.googleapis.com/auth/youtube.readonly',
            'https://www.googleapis.com/auth/youtube.upload',
            'https://www.googleapis.com/auth/youtubepartner',
            'https://www.googleapis.com/auth/youtubepartner',
            'https://www.googleapis.com/auth/yt-analytics.readonly',
        ];
        this.config = {
            YOUTUBE_CLIENT_ID: process.env.FACEBOOK_APP_ID || '',
            YOUTUBE_CLIENT_SECRET: process.env.FACEBOOK_APP_SECRET || '',
        };
    }
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    getConfig() {
        return this.config;
    }
    async refreshToken(refresh_token) {
        const { client, oauth2 } = clientAndYoutube(this.config);
        client.setCredentials({ refresh_token });
        const { credentials } = await client.refreshAccessToken();
        const user = oauth2(client);
        const expiryDate = new Date(credentials.expiry_date);
        const unixTimestamp = Math.floor(expiryDate.getTime() / 1000) -
            Math.floor(new Date().getTime() / 1000);
        const { data } = await user.userinfo.get();
        return {
            accessToken: credentials.access_token,
            expiresIn: unixTimestamp,
            refreshToken: credentials.refresh_token,
            id: data.id,
            name: data.name,
            picture: data.picture,
            username: '',
        };
    }
    async generateAuthUrl(clientInformation, customerId) {
        // const state = makeId(7);
        const state = `customerId:${customerId},uniqueState:${(0, make_is_1.makeId)(6)}`;
        const { client } = clientAndYoutube(this.config);
        return {
            url: client.generateAuthUrl({
                access_type: 'offline',
                prompt: 'consent',
                state,
                redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/youtube`,
                scope: this.scopes.slice(0),
            }),
            codeVerifier: (0, make_is_1.makeId)(11),
            state,
        };
    }
    async authenticate(params) {
        const { client, oauth2 } = clientAndYoutube(this.config);
        const { tokens } = await client.getToken(params.code);
        client.setCredentials(tokens);
        const { scopes } = await client.getTokenInfo(tokens.access_token);
        this.checkScopes(this.scopes, scopes);
        const user = oauth2(client);
        const { data } = await user.userinfo.get();
        const expiryDate = new Date(tokens.expiry_date);
        const unixTimestamp = Math.floor(expiryDate.getTime() / 1000) -
            Math.floor(new Date().getTime() / 1000);
        return {
            accessToken: tokens.access_token,
            expiresIn: unixTimestamp,
            refreshToken: tokens.refresh_token,
            id: data.id,
            name: data.name,
            picture: data.picture,
            username: '',
        };
    }
    async post(id, accessToken, postDetails) {
        const [firstPost, ...comments] = postDetails;
        const { client, youtube } = clientAndYoutube(this.config);
        client.setCredentials({ access_token: accessToken });
        const youtubeClient = youtube(client);
        const { settings } = firstPost;
        const response = await (0, axios_1.default)({
            url: firstPost?.media?.[0]?.url,
            method: 'GET',
            responseType: 'stream',
        });
        try {
            const all = await youtubeClient.videos.insert({
                part: ['id', 'snippet', 'status'],
                notifySubscribers: true,
                requestBody: {
                    snippet: {
                        title: settings.title,
                        description: firstPost?.message,
                        ...(settings?.tags?.length
                            ? { tags: settings.tags.map((p) => p.label) }
                            : {}),
                        // ...(settings?.thumbnail?.url
                        //   ? {
                        //       thumbnails: {
                        //         default: {
                        //           url: settings?.thumbnail?.url,
                        //         },
                        //       },
                        //     }
                        //   : {}),
                    },
                    status: {
                        privacyStatus: settings.type,
                    },
                },
                media: {
                    body: response.data,
                },
            });
            if (settings?.thumbnail?.path) {
                try {
                    const allb = await youtubeClient.thumbnails.set({
                        videoId: all?.data?.id,
                        media: {
                            body: (await (0, axios_1.default)({
                                url: settings?.thumbnail?.path,
                                method: 'GET',
                                responseType: 'stream',
                            })).data,
                        },
                    });
                }
                catch (err) {
                    if (err.response?.data?.error?.errors?.[0]?.domain ===
                        'youtube.thumbnail') {
                        throw 'Your account is not verified, we have uploaded your video but we could not set the thumbnail. Please verify your account and try again.';
                    }
                }
            }
            return [
                {
                    id: firstPost.id,
                    releaseURL: `https://www.youtube.com/watch?v=${all?.data?.id}`,
                    postId: all?.data?.id,
                    status: 'success',
                },
            ];
        }
        catch (err) {
            if (err.response?.data?.error?.errors?.[0]?.reason === 'failedPrecondition') {
                throw 'We have uploaded your video but we could not set the thumbnail. Thumbnail size is too large';
            }
            if (err.response?.data?.error?.errors?.[0]?.reason === 'uploadLimitExceeded') {
                throw 'You have reached your daily upload limit, please try again tomorrow.';
            }
            if (err.response?.data?.error?.errors?.[0]?.reason ===
                'youtubeSignupRequired') {
                throw 'You have to link your youtube account to your google account first.';
            }
        }
        return [];
    }
    async analytics(id, accessToken, date) {
        try {
            const endDate = (0, dayjs_1.default)().format('YYYY-MM-DD');
            const startDate = (0, dayjs_1.default)().subtract(date, 'day').format('YYYY-MM-DD');
            const { client, youtubeAnalytics } = clientAndYoutube(this.config);
            client.setCredentials({ access_token: accessToken });
            const youtubeClient = youtubeAnalytics(client);
            const { data } = await youtubeClient.reports.query({
                ids: 'channel==MINE',
                startDate,
                endDate,
                metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,likes,subscribersLost',
                dimensions: 'day',
                sort: 'day',
            });
            const columns = data?.columnHeaders?.map((p) => p.name);
            const mappedData = data?.rows?.map((p) => {
                return columns.reduce((acc, curr, index) => {
                    acc[curr] = p[index];
                    return acc;
                }, {});
            });
            const acc = [];
            acc.push({
                label: 'Estimated Minutes Watched',
                data: mappedData?.map((p) => ({
                    total: p.estimatedMinutesWatched,
                    date: p.day,
                })),
            });
            acc.push({
                label: 'Average View Duration',
                average: true,
                data: mappedData?.map((p) => ({
                    total: p.averageViewDuration,
                    date: p.day,
                })),
            });
            acc.push({
                label: 'Average View Percentage',
                average: true,
                data: mappedData?.map((p) => ({
                    total: p.averageViewPercentage,
                    date: p.day,
                })),
            });
            acc.push({
                label: 'Subscribers Gained',
                data: mappedData?.map((p) => ({
                    total: p.subscribersGained,
                    date: p.day,
                })),
            });
            acc.push({
                label: 'Subscribers Lost',
                data: mappedData?.map((p) => ({
                    total: p.subscribersLost,
                    date: p.day,
                })),
            });
            acc.push({
                label: 'Likes',
                data: mappedData?.map((p) => ({
                    total: p.likes,
                    date: p.day,
                })),
            });
            return acc;
        }
        catch (err) {
            return [];
        }
    }
}
exports.YoutubeProvider = YoutubeProvider;


/***/ }),
/* 79 */
/***/ ((module) => {

module.exports = require("googleapis");

/***/ }),
/* 80 */
/***/ ((module) => {

module.exports = require("node:process");

/***/ }),
/* 81 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TiktokProvider = void 0;
const tslib_1 = __webpack_require__(3);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
const social_abstract_1 = __webpack_require__(65);
const timer_1 = __webpack_require__(66);
class TiktokProvider extends social_abstract_1.SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'tiktok';
        this.name = 'Tiktok';
        this.isBetweenSteps = false;
        this.scopes = [
            'user.info.basic',
            'video.publish',
            'video.upload',
            'user.info.profile',
        ];
    }
    async refreshToken(refreshToken) {
        const value = {
            client_key: process.env.TIKTOK_CLIENT_ID,
            client_secret: process.env.TIKTOK_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        };
        const { access_token, refresh_token, ...all } = await (await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            method: 'POST',
            body: new URLSearchParams(value).toString(),
        })).json();
        const { data: { user: { avatar_url, display_name, open_id, username }, }, } = await (await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name,union_id,username', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        })).json();
        return {
            refreshToken: refresh_token,
            expiresIn: (0, dayjs_1.default)().add(23, 'hours').unix() - (0, dayjs_1.default)().unix(),
            accessToken: access_token,
            id: open_id.replace(/-/g, ''),
            name: display_name,
            picture: avatar_url,
            username: username,
        };
    }
    async generateAuthUrl() {
        const state = Math.random().toString(36).substring(2);
        return {
            url: 'https://www.tiktok.com/v2/auth/authorize/' +
                `?client_key=${process.env.TIKTOK_CLIENT_ID}` +
                `&redirect_uri=${encodeURIComponent(`${process?.env?.FRONTEND_URL?.indexOf('https') === -1
                    ? 'https://redirectmeto.com/'
                    : ''}${process?.env?.FRONTEND_URL}/integrations/social/tiktok`)}` +
                `&state=${state}` +
                `&response_type=code` +
                `&scope=${encodeURIComponent(this.scopes.join(','))}`,
            codeVerifier: state,
            state,
        };
    }
    async authenticate(params) {
        const value = {
            client_key: process.env.TIKTOK_CLIENT_ID,
            client_secret: process.env.TIKTOK_CLIENT_SECRET,
            code: params.code,
            grant_type: 'authorization_code',
            code_verifier: params.codeVerifier,
            redirect_uri: `${process?.env?.FRONTEND_URL?.indexOf('https') === -1
                ? 'https://redirectmeto.com/'
                : ''}${process?.env?.FRONTEND_URL}/integrations/social/tiktok`
        };
        const { access_token, refresh_token, scope } = await (await this.fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            method: 'POST',
            body: new URLSearchParams(value).toString(),
        })).json();
        console.log(this.scopes, scope);
        this.checkScopes(this.scopes, scope);
        const { data: { user: { avatar_url, display_name, open_id, username }, }, } = await (await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name,union_id,username', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        })).json();
        return {
            id: open_id.replace(/-/g, ''),
            name: display_name,
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresIn: (0, dayjs_1.default)().add(23, 'hours').unix() - (0, dayjs_1.default)().unix(),
            picture: avatar_url,
            username: username,
        };
    }
    async maxVideoLength(accessToken) {
        const { data: { max_video_post_duration_sec }, } = await (await this.fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                Authorization: `Bearer ${accessToken}`,
            },
        })).json();
        return {
            maxDurationSeconds: max_video_post_duration_sec,
        };
    }
    async uploadedVideoSuccess(id, publishId, accessToken) {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const post = await (await this.fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    publish_id: publishId,
                }),
            })).json();
            const { status, publicaly_available_post_id } = post.data;
            if (status === 'PUBLISH_COMPLETE') {
                return {
                    url: !publicaly_available_post_id
                        ? `https://www.tiktok.com/@${id}`
                        : `https://www.tiktok.com/@${id}/video/` +
                            publicaly_available_post_id,
                    id: !publicaly_available_post_id
                        ? publishId
                        : publicaly_available_post_id?.[0],
                };
            }
            if (status === 'FAILED') {
                throw new social_abstract_1.BadBody('titok-error-upload', JSON.stringify(post), {
                    // @ts-ignore
                    postDetails,
                });
            }
            await (0, timer_1.timer)(3000);
        }
    }
    async post(id, accessToken, postDetails, integration) {
        const [firstPost, ...comments] = postDetails;
        const { data: { publish_id }, } = await (await this.fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                post_info: {
                    title: firstPost.message,
                    privacy_level: firstPost.settings.privacy_level,
                    disable_duet: !firstPost.settings.duet,
                    disable_comment: !firstPost.settings.comment,
                    disable_stitch: !firstPost.settings.stitch,
                    brand_content_toggle: firstPost.settings.brand_content_toggle,
                    brand_organic_toggle: firstPost.settings.brand_organic_toggle,
                },
                source_info: {
                    source: 'PULL_FROM_URL',
                    video_url: firstPost?.media?.[0]?.url,
                },
            }),
        })).json();
        const { url, id: videoId } = await this.uploadedVideoSuccess(integration.profile, publish_id, accessToken);
        return [
            {
                id: firstPost.id,
                releaseURL: url,
                postId: String(videoId),
                status: 'success',
            },
        ];
    }
}
exports.TiktokProvider = TiktokProvider;


/***/ }),
/* 82 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PinterestProvider = void 0;
const tslib_1 = __webpack_require__(3);
const make_is_1 = __webpack_require__(27);
const axios_1 = tslib_1.__importDefault(__webpack_require__(53));
const form_data_1 = tslib_1.__importDefault(__webpack_require__(83));
const timer_1 = __webpack_require__(66);
const social_abstract_1 = __webpack_require__(65);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
class PinterestProvider extends social_abstract_1.SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'pinterest';
        this.name = 'Pinterest';
        this.isBetweenSteps = false;
        this.scopes = [
            'boards:read',
            'boards:write',
            'pins:read',
            'pins:write',
            'user_accounts:read',
        ];
        this.config = {
            PINTEREST_CLIENT_ID: process.env.PINTEREST_CLIENT_ID || '',
            PINTEREST_CLIENT_SECRET: process.env.PINTEREST_CLIENT_SECRET || '',
        };
    }
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    getConfig() {
        return this.config;
    }
    async refreshToken(refreshToken) {
        const { access_token, expires_in } = await (await this.fetch('https://api.pinterest.com/v5/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${this.config.PINTEREST_CLIENT_ID}:${this.config.PINTEREST_CLIENT_SECRET}`).toString('base64')}`,
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                scope: this.scopes.join(','),
                redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/pinterest`,
            }),
        })).json();
        const { id, profile_image, username } = await (await this.fetch('https://api.pinterest.com/v5/user_account', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        })).json();
        return {
            id: id,
            name: username,
            accessToken: access_token,
            refreshToken: refreshToken,
            expiresIn: expires_in,
            picture: profile_image,
            username,
        };
    }
    async generateAuthUrl(clientInformation, customerId) {
        // const state = makeId(6);
        const state = `customerId:${customerId},uniqueState:${(0, make_is_1.makeId)(6)}`;
        return {
            url: `https://www.pinterest.com/oauth/?client_id=${this.config.PINTEREST_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/pinterest`)}&response_type=code&scope=${encodeURIComponent('boards:read,boards:write,pins:read,pins:write,user_accounts:read')}&state=${encodeURIComponent(state)}`,
            codeVerifier: (0, make_is_1.makeId)(10),
            state,
        };
    }
    async authenticate(params) {
        const { access_token, refresh_token, expires_in, scope } = await (await this.fetch('https://api.pinterest.com/v5/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${this.config.PINTEREST_CLIENT_ID}:${this.config.PINTEREST_CLIENT_SECRET}`).toString('base64')}`,
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: params.code,
                redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/pinterest`,
            }),
        })).json();
        this.checkScopes(this.scopes, scope);
        const { id, profile_image, username } = await (await this.fetch('https://api.pinterest.com/v5/user_account', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        })).json();
        return {
            id: id,
            name: username,
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresIn: expires_in,
            picture: profile_image,
            username,
        };
    }
    async boards(accessToken) {
        const { items } = await (await this.fetch('https://api.pinterest.com/v5/boards', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })).json();
        return (items?.map((item) => ({
            name: item.name,
            id: item.id,
        })) || []);
    }
    async post(id, accessToken, postDetails) {
        let mediaId = '';
        const findMp4 = postDetails?.[0]?.media?.find((p) => (p.url?.indexOf('mp4') || -1) > -1);
        const picture = postDetails?.[0]?.media?.find((p) => (p.url?.indexOf('mp4') || -1) === -1);
        if (findMp4) {
            const { upload_url, media_id, upload_parameters } = await (await this.fetch('https://api.pinterest.com/v5/media', {
                method: 'POST',
                body: JSON.stringify({
                    media_type: 'video',
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
            })).json();
            const { data, status } = await axios_1.default.get(postDetails?.[0]?.media?.[0]?.url, {
                responseType: 'stream',
            });
            const formData = Object.keys(upload_parameters)
                .filter((f) => f)
                .reduce((acc, key) => {
                acc.append(key, upload_parameters[key]);
                return acc;
            }, new form_data_1.default());
            formData.append('file', data);
            await axios_1.default.post(upload_url, formData);
            let statusCode = '';
            while (statusCode !== 'succeeded') {
                const mediafile = await (await this.fetch('https://api.pinterest.com/v5/media/' + media_id, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                })).json();
                await (0, timer_1.timer)(3000);
                statusCode = mediafile.status;
            }
            mediaId = media_id;
        }
        const mapImages = postDetails?.[0]?.media?.map((m) => ({
            url: m.url,
        }));
        try {
            const { id: pId } = await (await this.fetch('https://api.pinterest.com/v5/pins', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...(postDetails?.[0]?.settings.link
                        ? { link: postDetails?.[0]?.settings.link }
                        : {}),
                    ...(postDetails?.[0]?.settings.title
                        ? { title: postDetails?.[0]?.settings.title }
                        : {}),
                    description: postDetails?.[0]?.message,
                    ...(postDetails?.[0]?.settings.dominant_color
                        ? { dominant_color: postDetails?.[0]?.settings.dominant_color }
                        : {}),
                    board_id: postDetails?.[0]?.settings.board,
                    media_source: mediaId
                        ? {
                            source_type: 'video_id',
                            media_id: mediaId,
                            cover_image_url: picture?.url,
                        }
                        : mapImages?.length === 1
                            ? {
                                source_type: 'image_url',
                                url: mapImages?.[0]?.url,
                            }
                            : {
                                source_type: 'multiple_image_urls',
                                items: mapImages,
                            },
                }),
            })).json();
            return [
                {
                    id: postDetails?.[0]?.id,
                    postId: pId,
                    releaseURL: `https://www.pinterest.com/pin/${pId}`,
                    status: 'success',
                },
            ];
        }
        catch (err) {
            console.log(err);
            return [];
        }
    }
    async analytics(id, accessToken, date) {
        const until = (0, dayjs_1.default)().format('YYYY-MM-DD');
        const since = (0, dayjs_1.default)().subtract(date, 'day').format('YYYY-MM-DD');
        const { all: { daily_metrics }, } = await (await this.fetch(`https://api.pinterest.com/v5/user_account/analytics?start_date=${since}&end_date=${until}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        })).json();
        return daily_metrics.reduce((acc, item) => {
            if (typeof item.metrics.PIN_CLICK_RATE !== 'undefined') {
                acc[0].data.push({
                    date: item.date,
                    total: item.metrics.PIN_CLICK_RATE,
                });
                acc[1].data.push({
                    date: item.date,
                    total: item.metrics.IMPRESSION,
                });
                acc[2].data.push({
                    date: item.date,
                    total: item.metrics.PIN_CLICK,
                });
                acc[3].data.push({
                    date: item.date,
                    total: item.metrics.ENGAGEMENT,
                });
                acc[4].data.push({
                    date: item.date,
                    total: item.metrics.SAVE,
                });
            }
            return acc;
        }, [
            { label: 'Pin click rate', data: [] },
            { label: 'Impressions', data: [] },
            { label: 'Pin Clicks', data: [] },
            { label: 'Engagement', data: [] },
            { label: 'Saves', data: [] },
        ]);
    }
}
exports.PinterestProvider = PinterestProvider;


/***/ }),
/* 83 */
/***/ ((module) => {

module.exports = require("form-data");

/***/ }),
/* 84 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DribbbleProvider = void 0;
const tslib_1 = __webpack_require__(3);
const make_is_1 = __webpack_require__(27);
const axios_1 = tslib_1.__importDefault(__webpack_require__(53));
const form_data_1 = tslib_1.__importDefault(__webpack_require__(83));
const social_abstract_1 = __webpack_require__(65);
const mime_types_1 = tslib_1.__importDefault(__webpack_require__(51));
class DribbbleProvider extends social_abstract_1.SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'dribbble';
        this.name = 'Dribbble';
        this.isBetweenSteps = false;
        this.scopes = ['public', 'upload'];
    }
    async refreshToken(refreshToken) {
        const { access_token, expires_in } = await (await this.fetch('https://api-sandbox.pinterest.com/v5/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${process.env.PINTEREST_CLIENT_ID}:${process.env.PINTEREST_CLIENT_SECRET}`).toString('base64')}`,
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                scope: `${this.scopes.join(',')}`,
                redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/pinterest`,
            }),
        })).json();
        const { id, profile_image, username } = await (await this.fetch('https://api-sandbox.pinterest.com/v5/user_account', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        })).json();
        return {
            id: id,
            name: username,
            accessToken: access_token,
            refreshToken: refreshToken,
            expiresIn: expires_in,
            picture: profile_image,
            username,
        };
    }
    async teams(accessToken) {
        const { teams } = await (await this.fetch('https://api.dribbble.com/v2/user', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })).json();
        return (teams?.map((team) => ({
            id: team.id,
            name: team.name,
        })) || []);
    }
    async generateAuthUrl() {
        const state = (0, make_is_1.makeId)(6);
        return {
            url: `https://dribbble.com/oauth/authorize?client_id=${process.env.DRIBBBLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/dribbble`)}&response_type=code&scope=${this.scopes.join('+')}&state=${state}`,
            codeVerifier: (0, make_is_1.makeId)(10),
            state,
        };
    }
    async authenticate(params) {
        const { access_token, scope } = await (await this.fetch(`https://dribbble.com/oauth/token?client_id=${process.env.DRIBBBLE_CLIENT_ID}&client_secret=${process.env.DRIBBBLE_CLIENT_SECRET}&code=${params.code}&redirect_uri=${process.env.FRONTEND_URL}/integrations/social/dribbble`, {
            method: 'POST',
        })).json();
        this.checkScopes(this.scopes, scope);
        const { id, name, avatar_url, login } = await (await this.fetch('https://api.dribbble.com/v2/user', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        })).json();
        return {
            id: id,
            name,
            accessToken: access_token,
            refreshToken: '',
            expiresIn: 999999999,
            picture: avatar_url,
            username: login,
        };
    }
    async post(id, accessToken, postDetails) {
        const { data, status } = await axios_1.default.get(postDetails?.[0]?.media?.[0]?.url, {
            responseType: 'stream',
        });
        const slash = postDetails?.[0]?.media?.[0]?.url.split('/').at(-1);
        const formData = new form_data_1.default();
        formData.append('image', data, {
            filename: slash,
            contentType: mime_types_1.default.lookup(slash) || '',
        });
        formData.append('title', postDetails[0].settings.title);
        formData.append('description', postDetails[0].message);
        const data2 = await axios_1.default.post('https://api.dribbble.com/v2/shots', formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const location = data2.headers['location'];
        const newId = location.split('/').at(-1);
        return [
            {
                id: postDetails?.[0]?.id,
                status: 'completed',
                postId: newId,
                releaseURL: `https://dribbble.com/shots/${newId}`,
            },
        ];
    }
    analytics(id, accessToken, date) {
        return Promise.resolve([]);
    }
}
exports.DribbbleProvider = DribbbleProvider;


/***/ }),
/* 85 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LinkedinPageProvider = void 0;
const tslib_1 = __webpack_require__(3);
const make_is_1 = __webpack_require__(27);
const linkedin_provider_1 = __webpack_require__(69);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
const client_1 = __webpack_require__(11);
const plug_decorator_1 = __webpack_require__(67);
const timer_1 = __webpack_require__(66);
class LinkedinPageProvider extends linkedin_provider_1.LinkedinProvider {
    constructor() {
        super(...arguments);
        this.identifier = 'linkedin-page';
        this.name = 'LinkedIn Page';
        this.isBetweenSteps = true;
        this.refreshWait = true;
        this.scopes = [
            'openid',
            'profile',
            'w_member_social',
            'r_basicprofile',
            'rw_organization_admin',
            'w_organization_social',
            'r_organization_social',
        ];
    }
    async refreshToken(refresh_token) {
        const { access_token: accessToken, expires_in, refresh_token: refreshToken, } = await (await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token,
                client_id: this.config.LINKEDIN_CLIENT_ID,
                client_secret: this.config.LINKEDIN_CLIENT_SECRET,
            }),
        })).json();
        const { vanityName } = await (await fetch('https://api.linkedin.com/v2/me', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })).json();
        const { name, sub: id, picture, } = await (await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })).json();
        return {
            id,
            accessToken,
            refreshToken,
            expiresIn: expires_in,
            name,
            picture,
            username: vanityName,
        };
    }
    async repostPostUsers(integration, originalIntegration, postId, information) {
        return super.repostPostUsers(integration, originalIntegration, postId, information, false);
    }
    async generateAuthUrl(clientInformation, customerId) {
        // const state = makeId(6);
        const state = `customerId:${customerId},uniqueState:${(0, make_is_1.makeId)(6)}`;
        const codeVerifier = (0, make_is_1.makeId)(30);
        const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&prompt=none&client_id=${this.config.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/linkedin-page`)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(this.scopes.join(' '))}`;
        return {
            url,
            codeVerifier,
            state,
        };
    }
    async companies(accessToken) {
        const { elements, ...all } = await (await fetch('https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organizationalTarget~(localizedName,vanityName,logoV2(original~:playableStreams))))', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': '202402',
            },
        })).json();
        return (elements || []).map((e) => ({
            id: e.organizationalTarget.split(':').pop(),
            page: e.organizationalTarget.split(':').pop(),
            username: e['organizationalTarget~'].vanityName,
            name: e['organizationalTarget~'].localizedName,
            picture: e['organizationalTarget~'].logoV2?.['original~']?.elements?.[0]
                ?.identifiers?.[0]?.identifier,
        }));
    }
    async reConnect(id, requiredId, accessToken) {
        const information = await this.fetchPageInformation(accessToken, requiredId);
        return {
            id: information.id,
            name: information.name,
            accessToken: information.access_token,
            refreshToken: information.access_token,
            expiresIn: (0, dayjs_1.default)().add(59, 'days').unix() - (0, dayjs_1.default)().unix(),
            picture: information.picture,
            username: information.username,
        };
    }
    async fetchPageInformation(accessToken, pageId) {
        const data = await (await fetch(`https://api.linkedin.com/v2/organizations/${pageId}?projection=(id,localizedName,vanityName,logoV2(original~:playableStreams))`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })).json();
        return {
            id: data.id,
            name: data.localizedName,
            access_token: accessToken,
            picture: data?.logoV2?.['original~']?.elements?.[0]?.identifiers?.[0].identifier,
            username: data.vanityName,
        };
    }
    async authenticate(params) {
        const body = new URLSearchParams();
        body.append('grant_type', 'authorization_code');
        body.append('code', params.code);
        body.append('redirect_uri', `${process.env.FRONTEND_URL}/integrations/social/linkedin-page`);
        body.append('client_id', this.config.LINKEDIN_CLIENT_ID);
        body.append('client_secret', this.config.LINKEDIN_CLIENT_SECRET);
        const { access_token: accessToken, expires_in: expiresIn, refresh_token: refreshToken, scope, } = await (await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
        })).json();
        this.checkScopes(this.scopes, scope);
        const { name, sub: id, picture, } = await (await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })).json();
        const { vanityName } = await (await fetch('https://api.linkedin.com/v2/me', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })).json();
        return {
            id: `p_${id}`,
            accessToken,
            refreshToken,
            expiresIn,
            name,
            picture,
            username: vanityName,
        };
    }
    async post(id, accessToken, postDetails, integration) {
        return super.post(id, accessToken, postDetails, integration, 'company');
    }
    async analytics(id, accessToken, date) {
        const endDate = (0, dayjs_1.default)().unix() * 1000;
        const startDate = (0, dayjs_1.default)().subtract(date, 'days').unix() * 1000;
        const { elements } = await (await this.fetch(`https://api.linkedin.com/rest/organizationPageStatistics?q=organization&organization=${encodeURIComponent(`urn:li:organization:${id}`)}&timeIntervals=(timeRange:(start:${startDate},end:${endDate}),timeGranularityType:DAY)`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Linkedin-Version': '202405',
                'X-Restli-Protocol-Version': '2.0.0',
            },
        })).json();
        const { elements: elements2 } = await (await this.fetch(`https://api.linkedin.com/rest/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(`urn:li:organization:${id}`)}&timeIntervals=(timeRange:(start:${startDate},end:${endDate}),timeGranularityType:DAY)`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Linkedin-Version': '202405',
                'X-Restli-Protocol-Version': '2.0.0',
            },
        })).json();
        const { elements: elements3 } = await (await this.fetch(`https://api.linkedin.com/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(`urn:li:organization:${id}`)}&timeIntervals=(timeRange:(start:${startDate},end:${endDate}),timeGranularityType:DAY)`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Linkedin-Version': '202405',
                'X-Restli-Protocol-Version': '2.0.0',
            },
        })).json();
        const analytics = [...elements2, ...elements, ...elements3].reduce((all, current) => {
            if (typeof current?.totalPageStatistics?.views?.allPageViews
                ?.pageViews !== 'undefined') {
                all['Page Views'].push({
                    total: current.totalPageStatistics.views.allPageViews.pageViews,
                    date: (0, dayjs_1.default)(current.timeRange.start).format('YYYY-MM-DD'),
                });
            }
            if (typeof current?.followerGains?.organicFollowerGain !== 'undefined') {
                all['Organic Followers'].push({
                    total: current?.followerGains?.organicFollowerGain,
                    date: (0, dayjs_1.default)(current.timeRange.start).format('YYYY-MM-DD'),
                });
            }
            if (typeof current?.followerGains?.paidFollowerGain !== 'undefined') {
                all['Paid Followers'].push({
                    total: current?.followerGains?.paidFollowerGain,
                    date: (0, dayjs_1.default)(current.timeRange.start).format('YYYY-MM-DD'),
                });
            }
            if (typeof current?.totalShareStatistics !== 'undefined') {
                all['Clicks'].push({
                    total: current?.totalShareStatistics.clickCount,
                    date: (0, dayjs_1.default)(current.timeRange.start).format('YYYY-MM-DD'),
                });
                all['Shares'].push({
                    total: current?.totalShareStatistics.shareCount,
                    date: (0, dayjs_1.default)(current.timeRange.start).format('YYYY-MM-DD'),
                });
                all['Engagement'].push({
                    total: current?.totalShareStatistics.engagement,
                    date: (0, dayjs_1.default)(current.timeRange.start).format('YYYY-MM-DD'),
                });
                all['Comments'].push({
                    total: current?.totalShareStatistics.commentCount,
                    date: (0, dayjs_1.default)(current.timeRange.start).format('YYYY-MM-DD'),
                });
            }
            return all;
        }, {
            'Page Views': [],
            Clicks: [],
            Shares: [],
            Engagement: [],
            Comments: [],
            'Organic Followers': [],
            'Paid Followers': [],
        });
        return Object.keys(analytics).map((key) => ({
            label: key,
            data: analytics[key],
            percentageChange: 5,
        }));
    }
    async autoRepostPost(integration, id, fields) {
        const { likesSummary: { totalLikes }, } = await (await this.fetch(`https://api.linkedin.com/v2/socialActions/${encodeURIComponent(id)}`, {
            method: 'GET',
            headers: {
                'X-Restli-Protocol-Version': '2.0.0',
                'Content-Type': 'application/json',
                'LinkedIn-Version': '202402',
                Authorization: `Bearer ${integration.token}`,
            },
        })).json();
        if (totalLikes >= +fields.likesAmount) {
            await (0, timer_1.timer)(2000);
            await this.fetch(`https://api.linkedin.com/rest/posts`, {
                body: JSON.stringify({
                    author: `urn:li:organization:${integration.internalId}`,
                    commentary: '',
                    visibility: 'PUBLIC',
                    distribution: {
                        feedDistribution: 'MAIN_FEED',
                        targetEntities: [],
                        thirdPartyDistributionChannels: [],
                    },
                    lifecycleState: 'PUBLISHED',
                    isReshareDisabledByAuthor: false,
                    reshareContext: {
                        parent: id,
                    },
                }),
                method: 'POST',
                headers: {
                    'X-Restli-Protocol-Version': '2.0.0',
                    'Content-Type': 'application/json',
                    'LinkedIn-Version': '202402',
                    Authorization: `Bearer ${integration.token}`,
                },
            });
            return true;
        }
        return false;
    }
    async autoPlugPost(integration, id, fields) {
        const { likesSummary: { totalLikes }, } = await (await this.fetch(`https://api.linkedin.com/v2/socialActions/${encodeURIComponent(id)}`, {
            method: 'GET',
            headers: {
                'X-Restli-Protocol-Version': '2.0.0',
                'Content-Type': 'application/json',
                'LinkedIn-Version': '202402',
                Authorization: `Bearer ${integration.token}`,
            },
        })).json();
        if (totalLikes >= fields.likesAmount) {
            await (0, timer_1.timer)(2000);
            await this.fetch(`https://api.linkedin.com/v2/socialActions/${decodeURIComponent(id)}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${integration.token}`,
                },
                body: JSON.stringify({
                    actor: `urn:li:organization:${integration.internalId}`,
                    object: id,
                    message: {
                        text: this.fixText(fields.post)
                    },
                }),
            });
            return true;
        }
        return false;
    }
}
exports.LinkedinPageProvider = LinkedinPageProvider;
tslib_1.__decorate([
    (0, plug_decorator_1.Plug)({
        identifier: 'linkedin-page-autoRepostPost',
        title: 'Auto Repost Posts',
        description: 'When a post reached a certain number of likes, repost it to increase engagement (1 week old posts)',
        runEveryMilliseconds: 21600000,
        totalRuns: 3,
        fields: [
            {
                name: 'likesAmount',
                type: 'number',
                placeholder: 'Amount of likes',
                description: 'The amount of likes to trigger the repost',
                validation: /^\d+$/,
            },
        ],
    }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof client_1.Integration !== "undefined" && client_1.Integration) === "function" ? _a : Object, String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], LinkedinPageProvider.prototype, "autoRepostPost", null);
tslib_1.__decorate([
    (0, plug_decorator_1.Plug)({
        identifier: 'linkedin-page-autoPlugPost',
        title: 'Auto plug post',
        description: 'When a post reached a certain number of likes, add another post to it so you followers get a notification about your promotion',
        runEveryMilliseconds: 21600000,
        totalRuns: 3,
        fields: [
            {
                name: 'likesAmount',
                type: 'number',
                placeholder: 'Amount of likes',
                description: 'The amount of likes to trigger the repost',
                validation: /^\d+$/,
            },
            {
                name: 'post',
                type: 'richtext',
                placeholder: 'Post to plug',
                description: 'Message content to plug',
                validation: /^[\s\S]{3,}$/g,
            },
        ],
    }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_b = typeof client_1.Integration !== "undefined" && client_1.Integration) === "function" ? _b : Object, String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], LinkedinPageProvider.prototype, "autoPlugPost", null);


/***/ }),
/* 86 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ThreadsProvider = void 0;
const tslib_1 = __webpack_require__(3);
const make_is_1 = __webpack_require__(27);
const timer_1 = __webpack_require__(66);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
const social_abstract_1 = __webpack_require__(65);
const lodash_1 = __webpack_require__(12);
const plug_decorator_1 = __webpack_require__(67);
const client_1 = __webpack_require__(11);
class ThreadsProvider extends social_abstract_1.SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'threads';
        this.name = 'Threads';
        this.isBetweenSteps = false;
        this.scopes = [
            'threads_basic',
            'threads_content_publish',
            'threads_manage_replies',
            'threads_manage_insights',
        ];
        this.config = {
            THREADS_APP_ID: process.env.THREADS_APP_ID || '',
            THREADS_APP_SECRET: process.env.THREADS_APP_SECRET || '',
        };
    }
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    getConfig() {
        return this.config;
    }
    async refreshToken(refresh_token) {
        return {
            refreshToken: '',
            expiresIn: 0,
            accessToken: '',
            id: '',
            name: '',
            picture: '',
            username: '',
        };
    }
    async generateAuthUrl(clientInformation, customerId) {
        // const state = makeId(6);
        const state = `customerId:${customerId},uniqueState:${(0, make_is_1.makeId)(6)}`;
        return {
            url: 'https://threads.net/oauth/authorize' +
                `?client_id=${this.config.THREADS_APP_ID}` +
                `&redirect_uri=${encodeURIComponent(`${process?.env.FRONTEND_URL?.indexOf('https') == -1
                    ? `https://redirectmeto.com/${process?.env.FRONTEND_URL}`
                    : `${process?.env.FRONTEND_URL}`}/integrations/social/threads`)}` +
                // `&state=${state}` +
                `&state=${encodeURIComponent(state)}` +
                `&scope=${encodeURIComponent(this.scopes.join(','))}`,
            codeVerifier: (0, make_is_1.makeId)(10),
            state,
        };
    }
    async authenticate(params) {
        const getAccessToken = await (await this.fetch('https://graph.threads.net/oauth/access_token' +
            `?client_id=${this.config.THREADS_APP_ID}` +
            `&redirect_uri=${encodeURIComponent(`${process?.env.FRONTEND_URL?.indexOf('https') == -1
                ? `https://redirectmeto.com/${process?.env.FRONTEND_URL}`
                : `${process?.env.FRONTEND_URL}`}/integrations/social/threads`)}` +
            `&grant_type=authorization_code` +
            `&client_secret=${this.config.THREADS_APP_SECRET}` +
            `&code=${params.code}`)).json();
        const { access_token } = await (await this.fetch('https://graph.threads.net/access_token' +
            '?grant_type=th_exchange_token' +
            `&client_secret=${this.config.THREADS_APP_SECRET}` +
            `&access_token=${getAccessToken.access_token}&fields=access_token,expires_in`)).json();
        const { id, name, picture: { data: { url }, }, } = await this.fetchPageInformation(access_token);
        return {
            id,
            name,
            accessToken: access_token,
            refreshToken: access_token,
            expiresIn: (0, dayjs_1.default)().add(59, 'days').unix() - (0, dayjs_1.default)().unix(),
            picture: url,
            username: '',
        };
    }
    async checkLoaded(mediaContainerId, accessToken) {
        const { status, id, error_message } = await (await this.fetch(`https://graph.threads.net/v1.0/${mediaContainerId}?fields=status,error_message&access_token=${accessToken}`)).json();
        if (status === 'ERROR') {
            throw new Error(id);
        }
        if (status === 'FINISHED') {
            await (0, timer_1.timer)(2000);
            return true;
        }
        await (0, timer_1.timer)(2200);
        return this.checkLoaded(mediaContainerId, accessToken);
    }
    async fetchPageInformation(accessToken) {
        const { id, username, threads_profile_picture_url, access_token } = await (await this.fetch(`https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`)).json();
        return {
            id,
            name: username,
            access_token,
            picture: { data: { url: threads_profile_picture_url } },
            username,
        };
    }
    async post(id, accessToken, postDetails) {
        const [firstPost, ...theRest] = postDetails;
        let globalThread = '';
        let link = '';
        if (firstPost?.media?.length <= 1) {
            const type = !firstPost?.media?.[0]?.url
                ? undefined
                : firstPost?.media[0].url.indexOf('.mp4') > -1
                    ? 'video_url'
                    : 'image_url';
            const media = new URLSearchParams({
                ...(type === 'video_url'
                    ? { video_url: firstPost?.media[0].url }
                    : {}),
                ...(type === 'image_url'
                    ? { image_url: firstPost?.media[0].url }
                    : {}),
                media_type: type === 'video_url'
                    ? 'VIDEO'
                    : type === 'image_url'
                        ? 'IMAGE'
                        : 'TEXT',
                text: firstPost?.message,
                access_token: accessToken,
            });
            const { id: containerId } = await (await this.fetch(`https://graph.threads.net/v1.0/${id}/threads?${media.toString()}`, {
                method: 'POST',
            })).json();
            await this.checkLoaded(containerId, accessToken);
            const { id: threadId } = await (await this.fetch(`https://graph.threads.net/v1.0/${id}/threads_publish?creation_id=${containerId}&access_token=${accessToken}`, {
                method: 'POST',
            })).json();
            const { permalink, ...all } = await (await this.fetch(`https://graph.threads.net/v1.0/${threadId}?fields=id,permalink&access_token=${accessToken}`)).json();
            globalThread = threadId;
            link = permalink;
        }
        else {
            const medias = [];
            for (const mediaLoad of firstPost.media) {
                const type = mediaLoad.url.indexOf('.mp4') > -1 ? 'video_url' : 'image_url';
                const media = new URLSearchParams({
                    ...(type === 'video_url' ? { video_url: mediaLoad.url } : {}),
                    ...(type === 'image_url' ? { image_url: mediaLoad.url } : {}),
                    is_carousel_item: 'true',
                    media_type: type === 'video_url'
                        ? 'VIDEO'
                        : type === 'image_url'
                            ? 'IMAGE'
                            : 'TEXT',
                    text: firstPost?.message,
                    access_token: accessToken,
                });
                const { id: mediaId } = await (await this.fetch(`https://graph.threads.net/v1.0/${id}/threads?${media.toString()}`, {
                    method: 'POST',
                })).json();
                medias.push(mediaId);
            }
            await Promise.all(medias.map((p) => this.checkLoaded(p, accessToken)));
            const { id: containerId } = await (await this.fetch(`https://graph.threads.net/v1.0/${id}/threads?text=${firstPost?.message}&media_type=CAROUSEL&children=${medias.join(',')}&access_token=${accessToken}`, {
                method: 'POST',
            })).json();
            await this.checkLoaded(containerId, accessToken);
            const { id: threadId } = await (await this.fetch(`https://graph.threads.net/v1.0/${id}/threads_publish?creation_id=${containerId}&access_token=${accessToken}`, {
                method: 'POST',
            })).json();
            const { permalink } = await (await this.fetch(`https://graph.threads.net/v1.0/${threadId}?fields=id,permalink&access_token=${accessToken}`)).json();
            globalThread = threadId;
            link = permalink;
        }
        let lastId = globalThread;
        for (const post of theRest) {
            const form = new FormData();
            form.append('media_type', 'TEXT');
            form.append('text', post.message);
            form.append('reply_to_id', lastId);
            form.append('access_token', accessToken);
            const { id: replyId } = await (await this.fetch('https://graph.threads.net/v1.0/me/threads', {
                method: 'POST',
                body: form,
            })).json();
            const { id: threadMediaId } = await (await this.fetch(`https://graph.threads.net/v1.0/${id}/threads_publish?creation_id=${replyId}&access_token=${accessToken}`, {
                method: 'POST',
            })).json();
            lastId = threadMediaId;
        }
        return [
            {
                id: firstPost.id,
                postId: String(globalThread),
                status: 'success',
                releaseURL: link,
            },
            ...theRest.map((p) => ({
                id: p.id,
                postId: String(globalThread),
                status: 'success',
                releaseURL: link,
            })),
        ];
    }
    async analytics(id, accessToken, date) {
        const until = (0, dayjs_1.default)().endOf('day').unix();
        const since = (0, dayjs_1.default)().subtract(date, 'day').unix();
        const { data, ...all } = await (await fetch(`https://graph.threads.net/v1.0/${id}/threads_insights?metric=views,likes,replies,reposts,quotes&access_token=${accessToken}&period=day&since=${since}&until=${until}`)).json();
        return (data?.map((d) => ({
            label: (0, lodash_1.capitalize)(d.name),
            percentageChange: 5,
            data: d.total_value
                ? [{ total: d.total_value.value, date: (0, dayjs_1.default)().format('YYYY-MM-DD') }]
                : d.values.map((v) => ({
                    total: v.value,
                    date: (0, dayjs_1.default)(v.end_time).format('YYYY-MM-DD'),
                })),
        })) || []);
    }
    async autoPlugPost(integration, id, fields) {
        const { data } = await (await fetch(`https://graph.threads.net/v1.0/${id}/insights?metric=likes&access_token=${integration.token}`)).json();
        const { values: [value], } = data.find((p) => p.name === 'likes');
        if (value.value >= fields.likesAmount) {
            await (0, timer_1.timer)(2000);
            const form = new FormData();
            form.append('media_type', 'TEXT');
            form.append('text', fields.post);
            form.append('reply_to_id', id);
            form.append('access_token', integration.token);
            const { id: replyId } = await (await this.fetch('https://graph.threads.net/v1.0/me/threads', {
                method: 'POST',
                body: form,
            })).json();
            await (await this.fetch(`https://graph.threads.net/v1.0/${integration.internalId}/threads_publish?creation_id=${replyId}&access_token=${integration.token}`, {
                method: 'POST',
            })).json();
            return true;
        }
        return false;
    }
}
exports.ThreadsProvider = ThreadsProvider;
tslib_1.__decorate([
    (0, plug_decorator_1.Plug)({
        identifier: 'threads-autoPlugPost',
        title: 'Auto plug post',
        description: 'When a post reached a certain number of likes, add another post to it so you followers get a notification about your promotion',
        runEveryMilliseconds: 21600000,
        totalRuns: 3,
        fields: [
            {
                name: 'likesAmount',
                type: 'number',
                placeholder: 'Amount of likes',
                description: 'The amount of likes to trigger the repost',
                validation: /^\d+$/,
            },
            {
                name: 'post',
                type: 'richtext',
                placeholder: 'Post to plug',
                description: 'Message content to plug',
                validation: /^[\s\S]{3,}$/g,
            },
        ],
    }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof client_1.Integration !== "undefined" && client_1.Integration) === "function" ? _a : Object, String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ThreadsProvider.prototype, "autoPlugPost", null);


/***/ }),
/* 87 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DiscordProvider = void 0;
const make_is_1 = __webpack_require__(27);
const social_abstract_1 = __webpack_require__(65);
class DiscordProvider extends social_abstract_1.SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'discord';
        this.name = 'Discord';
        this.isBetweenSteps = false;
        this.scopes = ['identify', 'guilds'];
    }
    async refreshToken(refreshToken) {
        const { access_token, expires_in, refresh_token } = await (await this.fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(process.env.DISCORD_CLIENT_ID +
                    ':' +
                    process.env.DISCORD_CLIENT_SECRET).toString('base64')}`,
            },
        })).json();
        const { application } = await (await fetch('https://discord.com/api/oauth2/@me', {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        })).json();
        return {
            refreshToken: refresh_token,
            expiresIn: expires_in,
            accessToken: access_token,
            id: '',
            name: application.name,
            picture: '',
            username: '',
        };
    }
    async generateAuthUrl() {
        const state = (0, make_is_1.makeId)(6);
        return {
            url: `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=377957124096&response_type=code&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/discord`)}&integration_type=0&scope=bot+identify+guilds&state=${state}`,
            codeVerifier: (0, make_is_1.makeId)(10),
            state,
        };
    }
    async authenticate(params) {
        const { access_token, expires_in, refresh_token, scope, guild } = await (await this.fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                code: params.code,
                grant_type: 'authorization_code',
                redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/discord`,
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(process.env.DISCORD_CLIENT_ID +
                    ':' +
                    process.env.DISCORD_CLIENT_SECRET).toString('base64')}`,
            },
        })).json();
        this.checkScopes(this.scopes, scope.split(' '));
        const { application } = await (await fetch('https://discord.com/api/oauth2/@me', {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        })).json();
        return {
            id: guild.id,
            name: application.name,
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresIn: expires_in,
            picture: `https://cdn.discordapp.com/avatars/${application.bot.id}/${application.bot.avatar}.png`,
            username: application.bot.username,
        };
    }
    async channels(accessToken, params, id) {
        const list = await (await fetch(`https://discord.com/api/guilds/${id}/channels`, {
            headers: {
                Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_ID}`,
            },
        })).json();
        return list
            .filter((p) => p.type === 0 || p.type === 15)
            .map((p) => ({
            id: String(p.id),
            name: p.name,
        }));
    }
    async post(id, accessToken, postDetails) {
        let channel = postDetails[0].settings.channel;
        if (postDetails.length > 1) {
            const { id: threadId } = await (await fetch(`https://discord.com/api/channels/${postDetails[0].settings.channel}/threads`, {
                method: 'POST',
                headers: {
                    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_ID}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: postDetails[0].message,
                    auto_archive_duration: 1440,
                    type: 11, // Public thread type
                }),
            })).json();
            channel = threadId;
        }
        const finalData = [];
        for (const post of postDetails) {
            const form = new FormData();
            form.append('payload_json', JSON.stringify({
                content: post.message,
                attachments: post.media?.map((p, index) => ({
                    id: index,
                    description: `Picture ${index}`,
                    filename: p.url.split('/').pop(),
                })),
            }));
            let index = 0;
            for (const media of post.media || []) {
                const loadMedia = await fetch(media.url);
                form.append(`files[${index}]`, await loadMedia.blob(), media.url.split('/').pop());
                index++;
            }
            const data = await (await fetch(`https://discord.com/api/channels/${channel}/messages`, {
                method: 'POST',
                headers: {
                    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_ID}`,
                },
                body: form,
            })).json();
            finalData.push({
                id: post.id,
                releaseURL: `https://discord.com/channels/${id}/${channel}/${data.id}`,
                postId: data.id,
                status: 'success',
            });
        }
        return finalData;
    }
    async changeNickname(id, accessToken, name) {
        await (await fetch(`https://discord.com/api/guilds/${id}/members/@me`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_ID}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nick: name,
            })
        })).json();
        return {
            name,
        };
    }
}
exports.DiscordProvider = DiscordProvider;


/***/ }),
/* 88 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SlackProvider = void 0;
const tslib_1 = __webpack_require__(3);
const make_is_1 = __webpack_require__(27);
const social_abstract_1 = __webpack_require__(65);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
class SlackProvider extends social_abstract_1.SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'slack';
        this.name = 'Slack';
        this.isBetweenSteps = false;
        this.scopes = [
            'channels:read',
            'chat:write',
            'users:read',
            'groups:read',
            'channels:join',
            'chat:write.customize',
        ];
    }
    async refreshToken(refreshToken) {
        return {
            refreshToken: '',
            expiresIn: 1000000,
            accessToken: '',
            id: '',
            name: '',
            picture: '',
            username: '',
        };
    }
    async generateAuthUrl() {
        const state = (0, make_is_1.makeId)(6);
        return {
            url: `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_ID}&redirect_uri=${encodeURIComponent(`${process?.env?.FRONTEND_URL?.indexOf('https') === -1
                ? 'https://redirectmeto.com/'
                : ''}${process?.env?.FRONTEND_URL}/integrations/social/slack`)}&scope=channels:read,chat:write,users:read,groups:read,channels:join,chat:write.customize&state=${state}`,
            codeVerifier: (0, make_is_1.makeId)(10),
            state,
        };
    }
    async authenticate(params) {
        const { access_token, team, bot_user_id, scope } = await (await this.fetch(`https://slack.com/api/oauth.v2.access`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.SLACK_ID,
                client_secret: process.env.SLACK_SECRET,
                code: params.code,
                redirect_uri: `${process?.env?.FRONTEND_URL?.indexOf('https') === -1
                    ? 'https://redirectmeto.com/'
                    : ''}${process?.env?.FRONTEND_URL}/integrations/social/slack${params.refresh ? `?refresh=${params.refresh}` : ''}`,
            }),
        })).json();
        this.checkScopes(this.scopes, scope.split(','));
        const { user } = await (await fetch(`https://slack.com/api/users.info?user=${bot_user_id}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        })).json();
        return {
            id: team.id,
            name: user.real_name,
            accessToken: access_token,
            refreshToken: 'null',
            expiresIn: (0, dayjs_1.default)().add(100, 'years').unix() - (0, dayjs_1.default)().unix(),
            picture: user.profile.image_original,
            username: user.name,
        };
    }
    async channels(accessToken, params, id) {
        const list = await (await fetch(`https://slack.com/api/conversations.list?types=public_channel,private_channel`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })).json();
        return list.channels.map((p) => ({
            id: p.id,
            name: p.name,
        }));
    }
    async post(id, accessToken, postDetails, integration) {
        await fetch(`https://slack.com/api/conversations.join`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                channel: postDetails[0].settings.channel,
            }),
        });
        let lastId = '';
        for (const post of postDetails) {
            const { ts } = await (await fetch(`https://slack.com/api/chat.postMessage`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    channel: postDetails[0].settings.channel,
                    username: integration.name,
                    icon_url: integration.picture,
                    ...(lastId ? { thread_ts: lastId } : {}),
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: post.message,
                            },
                        },
                        ...(post.media?.length
                            ? post.media.map((m) => ({
                                type: 'image',
                                image_url: m.url,
                                alt_text: '',
                            }))
                            : []),
                    ],
                }),
            })).json();
            lastId = ts;
        }
        return [];
    }
    async changeProfilePicture(id, accessToken, url) {
        return {
            url,
        };
    }
    async changeNickname(id, accessToken, name) {
        return {
            name,
        };
    }
}
exports.SlackProvider = SlackProvider;


/***/ }),
/* 89 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MastodonProvider = void 0;
const tslib_1 = __webpack_require__(3);
const make_is_1 = __webpack_require__(27);
const social_abstract_1 = __webpack_require__(65);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
class MastodonProvider extends social_abstract_1.SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'mastodon';
        this.name = 'Mastodon';
        this.isBetweenSteps = false;
        this.scopes = ['write:statuses', 'profile', 'write:media'];
    }
    async refreshToken(refreshToken) {
        return {
            refreshToken: '',
            expiresIn: 0,
            accessToken: '',
            id: '',
            name: '',
            picture: '',
            username: '',
        };
    }
    generateUrlDynamic(customUrl, state, clientId, url) {
        return `${customUrl}/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(`${url}/integrations/social/mastodon`)}&scope=${this.scopes.join('+')}&state=${state}`;
    }
    async generateAuthUrl() {
        const state = (0, make_is_1.makeId)(6);
        const url = this.generateUrlDynamic('https://mastodon.social', state, process.env.MASTODON_CLIENT_ID, process.env.FRONTEND_URL);
        return {
            url,
            codeVerifier: (0, make_is_1.makeId)(10),
            state,
        };
    }
    async dynamicAuthenticate(clientId, clientSecret, url, code) {
        const form = new FormData();
        form.append('client_id', clientId);
        form.append('client_secret', clientSecret);
        form.append('code', code);
        form.append('grant_type', 'authorization_code');
        form.append('redirect_uri', `${process.env.FRONTEND_URL}/integrations/social/mastodon`);
        form.append('scope', this.scopes.join(' '));
        const tokenInformation = await (await this.fetch(`${url}/oauth/token`, {
            method: 'POST',
            body: form,
        })).json();
        const personalInformation = await (await this.fetch(`${url}/api/v1/accounts/verify_credentials`, {
            headers: {
                Authorization: `Bearer ${tokenInformation.access_token}`,
            },
        })).json();
        return {
            id: personalInformation.id,
            name: personalInformation.display_name || personalInformation.acct,
            accessToken: tokenInformation.access_token,
            refreshToken: 'null',
            expiresIn: (0, dayjs_1.default)().add(100, 'years').unix() - (0, dayjs_1.default)().unix(),
            picture: personalInformation.avatar,
            username: personalInformation.username,
        };
    }
    async authenticate(params) {
        return this.dynamicAuthenticate(process.env.MASTODON_CLIENT_ID, process.env.MASTODON_CLIENT_SECRET, 'https://mastodon.social', params.code);
    }
    async uploadFile(instanceUrl, fileUrl, accessToken) {
        const form = new FormData();
        form.append('file', await fetch(fileUrl).then((r) => r.blob()));
        const media = await (await this.fetch(`${instanceUrl}/api/v1/media`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            body: form,
        })).json();
        return media.id;
    }
    async dynamicPost(id, accessToken, url, postDetails) {
        let loadId = '';
        const ids = [];
        for (const getPost of postDetails) {
            const uploadFiles = await Promise.all(getPost?.media?.map((media) => this.uploadFile(url, media.url, accessToken)) || []);
            const form = new FormData();
            form.append('status', getPost.message);
            form.append('visibility', 'public');
            if (loadId) {
                form.append('in_reply_to_id', loadId);
            }
            if (uploadFiles.length) {
                for (const file of uploadFiles) {
                    form.append('media_ids[]', file);
                }
            }
            const post = await (await this.fetch(`${url}/api/v1/statuses`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: form,
            })).json();
            ids.push(post.id);
            loadId = loadId || post.id;
        }
        return postDetails.map((p, i) => ({
            id: p.id,
            postId: ids[i],
            releaseURL: `${url}/statuses/${ids[i]}`,
            status: 'completed',
        }));
    }
    async post(id, accessToken, postDetails) {
        return this.dynamicPost(id, accessToken, 'https://mastodon.social', postDetails);
    }
}
exports.MastodonProvider = MastodonProvider;


/***/ }),
/* 90 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BlueskyProvider = void 0;
const tslib_1 = __webpack_require__(3);
const make_is_1 = __webpack_require__(27);
const social_abstract_1 = __webpack_require__(65);
const api_1 = __webpack_require__(91);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
const client_1 = __webpack_require__(11);
const auth_service_1 = __webpack_require__(23);
const sharp_1 = tslib_1.__importDefault(__webpack_require__(62));
const plug_decorator_1 = __webpack_require__(67);
const timer_1 = __webpack_require__(66);
const axios_1 = tslib_1.__importDefault(__webpack_require__(53));
async function reduceImageBySize(url, maxSizeKB = 976) {
    try {
        // Fetch the image from the URL
        const response = await axios_1.default.get(url, { responseType: 'arraybuffer' });
        let imageBuffer = Buffer.from(response.data);
        // Use sharp to get the metadata of the image
        const metadata = await (0, sharp_1.default)(imageBuffer).metadata();
        let width = metadata.width;
        let height = metadata.height;
        // Resize iteratively until the size is below the threshold
        while (imageBuffer.length / 1024 > maxSizeKB) {
            width = Math.floor(width * 0.9); // Reduce dimensions by 10%
            height = Math.floor(height * 0.9);
            // Resize the image
            const resizedBuffer = await (0, sharp_1.default)(imageBuffer)
                .resize({ width, height })
                .toBuffer();
            imageBuffer = resizedBuffer;
            if (width < 10 || height < 10)
                break; // Prevent overly small dimensions
        }
        return imageBuffer;
    }
    catch (error) {
        console.error('Error processing image:', error);
        throw error;
    }
}
class BlueskyProvider extends social_abstract_1.SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'bluesky';
        this.name = 'Bluesky';
        this.isBetweenSteps = false;
        this.scopes = ['write:statuses', 'profile', 'write:media'];
    }
    async customFields() {
        return [
            {
                key: 'service',
                label: 'Service',
                defaultValue: 'https://bsky.social',
                validation: `/^(https?:\\/\\/)?((([a-zA-Z0-9\\-_]{1,256}\\.[a-zA-Z]{2,6})|(([0-9]{1,3}\\.){3}[0-9]{1,3}))(:[0-9]{1,5})?)(\\/[^\\s]*)?$/`,
                type: 'text',
            },
            {
                key: 'identifier',
                label: 'Identifier',
                validation: `/^.{3,}$/`,
                type: 'text',
            },
            {
                key: 'password',
                label: 'Password',
                validation: `/^.{3,}$/`,
                type: 'password',
            },
        ];
    }
    async refreshToken(refreshToken) {
        return {
            refreshToken: '',
            expiresIn: 0,
            accessToken: '',
            id: '',
            name: '',
            picture: '',
            username: '',
        };
    }
    async generateAuthUrl() {
        const state = (0, make_is_1.makeId)(6);
        return {
            url: '',
            codeVerifier: (0, make_is_1.makeId)(10),
            state,
        };
    }
    async authenticate(params) {
        const body = JSON.parse(Buffer.from(params.code, 'base64').toString());
        try {
            const agent = new api_1.BskyAgent({
                service: body.service,
            });
            const { data: { accessJwt, refreshJwt, handle, did }, } = await agent.login({
                identifier: body.identifier,
                password: body.password,
            });
            const profile = await agent.getProfile({
                actor: did,
            });
            return {
                refreshToken: refreshJwt,
                expiresIn: (0, dayjs_1.default)().add(100, 'years').unix() - (0, dayjs_1.default)().unix(),
                accessToken: accessJwt,
                id: did,
                name: profile.data.displayName,
                picture: profile.data.avatar,
                username: profile.data.handle,
            };
        }
        catch (e) {
            return 'Invalid credentials';
        }
    }
    async post(id, accessToken, postDetails, integration) {
        const body = JSON.parse(auth_service_1.AuthService.fixedDecryption(integration.customInstanceDetails));
        const agent = new api_1.BskyAgent({
            service: body.service,
        });
        await agent.login({
            identifier: body.identifier,
            password: body.password,
        });
        let loadCid = '';
        let loadUri = '';
        const cidUrl = [];
        for (const post of postDetails) {
            const images = await Promise.all(post.media?.map(async (p) => {
                return await agent.uploadBlob(new Blob([await reduceImageBySize(p.url)]));
            }) || []);
            const rt = new api_1.RichText({
                text: post.message,
            });
            await rt.detectFacets(agent);
            // @ts-ignore
            const { cid, uri, commit } = await agent.post({
                text: rt.text,
                facets: rt.facets,
                createdAt: new Date().toISOString(),
                ...(images.length
                    ? {
                        embed: {
                            $type: 'app.bsky.embed.images',
                            images: images.map((p) => ({
                                // can be an array up to 4 values
                                alt: 'image', // the alt text
                                image: p.data.blob,
                            })),
                        },
                    }
                    : {}),
                ...(loadCid
                    ? {
                        reply: {
                            root: {
                                uri: loadUri,
                                cid: loadCid,
                            },
                            parent: {
                                uri: loadUri,
                                cid: loadCid,
                            },
                        },
                    }
                    : {}),
            });
            loadCid = loadCid || cid;
            loadUri = loadUri || uri;
            cidUrl.push({ cid, url: uri, rev: commit.rev });
        }
        return postDetails.map((p, index) => ({
            id: p.id,
            postId: cidUrl[index].url,
            status: 'completed',
            releaseURL: `https://bsky.app/profile/${id}/post/${cidUrl[index].url
                .split('/')
                .pop()}`,
        }));
    }
    async autoRepostPost(integration, id, fields) {
        const body = JSON.parse(auth_service_1.AuthService.fixedDecryption(integration.customInstanceDetails));
        const agent = new api_1.BskyAgent({
            service: body.service,
        });
        await agent.login({
            identifier: body.identifier,
            password: body.password,
        });
        const getThread = await agent.getPostThread({
            uri: id,
            depth: 0,
        });
        // @ts-ignore
        if (getThread.data.thread.post?.likeCount >= +fields.likesAmount) {
            await (0, timer_1.timer)(2000);
            await agent.repost(
            // @ts-ignore
            getThread.data.thread.post?.uri, 
            // @ts-ignore
            getThread.data.thread.post?.cid);
            return true;
        }
        return true;
    }
    async autoPlugPost(integration, id, fields) {
        const body = JSON.parse(auth_service_1.AuthService.fixedDecryption(integration.customInstanceDetails));
        const agent = new api_1.BskyAgent({
            service: body.service,
        });
        await agent.login({
            identifier: body.identifier,
            password: body.password,
        });
        const getThread = await agent.getPostThread({
            uri: id,
            depth: 0,
        });
        // @ts-ignore
        if (getThread.data.thread.post?.likeCount >= +fields.likesAmount) {
            await (0, timer_1.timer)(2000);
            const rt = new api_1.RichText({
                text: fields.post,
            });
            await agent.post({
                text: rt.text,
                facets: rt.facets,
                createdAt: new Date().toISOString(),
                reply: {
                    root: {
                        // @ts-ignore
                        uri: getThread.data.thread.post?.uri,
                        // @ts-ignore
                        cid: getThread.data.thread.post?.cid,
                    },
                    parent: {
                        // @ts-ignore
                        uri: getThread.data.thread.post?.uri,
                        // @ts-ignore
                        cid: getThread.data.thread.post?.cid,
                    },
                },
            });
            return true;
        }
        return true;
    }
}
exports.BlueskyProvider = BlueskyProvider;
tslib_1.__decorate([
    (0, plug_decorator_1.Plug)({
        identifier: 'bluesky-autoRepostPost',
        title: 'Auto Repost Posts',
        description: 'When a post reached a certain number of likes, repost it to increase engagement (1 week old posts)',
        runEveryMilliseconds: 21600000,
        totalRuns: 3,
        fields: [
            {
                name: 'likesAmount',
                type: 'number',
                placeholder: 'Amount of likes',
                description: 'The amount of likes to trigger the repost',
                validation: /^\d+$/,
            },
        ],
    }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof client_1.Integration !== "undefined" && client_1.Integration) === "function" ? _a : Object, String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], BlueskyProvider.prototype, "autoRepostPost", null);
tslib_1.__decorate([
    (0, plug_decorator_1.Plug)({
        identifier: 'bluesky-autoPlugPost',
        title: 'Auto plug post',
        description: 'When a post reached a certain number of likes, add another post to it so you followers get a notification about your promotion',
        runEveryMilliseconds: 21600000,
        totalRuns: 3,
        fields: [
            {
                name: 'likesAmount',
                type: 'number',
                placeholder: 'Amount of likes',
                description: 'The amount of likes to trigger the repost',
                validation: /^\d+$/,
            },
            {
                name: 'post',
                type: 'richtext',
                placeholder: 'Post to plug',
                description: 'Message content to plug',
                validation: /^[\s\S]{3,}$/g,
            },
        ],
    }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_b = typeof client_1.Integration !== "undefined" && client_1.Integration) === "function" ? _b : Object, String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], BlueskyProvider.prototype, "autoPlugPost", null);


/***/ }),
/* 91 */
/***/ ((module) => {

module.exports = require("@atproto/api");

/***/ }),
/* 92 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LemmyProvider = void 0;
const tslib_1 = __webpack_require__(3);
const make_is_1 = __webpack_require__(27);
const social_abstract_1 = __webpack_require__(65);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
const auth_service_1 = __webpack_require__(23);
const lodash_1 = __webpack_require__(12);
class LemmyProvider extends social_abstract_1.SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'lemmy';
        this.name = 'Lemmy';
        this.isBetweenSteps = false;
        this.scopes = [];
    }
    async customFields() {
        return [
            {
                key: 'service',
                label: 'Service',
                defaultValue: 'https://lemmy.world',
                validation: `/^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$/`,
                type: 'text',
            },
            {
                key: 'identifier',
                label: 'Identifier',
                validation: `/^.{3,}$/`,
                type: 'text',
            },
            {
                key: 'password',
                label: 'Password',
                validation: `/^.{3,}$/`,
                type: 'password',
            },
        ];
    }
    async refreshToken(refreshToken) {
        return {
            refreshToken: '',
            expiresIn: 0,
            accessToken: '',
            id: '',
            name: '',
            picture: '',
            username: '',
        };
    }
    async generateAuthUrl() {
        const state = (0, make_is_1.makeId)(6);
        return {
            url: '',
            codeVerifier: (0, make_is_1.makeId)(10),
            state,
        };
    }
    async authenticate(params) {
        const body = JSON.parse(Buffer.from(params.code, 'base64').toString());
        const load = await fetch(body.service + '/api/v3/user/login', {
            body: JSON.stringify({
                username_or_email: body.identifier,
                password: body.password,
            }),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (load.status === 401) {
            return 'Invalid credentials';
        }
        const { jwt } = await load.json();
        try {
            const user = await (await fetch(body.service + `/api/v3/user?username=${body.identifier}`, {
                headers: {
                    Authorization: `Bearer ${jwt}`,
                },
            })).json();
            return {
                refreshToken: jwt,
                expiresIn: (0, dayjs_1.default)().add(100, 'years').unix() - (0, dayjs_1.default)().unix(),
                accessToken: jwt,
                id: String(user.person_view.person.id),
                name: user.person_view.person.display_name ||
                    user.person_view.person.name ||
                    '',
                picture: user.person_view.person.avatar || '',
                username: body.identifier || '',
            };
        }
        catch (e) {
            console.log(e);
            return 'Invalid credentials';
        }
    }
    async post(id, accessToken, postDetails, integration) {
        const [firstPost, ...restPosts] = postDetails;
        const body = JSON.parse(auth_service_1.AuthService.fixedDecryption(integration.customInstanceDetails));
        const { jwt } = await (await fetch(body.service + '/api/v3/user/login', {
            body: JSON.stringify({
                username_or_email: body.identifier,
                password: body.password,
            }),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        })).json();
        const valueArray = [];
        for (const lemmy of firstPost.settings.subreddit) {
            const { post_view, ...all } = await (await fetch(body.service + '/api/v3/post', {
                body: JSON.stringify({
                    community_id: +lemmy.value.id,
                    name: lemmy.value.title,
                    body: firstPost.message,
                    ...(lemmy.value.url ? { url: lemmy.value.url } : {}),
                    ...(firstPost.media?.length
                        ? { custom_thumbnail: firstPost.media[0].url }
                        : {}),
                    nsfw: false,
                }),
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${jwt}`,
                    'Content-Type': 'application/json',
                },
            })).json();
            valueArray.push({
                postId: post_view.post.id,
                releaseURL: body.service + '/post/' + post_view.post.id,
                id: firstPost.id,
                status: 'published',
            });
            for (const comment of restPosts) {
                const { comment_view } = await (await fetch(body.service + '/api/v3/comment', {
                    body: JSON.stringify({
                        post_id: post_view.post.id,
                        content: comment.message,
                    }),
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${jwt}`,
                        'Content-Type': 'application/json',
                    },
                })).json();
                valueArray.push({
                    postId: comment_view.post.id,
                    releaseURL: body.service + '/comment/' + comment_view.comment.id,
                    id: comment.id,
                    status: 'published',
                });
            }
        }
        return Object.values((0, lodash_1.groupBy)(valueArray, (p) => p.id)).map((p) => ({
            id: p[0].id,
            postId: p.map((p) => String(p.postId)).join(','),
            releaseURL: p.map((p) => p.releaseURL).join(','),
            status: 'published',
        }));
    }
    async subreddits(accessToken, data, id, integration) {
        const body = JSON.parse(auth_service_1.AuthService.fixedDecryption(integration.customInstanceDetails));
        const { jwt } = await (await fetch(body.service + '/api/v3/user/login', {
            body: JSON.stringify({
                username_or_email: body.identifier,
                password: body.password,
            }),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        })).json();
        const { communities } = await (await fetch(body.service +
            `/api/v3/search?type_=Communities&sort=Active&q=${data.word}`, {
            headers: {
                Authorization: `Bearer ${jwt}`,
            },
        })).json();
        return communities.map((p) => ({
            title: p.community.title,
            name: p.community.title,
            id: p.community.id,
        }));
    }
}
exports.LemmyProvider = LemmyProvider;


/***/ }),
/* 93 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.InstagramStandaloneProvider = void 0;
const tslib_1 = __webpack_require__(3);
const make_is_1 = __webpack_require__(27);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
const social_abstract_1 = __webpack_require__(65);
const instagram_provider_1 = __webpack_require__(77);
const instagramProvider = new instagram_provider_1.InstagramProvider();
class InstagramStandaloneProvider extends social_abstract_1.SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'instagram-standalone';
        this.name = 'Instagram\n(Standalone)';
        this.isBetweenSteps = false;
        this.scopes = [
            'instagram_business_basic',
            'instagram_business_content_publish',
            'instagram_business_manage_comments',
        ];
        this.toolTip = 'Standalone does not support insights or tagging';
        this.config = {
            INSTAGRAM_APP_ID: process.env.INSTAGRAM_APP_ID || '',
            INSTAGRAM_APP_SECRET: process.env.INSTAGRAM_APP_SECRET || '',
        };
    }
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    getConfig() {
        return this.config;
    }
    async refreshToken(refresh_token) {
        return {
            refreshToken: '',
            expiresIn: 0,
            accessToken: '',
            id: '',
            name: '',
            picture: '',
            username: '',
        };
    }
    async generateAuthUrl(clientInformation, customerId) {
        // const state = makeId(6);
        const state = `customerId:${customerId},uniqueState:${(0, make_is_1.makeId)(6)}`;
        return {
            url: `https://www.instagram.com/oauth/authorize?enable_fb_login=0&client_id=${this.config.INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(`${process?.env.FRONTEND_URL?.indexOf('https') == -1
                ? `https://redirectmeto.com/${process?.env.FRONTEND_URL}`
                : `${process?.env.FRONTEND_URL}`}/integrations/social/instagram-standalone`)}&response_type=code&scope=${encodeURIComponent(this.scopes.join(','))}` +
                // `&state=${state}`,
                `&state=${encodeURIComponent(state)}`,
            codeVerifier: (0, make_is_1.makeId)(10),
            state,
        };
    }
    async authenticate(params) {
        const formData = new FormData();
        formData.append('client_id', this.config.INSTAGRAM_APP_ID);
        formData.append('client_secret', this.config.INSTAGRAM_APP_SECRET);
        formData.append('grant_type', 'authorization_code');
        formData.append('redirect_uri', `${process?.env.FRONTEND_URL?.indexOf('https') == -1
            ? `https://redirectmeto.com/${process?.env.FRONTEND_URL}`
            : `${process?.env.FRONTEND_URL}`}/integrations/social/instagram-standalone`);
        formData.append('code', params.code);
        const getAccessToken = await (await this.fetch('https://api.instagram.com/oauth/access_token', {
            method: 'POST',
            body: formData,
        })).json();
        const { access_token, expires_in, ...all } = await (await this.fetch('https://graph.instagram.com/access_token' +
            '?grant_type=ig_exchange_token' +
            `&client_id=${this.config.INSTAGRAM_APP_ID}` +
            `&client_secret=${this.config.INSTAGRAM_APP_SECRET}` +
            `&access_token=${getAccessToken.access_token}`)).json();
        this.checkScopes(this.scopes, getAccessToken.permissions);
        const { user_id, name, username, profile_picture_url, } = await (await this.fetch(`https://graph.instagram.com/v21.0/me?fields=user_id,username,name,profile_picture_url&access_token=${access_token}`)).json();
        return {
            id: user_id,
            name,
            accessToken: access_token,
            refreshToken: access_token,
            expiresIn: (0, dayjs_1.default)().add(59, 'days').unix() - (0, dayjs_1.default)().unix(),
            picture: profile_picture_url,
            username,
        };
    }
    async post(id, accessToken, postDetails, integration) {
        return instagramProvider.post(id, accessToken, postDetails, integration, 'graph.instagram.com');
    }
}
exports.InstagramStandaloneProvider = InstagramStandaloneProvider;


/***/ }),
/* 94 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SocialMediaPlatformConfigService = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const social_media_platform_config_repository_1 = __webpack_require__(95);
let SocialMediaPlatformConfigService = class SocialMediaPlatformConfigService {
    constructor(_socialMediaPlatformConfigRepository) {
        this._socialMediaPlatformConfigRepository = _socialMediaPlatformConfigRepository;
    }
    getPlatformConfigList(orgId, customerId) {
        return this._socialMediaPlatformConfigRepository.getPlatformConfigList(orgId, customerId);
    }
    getPlatformConfig(platformKey, orgId, customerId) {
        return this._socialMediaPlatformConfigRepository.getPlatformConfig(platformKey, orgId, customerId);
    }
    async updatePlatformConfig(platformKey, orgId, body) {
        const config = await this._socialMediaPlatformConfigRepository.updatePlatformConfig(platformKey, orgId, body);
        return config;
    }
};
exports.SocialMediaPlatformConfigService = SocialMediaPlatformConfigService;
exports.SocialMediaPlatformConfigService = SocialMediaPlatformConfigService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof social_media_platform_config_repository_1.SocialMediaPlatformConfigRepository !== "undefined" && social_media_platform_config_repository_1.SocialMediaPlatformConfigRepository) === "function" ? _a : Object])
], SocialMediaPlatformConfigService);


/***/ }),
/* 95 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SocialMediaPlatformConfigRepository = void 0;
const tslib_1 = __webpack_require__(3);
const prisma_service_1 = __webpack_require__(10);
const common_1 = __webpack_require__(4);
let SocialMediaPlatformConfigRepository = class SocialMediaPlatformConfigRepository {
    constructor(_socialMediaPlatformConfig) {
        this._socialMediaPlatformConfig = _socialMediaPlatformConfig;
    }
    // Method to update or create the platform config
    async updatePlatformConfig(platformKey, orgId, body) {
        const { platform, config, customerId } = body;
        // Check for an existing config using the compound unique key
        const existingConfig = await this._socialMediaPlatformConfig.model.socialMediaPlatformConfig.findFirst({
            where: {
                platformKey: platformKey,
                organizationId: orgId,
                customerId: customerId,
            },
        });
        if (existingConfig) {
            // Update the existing config
            return this._socialMediaPlatformConfig.model.socialMediaPlatformConfig.update({
                where: {
                    id: existingConfig.id,
                },
                data: {
                    platform,
                    config: {
                        upsert: config.map((item) => ({
                            where: {
                                key_configId: {
                                    key: item.key,
                                    configId: existingConfig.id,
                                },
                            },
                            update: {
                                value: item.value,
                            },
                            create: {
                                key: item.key,
                                value: item.value,
                            },
                        })),
                    },
                },
                include: {
                    config: true, // Include the updated config items
                },
            });
        }
        else {
            // Create a new config
            return this._socialMediaPlatformConfig.model.socialMediaPlatformConfig.create({
                data: {
                    platform,
                    platformKey,
                    organizationId: orgId,
                    customerId: customerId,
                    config: {
                        create: config.map((item) => ({
                            key: item.key,
                            value: item.value,
                        })),
                    },
                },
                include: {
                    config: true, // Include the newly created config items
                },
            });
        }
    }
    // Method to fetch the platform config
    async getPlatformConfig(platformKey, organizationId, customerId) {
        return this._socialMediaPlatformConfig.model.socialMediaPlatformConfig.findFirst({
            where: {
                platformKey,
                organizationId,
                customerId
            },
            include: {
                config: true, // Include associated config items
            },
        });
    }
    // Method to fetch the platform config
    async getPlatformConfigList(organizationId, customerId) {
        return this._socialMediaPlatformConfig.model.socialMediaPlatformConfig.findMany({
            where: {
                organizationId, // Filter by organization ID
                customerId,
            },
            include: {
                config: true, // Include associated config items
            }
        });
    }
};
exports.SocialMediaPlatformConfigRepository = SocialMediaPlatformConfigRepository;
exports.SocialMediaPlatformConfigRepository = SocialMediaPlatformConfigRepository = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _a : Object])
], SocialMediaPlatformConfigRepository);


/***/ }),
/* 96 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FarcasterProvider = void 0;
const tslib_1 = __webpack_require__(3);
const make_is_1 = __webpack_require__(27);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
const social_abstract_1 = __webpack_require__(65);
const nodejs_sdk_1 = __webpack_require__(97);
const lodash_1 = __webpack_require__(12);
const client = new nodejs_sdk_1.NeynarAPIClient({
    apiKey: process.env.NEYNAR_SECRET_KEY || '00000000-000-0000-000-000000000000',
});
class FarcasterProvider extends social_abstract_1.SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'wrapcast';
        this.name = 'Warpcast';
        this.isBetweenSteps = false;
        this.isWeb3 = true;
        this.scopes = [];
    }
    async refreshToken(refresh_token) {
        return {
            refreshToken: '',
            expiresIn: 0,
            accessToken: '',
            id: '',
            name: '',
            picture: '',
            username: '',
        };
    }
    async generateAuthUrl() {
        const state = (0, make_is_1.makeId)(17);
        return {
            url: `${process.env.NEYNAR_CLIENT_ID}||${state}` || '',
            codeVerifier: (0, make_is_1.makeId)(10),
            state,
        };
    }
    async authenticate(params) {
        const data = JSON.parse(Buffer.from(params.code, 'base64').toString());
        return {
            id: String(data.fid),
            name: data.display_name,
            accessToken: data.signer_uuid,
            refreshToken: '',
            expiresIn: (0, dayjs_1.default)().add(200, 'year').unix() - (0, dayjs_1.default)().unix(),
            picture: data.pfp_url,
            username: data.username,
        };
    }
    async post(id, accessToken, postDetails) {
        const ids = [];
        const subreddit = !postDetails?.[0]?.settings?.subreddit ||
            postDetails?.[0]?.settings?.subreddit.length === 0
            ? [undefined]
            : postDetails?.[0]?.settings?.subreddit;
        for (const channel of subreddit) {
            let idHash = '';
            for (const post of postDetails) {
                const data = await client.publishCast({
                    embeds: post?.media?.map((media) => ({
                        url: media.url,
                    })) || [],
                    signerUuid: accessToken,
                    text: post.message,
                    ...(idHash ? { parent: idHash } : {}),
                    ...(channel?.value?.id ? { channelId: channel?.value?.id } : {}),
                });
                idHash = data.cast.hash;
                ids.push({
                    // @ts-ignore
                    releaseURL: `https://warpcast.com/${data.cast.author.username}/${idHash}`,
                    status: 'success',
                    id: post.id,
                    postId: data.cast.hash,
                    // @ts-ignore
                    author: data.cast.author.username,
                });
            }
        }
        const list = Object.values((0, lodash_1.groupBy)(ids, (p) => p.id)).map((p) => ({
            id: p[0].id,
            postId: p.map((p) => String(p.postId)).join(','),
            releaseURL: p.map((p) => p.releaseURL).join(','),
            status: 'published',
        }));
        return list;
    }
    async subreddits(accessToken, data, id, integration) {
        const search = await client.searchChannels({
            q: data.word,
            limit: 10,
        });
        return search.channels.map((p) => {
            return {
                title: p.name,
                name: p.name,
                id: p.id,
            };
        });
    }
}
exports.FarcasterProvider = FarcasterProvider;


/***/ }),
/* 97 */
/***/ ((module) => {

module.exports = require("@neynar/nodejs-sdk");

/***/ }),
/* 98 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TelegramProvider = void 0;
const tslib_1 = __webpack_require__(3);
const make_is_1 = __webpack_require__(27);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
const social_abstract_1 = __webpack_require__(65);
const node_telegram_bot_api_1 = tslib_1.__importDefault(__webpack_require__(99));
const telegramBot = new node_telegram_bot_api_1.default(process.env.TELEGRAM_TOKEN);
class TelegramProvider extends social_abstract_1.SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'telegram';
        this.name = 'Telegram';
        this.isBetweenSteps = false;
        this.isWeb3 = true;
        this.scopes = [];
    }
    async refreshToken(refresh_token) {
        return {
            refreshToken: '',
            expiresIn: 0,
            accessToken: '',
            id: '',
            name: '',
            picture: '',
            username: '',
        };
    }
    async generateAuthUrl() {
        const state = (0, make_is_1.makeId)(17);
        return {
            url: state,
            codeVerifier: (0, make_is_1.makeId)(10),
            state,
        };
    }
    async authenticate(params) {
        const chat = await telegramBot.getChat(params.code);
        console.log(JSON.stringify(chat));
        if (!chat?.id) {
            return 'No chat found';
        }
        const photo = !chat?.photo?.big_file_id
            ? ''
            : await telegramBot.getFileLink(chat.photo.big_file_id);
        return {
            id: String(chat.username),
            name: chat.title,
            accessToken: String(chat.id),
            refreshToken: '',
            expiresIn: (0, dayjs_1.default)().add(200, 'year').unix() - (0, dayjs_1.default)().unix(),
            picture: photo,
            username: chat.username,
        };
    }
    async getBotId(query) {
        const res = await telegramBot.getUpdates({
            ...(query.id ? { offset: query.id } : {}),
        });
        const chatId = res?.find((p) => p?.message?.text === `/connect ${query.word}`)?.message?.chat?.id;
        return chatId
            ? {
                chatId,
            }
            : res.length > 0
                ? {
                    lastChatId: res?.[res.length - 1]?.message?.chat?.id,
                }
                : {};
    }
    async post(id, accessToken, postDetails) {
        const ids = [];
        for (const message of postDetails) {
            if ((message?.media?.length || 0) === 1) {
                const [{ message_id }] = await telegramBot.sendMediaGroup(accessToken, message?.media?.map((m) => ({
                    type: m.url.indexOf('mp4') > -1 ? 'video' : 'photo',
                    caption: message.message,
                    media: m.url,
                })) || []);
                ids.push({
                    id: message.id,
                    postId: String(message_id),
                    releaseURL: `https://t.me/${id}/${message_id}`,
                    status: 'completed',
                });
            }
            else {
                const { message_id } = await telegramBot.sendMessage(accessToken, message.message);
                ids.push({
                    id: message.id,
                    postId: String(message_id),
                    releaseURL: `https://t.me/${id}/${message_id}`,
                    status: 'completed',
                });
                if ((message?.media?.length || 0) > 0) {
                    await telegramBot.sendMediaGroup(accessToken, message?.media?.map((m) => ({
                        type: m.url.indexOf('mp4') > -1 ? 'video' : 'photo',
                        media: m.url,
                    })) || []);
                }
            }
        }
        return ids;
    }
}
exports.TelegramProvider = TelegramProvider;


/***/ }),
/* 99 */
/***/ ((module) => {

module.exports = require("node-telegram-bot-api");

/***/ }),
/* 100 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CustomersRepository = void 0;
const tslib_1 = __webpack_require__(3);
const prisma_service_1 = __webpack_require__(10);
const common_1 = __webpack_require__(4);
let CustomersRepository = class CustomersRepository {
    constructor(_customerRepository) {
        this._customerRepository = _customerRepository;
    }
    async getCustomerList(orgId) {
        return this._customerRepository.model.customer.findMany({
            where: {
                orgId,
            }
        });
    }
    async createCustomer(body, orgId) {
        return this._customerRepository.model.customer.create({
            data: { ...body },
        });
    }
    async getCustomerById(id, orgId) {
        return this._customerRepository.model.customer.findFirst({
            where: {
                orgId: orgId,
                id: id,
            }
        });
    }
    async getCustomerByPKId(id) {
        return this._customerRepository.model.customer.findFirst({
            where: {
                id: id
            }
        });
    }
    async updateCustomer(id, body, orgId) {
        return this._customerRepository.model.customer.update({
            where: {
                id: id,
                orgId: orgId,
            },
            data: { ...body },
        });
    }
    async deleteCustomer(id, orgId) {
        return this._customerRepository.model.customer.deleteMany({
            where: {
                id: id,
                orgId: orgId,
            },
        });
    }
};
exports.CustomersRepository = CustomersRepository;
exports.CustomersRepository = CustomersRepository = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _a : Object])
], CustomersRepository);


/***/ }),
/* 101 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GbpProvider = void 0;
const tslib_1 = __webpack_require__(3);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
const googleapis_1 = __webpack_require__(79);
const customers_repository_1 = __webpack_require__(100);
const common_1 = __webpack_require__(4);
const make_is_1 = __webpack_require__(27);
let GbpProvider = class GbpProvider {
    constructor(_customersRepository) {
        this._customersRepository = _customersRepository;
        this.currentCustomerId = '';
        this.currentOrgId = '';
        this.currentCustomerName = '';
        this.identifier = 'gbp';
        this.name = 'Google Business Profile';
        this.toolTip = 'Connect your Google Business Profile account to manage your business listings';
        this.isWeb3 = false;
        this.oneTimeToken = false;
        this.isBetweenSteps = false;
        this.scopes = ['https://www.googleapis.com/auth/business.manage'];
        this.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
        this.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
        this.REDIRECT_URI = `${process.env.FRONTEND_URL}/integrations/social/gbp`;
    }
    async generateAuthUrl(clientInformation, customerId) {
        const oauth2Client = new googleapis_1.google.auth.OAuth2(this.GOOGLE_CLIENT_ID, this.GOOGLE_CLIENT_SECRET, this.REDIRECT_URI);
        console.log("customerId", customerId);
        // Store in class properties
        this.currentCustomerId = customerId;
        try {
            const customer = await this._customersRepository.getCustomerByPKId(customerId);
            this.currentOrgId = customer?.orgId || '';
            this.currentCustomerName = customer?.name || 'GBP User';
        }
        catch (e) {
            console.error('Error fetching customer details:', e);
            this.currentOrgId = '';
            this.currentCustomerName = 'GBP User';
        }
        const state = `customerId:${customerId},uniqueState:${(0, make_is_1.makeId)(6)}`;
        // const encodedState = encodeURIComponent(JSON.stringify(state));
        // const encodedState = 
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: this.scopes,
            prompt: 'consent',
            state: encodeURIComponent((state)),
            include_granted_scopes: true,
        });
        return {
            url,
            codeVerifier: (0, make_is_1.makeId)(11),
            // state,
            state: encodeURIComponent((state)),
            // state // Return raw state to frontend (not encoded)
        };
    }
    async authenticate(params) {
        if (!params.code) {
            return 'Missing authorization code';
        }
        // Verify state (minimal verification)
        // try {
        //   const state = JSON.parse(decodeURIComponent(params.state));
        //   if (!state.uniqueState || !state.timestamp) {
        //     return 'Invalid state format';
        //   }
        //   // Optional: Add timestamp validation (e.g., not older than 10 minutes)
        // } catch (e) {
        //   return 'Invalid state parameter';
        // }
        const oauth2Client = new googleapis_1.google.auth.OAuth2(this.GOOGLE_CLIENT_ID, this.GOOGLE_CLIENT_SECRET, this.REDIRECT_URI);
        try {
            // Exchange code for tokens
            const tokenResponse = await oauth2Client.getToken(params.code);
            const tokens = {
                access_token: tokenResponse.tokens.access_token,
                refresh_token: tokenResponse.tokens.refresh_token || '',
                expiry_date: tokenResponse.tokens.expiry_date || Date.now() + 3600 * 1000
            };
            oauth2Client.setCredentials({ access_token: tokens.access_token });
            // Get account info
            const accountManagement = googleapis_1.google.mybusinessaccountmanagement({
                version: 'v1',
                auth: oauth2Client,
            });
            const { data: accountsData } = await accountManagement.accounts.list();
            const account = accountsData.accounts?.[0];
            if (!account?.name) {
                return 'No Google Business Profile account found';
            }
            // Get locations using class property
            const locations = await this._getAllLocations(oauth2Client, account.name);
            if (locations.length === 0) {
                return 'No business locations found for this account';
            }
            // Use class property for matching
            const location = this._findMatchingLocation(locations, this.currentCustomerName);
            if (!location) {
                return `No matching business location found for "${this.currentCustomerName}"`;
            }
            return {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresIn: Math.floor((tokens.expiry_date - Date.now()) / 1000),
                id: location.name,
                name: location.title || 'Google Business Profile',
                picture: location.profile?.profileImageUri || location.profile?.photoUri || '',
                username: (location.title || 'gbp').toLowerCase().replace(/\s+/g, '_'),
                additionalSettings: [
                    {
                        title: 'Business Location',
                        value: location.title,
                        type: 'text',
                        description: 'Google Business Profile location'
                    },
                    {
                        title: 'Customer ID',
                        value: this.currentCustomerId,
                        type: 'text',
                        description: 'Associated customer ID'
                    },
                    {
                        title: 'Organization ID',
                        value: this.currentOrgId || '',
                        type: 'text',
                        description: 'Associated organization ID'
                    },
                    {
                        title: 'Location ID',
                        value: location.name?.split('/').pop() || '',
                        type: 'text',
                        description: 'Google Business Location ID'
                    }
                ]
            };
        }
        catch (err) {
            console.error('GBP Authentication Error:', err);
            return err instanceof Error && err.message.includes('invalid_grant')
                ? 'Invalid authorization code. Please try again.'
                : 'An unexpected error occurred during authentication';
        }
    }
    async refreshToken(refreshToken) {
        const oauth2Client = new googleapis_1.google.auth.OAuth2(this.GOOGLE_CLIENT_ID, this.GOOGLE_CLIENT_SECRET);
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        const { credentials } = await oauth2Client.refreshAccessToken();
        return {
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token || refreshToken,
            expiresIn: credentials.expiry_date
                ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
                : (0, dayjs_1.default)().add(1, 'hour').unix(),
            id: '',
            name: '',
            picture: '',
            username: '',
            additionalSettings: [],
        };
    }
    async post(id, accessToken, postDetails, integration) {
        const oauth2Client = new googleapis_1.google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const businessInfo = googleapis_1.google.mybusinessbusinessinformation({
            version: 'v1',
            auth: oauth2Client,
        });
        // Get location to post to
        const locations = await this._getAllLocations(oauth2Client, id);
        const location = locations[0];
        if (!location) {
            throw new Error('No GBP location found for this account');
        }
        const message = postDetails[0]?.message || 'Posted via GBP';
        const response = await fetch(`https://mybusiness.googleapis.com/v4/${location.name}/localPosts`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                languageCode: 'en-US',
                summary: message,
                topicType: 'STANDARD',
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create GBP post: ${errorText}`);
        }
        const postRes = await response.json();
        const postId = postRes.name || 'unknown';
        return [{
                id: postId,
                postId: postId,
                releaseURL: `https://business.google.com/posts/l/${location.name?.split('/').pop()}`,
                status: 'success',
            }];
    }
    async _getAllLocations(auth, accountName) {
        const businessInfo = googleapis_1.google.mybusinessbusinessinformation({
            version: 'v1',
            auth: auth,
        });
        let allLocations = [];
        let pageToken = undefined;
        do {
            try {
                const { data } = await businessInfo.accounts.locations.list({
                    parent: accountName,
                    readMask: 'name,title,profile',
                    pageSize: 100,
                    pageToken: pageToken,
                });
                if (data.locations) {
                    allLocations = allLocations.concat(data.locations);
                }
                pageToken = data.nextPageToken || undefined;
            }
            catch (error) {
                console.error('Error fetching locations:', error);
                break;
            }
        } while (pageToken);
        return allLocations;
    }
    _findMatchingLocation(locations, customerName) {
        if (!customerName)
            return null;
        return locations.find(loc => {
            const cleanCustomerName = customerName.toLowerCase().trim();
            const cleanLocationName = loc.title.toLowerCase().trim();
            if (cleanLocationName === cleanCustomerName) {
                return true;
            }
            if (cleanLocationName.includes(cleanCustomerName)) {
                return true;
            }
            // if (loc.profile?.description?.toLowerCase().includes(cleanCustomerName)) {
            //   return true;
            // }
            return false;
        });
    }
};
exports.GbpProvider = GbpProvider;
exports.GbpProvider = GbpProvider = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof customers_repository_1.CustomersRepository !== "undefined" && customers_repository_1.CustomersRepository) === "function" ? _a : Object])
], GbpProvider);


/***/ }),
/* 102 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WebsiteProvider = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const axios_1 = tslib_1.__importDefault(__webpack_require__(53));
const qs_1 = tslib_1.__importDefault(__webpack_require__(103));
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
const make_is_1 = __webpack_require__(27);
const customers_repository_1 = __webpack_require__(100);
let WebsiteProvider = class WebsiteProvider {
    constructor(_customersRepository) {
        this._customersRepository = _customersRepository;
        this.currentCustomerId = '';
        this.currentOrgId = '';
        this.currentCustomerName = '';
        this.currentPropertyId = '';
        this.identifier = 'website';
        this.name = 'Website';
        this.toolTip = 'Connect your Google Analytics account to fetch GA4 reports';
        this.isWeb3 = false;
        this.oneTimeToken = false;
        this.isBetweenSteps = false;
        this.scopes = ['https://www.googleapis.com/auth/analytics.readonly'];
        this.GOOGLE_CLIENT_ID = process.env.GOOGLE_WEBSITE_CLIENT_ID;
        this.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_WEBSITE_CLIENT_SECRET;
        this.REDIRECT_URI = `${process.env.FRONTEND_URL}/integrations/social/website`;
    }
    async generateAuthUrl(clientInformation, customerId) {
        this.currentCustomerId = customerId;
        try {
            const customer = await this._customersRepository.getCustomerByPKId(customerId);
            this.currentOrgId = customer?.orgId || '';
            this.currentCustomerName = customer?.name || 'Website User';
        }
        catch (e) {
            console.error('Error fetching customer details:', e);
            this.currentOrgId = '';
            this.currentCustomerName = 'Website User';
        }
        const state = Buffer.from(JSON.stringify({
            customerId,
            timestamp: Date.now(),
        })).toString('base64');
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${this.GOOGLE_CLIENT_ID}` +
            `&redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}` +
            `&response_type=code` +
            `&scope=${encodeURIComponent(this.scopes.join(' '))}` +
            `&access_type=offline` +
            `&prompt=consent` +
            `&state=${state}`;
        return {
            url: authUrl,
            codeVerifier: (0, make_is_1.makeId)(11),
            state,
        };
    }
    async authenticate(params) {
        if (!params.code) {
            return 'Missing authorization code';
        }
        try {
            const customerId = this.currentCustomerId;
            if (!customerId) {
                throw new Error('CustomerId is not set on WebsiteProvider');
            }
            // Fetch config for PROPERTY_ID
            const configRes = await axios_1.default.get(`${process.env.BACKEND_INTERNAL_URL}/social-media-platform-config`, {
                params: { customerId },
                headers: {
                    cookie: process.env.INTERNEL_TOKEN,
                    'Content-Type': 'application/json',
                },
            });
            const configs = configRes.data;
            const websitePlatform = configs.find((c) => c.platformKey === 'website' && c.customerId === customerId);
            if (!websitePlatform) {
                throw new Error('Website platform config not found');
            }
            const propertyIdConfig = websitePlatform.config.find((c) => c.key === 'GOOGLE_WEBSITE_PROPERTY_ID');
            const propertyId = propertyIdConfig?.value;
            if (!propertyId) {
                throw new Error('GOOGLE_WEBSITE_PROPERTY_ID not found');
            }
            this.currentPropertyId = propertyId;
            // Exchange code for tokens
            const tokenResponse = await axios_1.default.post('https://oauth2.googleapis.com/token', qs_1.default.stringify({
                code: params.code,
                client_id: this.GOOGLE_CLIENT_ID,
                client_secret: this.GOOGLE_CLIENT_SECRET,
                redirect_uri: this.REDIRECT_URI,
                grant_type: 'authorization_code',
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            const { access_token, refresh_token, expires_in } = tokenResponse.data;
            if (!this.currentCustomerName) {
                const customer = await this._customersRepository.getCustomerByPKId(customerId);
                this.currentCustomerName = customer?.name || 'Website User';
            }
            return {
                accessToken: access_token,
                refreshToken: refresh_token || '',
                expiresIn: expires_in || (0, dayjs_1.default)().add(1, 'hour').unix(),
                id: propertyId,
                name: this.currentCustomerName,
                username: this.currentCustomerName,
                additionalSettings: [
                    {
                        title: 'Customer ID',
                        value: this.currentCustomerId,
                        type: 'text',
                        description: 'Associated customer ID'
                    },
                    {
                        title: 'Organization ID',
                        value: this.currentOrgId || '',
                        type: 'text',
                        description: 'Associated organization ID'
                    }
                ],
            };
        }
        catch (err) {
            console.error('Website OAuth Error:', err.response?.data || err.message);
            return 'Failed to exchange authorization code for token';
        }
    }
    async refreshToken(refreshToken) {
        const tokenResponse = await axios_1.default.post('https://oauth2.googleapis.com/token', qs_1.default.stringify({
            client_id: this.GOOGLE_CLIENT_ID,
            client_secret: this.GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const { access_token, expires_in } = tokenResponse.data;
        if (!this.currentCustomerName) {
            try {
                const customer = await this._customersRepository.getCustomerByPKId(this.currentCustomerId);
                this.currentCustomerName = customer?.name || 'Website User';
            }
            catch (e) {
                console.error('Error fetching customer name in refreshToken:', e);
            }
        }
        console.log("Refresh this.currentPropertyId", this.currentPropertyId);
        console.log("Refresh this.currentCustomerName", this.currentCustomerName);
        return {
            accessToken: access_token,
            refreshToken: refreshToken,
            expiresIn: expires_in || (0, dayjs_1.default)().add(1, 'hour').unix(),
            id: this.currentPropertyId,
            name: this.currentCustomerName,
            picture: '',
            username: this.currentCustomerName,
            additionalSettings: [],
        };
    }
    async post(id, accessToken, postDetails, integration) {
        throw new Error('Posting is not implemented for WebsiteProvider.');
    }
};
exports.WebsiteProvider = WebsiteProvider;
exports.WebsiteProvider = WebsiteProvider = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof customers_repository_1.CustomersRepository !== "undefined" && customers_repository_1.CustomersRepository) === "function" ? _a : Object])
], WebsiteProvider);


/***/ }),
/* 103 */
/***/ ((module) => {

module.exports = require("qs");

/***/ }),
/* 104 */
/***/ ((module) => {

module.exports = require("dayjs/plugin/utc");

/***/ }),
/* 105 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e, _f, _g, _h, _j;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PostsService = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const posts_repository_1 = __webpack_require__(106);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
const integration_manager_1 = __webpack_require__(58);
const client_1 = __webpack_require__(11);
const notification_service_1 = __webpack_require__(14);
const lodash_1 = __webpack_require__(12);
const messages_service_1 = __webpack_require__(109);
const stripe_service_1 = __webpack_require__(111);
const integration_service_1 = __webpack_require__(45);
const make_is_1 = __webpack_require__(27);
const social_abstract_1 = __webpack_require__(65);
const client_2 = __webpack_require__(29);
const timer_1 = __webpack_require__(66);
const utc_1 = tslib_1.__importDefault(__webpack_require__(104));
const media_service_1 = __webpack_require__(116);
const short_link_service_1 = __webpack_require__(122);
dayjs_1.default.extend(utc_1.default);
let PostsService = class PostsService {
    constructor(_postRepository, _workerServiceProducer, _integrationManager, _notificationService, _messagesService, _stripeService, _integrationService, _mediaService, _shortLinkService) {
        this._postRepository = _postRepository;
        this._workerServiceProducer = _workerServiceProducer;
        this._integrationManager = _integrationManager;
        this._notificationService = _notificationService;
        this._messagesService = _messagesService;
        this._stripeService = _stripeService;
        this._integrationService = _integrationService;
        this._mediaService = _mediaService;
        this._shortLinkService = _shortLinkService;
    }
    async getStatistics(orgId, id) {
        const getPost = await this.getPostsRecursively(id, true, orgId, true);
        const content = getPost.map((p) => p.content);
        const shortLinksTracking = await this._shortLinkService.getStatistics(content);
        return {
            clicks: shortLinksTracking
        };
    }
    async getPostsRecursively(id, includeIntegration = false, orgId, isFirst) {
        const post = await this._postRepository.getPost(id, includeIntegration, orgId, isFirst);
        if (!post) {
            return [];
        }
        return [
            post,
            ...(post?.childrenPost?.length
                ? await this.getPostsRecursively(post?.childrenPost?.[0]?.id, false, orgId, false)
                : []),
        ];
    }
    getPosts(orgId, query) {
        return this._postRepository.getPosts(orgId, query);
    }
    async updateMedia(id, imagesList) {
        let imageUpdateNeeded = false;
        const getImageList = (await Promise.all(imagesList.map(async (p) => {
            if (!p.path && p.id) {
                imageUpdateNeeded = true;
                return this._mediaService.getMediaById(p.id);
            }
            return p;
        }))).map((m) => {
            return {
                ...m,
                url: m.path.indexOf('http') === -1
                    ? process.env.FRONTEND_URL +
                        '/' +
                        process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY +
                        m.path
                    : m.path,
                type: 'image',
                path: m.path.indexOf('http') === -1
                    ? process.env.UPLOAD_DIRECTORY + m.path
                    : m.path,
            };
        });
        if (imageUpdateNeeded) {
            await this._postRepository.updateImages(id, JSON.stringify(getImageList));
        }
        return getImageList;
    }
    async getPost(orgId, id) {
        const posts = await this.getPostsRecursively(id, true, orgId, true);
        const list = {
            group: posts?.[0]?.group,
            posts: await Promise.all(posts.map(async (post) => ({
                ...post,
                image: await this.updateMedia(post.id, JSON.parse(post.image || '[]')),
            }))),
            integrationPicture: posts[0]?.integration?.picture,
            integration: posts[0].integrationId,
            settings: JSON.parse(posts[0].settings || '{}'),
        };
        return list;
    }
    async getOldPosts(orgId, date) {
        return this._postRepository.getOldPosts(orgId, date);
    }
    async post(id) {
        const [firstPost, ...morePosts] = await this.getPostsRecursively(id, true);
        if (!firstPost) {
            return;
        }
        if (firstPost.integration?.refreshNeeded) {
            await this._notificationService.inAppNotification(firstPost.organizationId, `We couldn't post to ${firstPost.integration?.providerIdentifier} for ${firstPost?.integration?.name}`, `We couldn't post to ${firstPost.integration?.providerIdentifier} for ${firstPost?.integration?.name} because you need to reconnect it. Please enable it and try again.`, true);
            return;
        }
        if (firstPost.integration?.disabled) {
            await this._notificationService.inAppNotification(firstPost.organizationId, `We couldn't post to ${firstPost.integration?.providerIdentifier} for ${firstPost?.integration?.name}`, `We couldn't post to ${firstPost.integration?.providerIdentifier} for ${firstPost?.integration?.name} because it's disabled. Please enable it and try again.`, true);
            return;
        }
        try {
            const finalPost = firstPost.integration?.type === 'article'
                ? await this.postArticle(firstPost.integration, [
                    firstPost,
                    ...morePosts,
                ])
                : await this.postSocial(firstPost.integration, [
                    firstPost,
                    ...morePosts,
                ]);
            if (!finalPost?.postId || !finalPost?.releaseURL) {
                await this._postRepository.changeState(firstPost.id, 'ERROR');
                await this._notificationService.inAppNotification(firstPost.organizationId, `Error posting on ${firstPost.integration?.providerIdentifier} for ${firstPost?.integration?.name}`, `An error occurred while posting on ${firstPost.integration?.providerIdentifier}`, true);
                return;
            }
            if (firstPost.submittedForOrderId) {
                this._workerServiceProducer.emit('submit', {
                    payload: {
                        id: firstPost.id,
                        releaseURL: finalPost.releaseURL,
                    },
                });
            }
        }
        catch (err) {
            await this._postRepository.changeState(firstPost.id, 'ERROR', err);
            await this._notificationService.inAppNotification(firstPost.organizationId, `Error posting on ${firstPost.integration?.providerIdentifier} for ${firstPost?.integration?.name}`, `An error occurred while posting on ${firstPost.integration?.providerIdentifier} ${!process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                ? err
                : ''}`, true);
            if (err instanceof social_abstract_1.BadBody) {
                console.error('[Error] posting on', firstPost.integration?.providerIdentifier, err.identifier, err.json, err.body, err);
                return;
            }
            console.error('[Error] posting on', firstPost.integration?.providerIdentifier, err);
        }
    }
    async updateTags(orgId, post) {
        const plainText = JSON.stringify(post);
        const extract = Array.from(plainText.match(/\(post:[a-zA-Z0-9-_]+\)/g) || []);
        if (!extract.length) {
            return post;
        }
        const ids = extract.map((e) => e.replace('(post:', '').replace(')', ''));
        const urls = await this._postRepository.getPostUrls(orgId, ids);
        const newPlainText = ids.reduce((acc, value) => {
            const findUrl = urls?.find?.((u) => u.id === value)?.releaseURL || '';
            return acc.replace(new RegExp(`\\(post:${value}\\)`, 'g'), findUrl.split(',')[0]);
        }, plainText);
        return this.updateTags(orgId, JSON.parse(newPlainText));
    }
    async postSocial(integration, posts, forceRefresh = false) {
        const getIntegration = await this._integrationManager.getSocialIntegration(integration.providerIdentifier, integration.organizationId, integration.customerId);
        if (!getIntegration) {
            return {};
        }
        if ((0, dayjs_1.default)(integration?.tokenExpiration).isBefore((0, dayjs_1.default)()) || forceRefresh) {
            const { accessToken, expiresIn, refreshToken, additionalSettings } = await new Promise((res) => {
                getIntegration
                    .refreshToken(integration.refreshToken)
                    .then((r) => res(r))
                    .catch(() => res({
                    accessToken: '',
                    expiresIn: 0,
                    refreshToken: '',
                    id: '',
                    name: '',
                    username: '',
                    picture: '',
                    additionalSettings: undefined,
                }));
            });
            if (!accessToken) {
                await this._integrationService.refreshNeeded(integration.organizationId, integration.id);
                await this._integrationService.informAboutRefreshError(integration.organizationId, integration);
                return {};
            }
            await this._integrationService.createOrUpdateIntegration(additionalSettings, !!getIntegration.oneTimeToken, integration.organizationId, integration.customerId, integration.name, integration.picture, 'social', integration.internalId, integration.providerIdentifier, accessToken, refreshToken, expiresIn);
            integration.token = accessToken;
            if (getIntegration.refreshWait) {
                await (0, timer_1.timer)(10000);
            }
        }
        const newPosts = await this.updateTags(integration.organizationId, posts);
        try {
            const publishedPosts = await getIntegration.post(integration.internalId, integration.token, await Promise.all(newPosts.map(async (p) => ({
                id: p.id,
                message: p.content,
                settings: JSON.parse(p.settings || '{}'),
                media: await this.updateMedia(p.id, JSON.parse(p.image || '[]')),
            }))), integration);
            for (const post of publishedPosts) {
                await this._postRepository.updatePost(post.id, post.postId, post.releaseURL);
            }
            await this._notificationService.inAppNotification(integration.organizationId, `Your post has been published on ${(0, lodash_1.capitalize)(integration.providerIdentifier)}`, `Your post has been published at ${publishedPosts[0].releaseURL}`, true);
            await this.checkPlugs(integration.organizationId, getIntegration.identifier, integration.id, publishedPosts[0].postId);
            await this.checkInternalPlug(integration, integration.organizationId, publishedPosts[0].postId, JSON.parse(newPosts[0].settings || '{}'));
            return {
                postId: publishedPosts[0].postId,
                releaseURL: publishedPosts[0].releaseURL,
            };
        }
        catch (err) {
            if (err instanceof social_abstract_1.RefreshToken) {
                return this.postSocial(integration, posts, true);
            }
            throw err;
        }
    }
    async checkInternalPlug(integration, orgId, id, settings) {
        const plugs = Object.entries(settings).filter(([key]) => {
            return key.indexOf('plug-') > -1;
        });
        if (plugs.length === 0) {
            return;
        }
        const parsePlugs = plugs.reduce((all, [key, value]) => {
            const [_, name, identifier] = key.split('--');
            all[name] = all[name] || { name };
            all[name][identifier] = value;
            return all;
        }, {});
        const list = Object.values(parsePlugs);
        for (const trigger of list || []) {
            for (const int of trigger?.integrations || []) {
                this._workerServiceProducer.emit('internal-plugs', {
                    id: 'plug_' + id + '_' + trigger.name + '_' + int.id,
                    options: {
                        delay: +trigger.delay,
                    },
                    payload: {
                        post: id,
                        originalIntegration: integration.id,
                        integration: int.id,
                        plugName: trigger.name,
                        orgId: orgId,
                        delay: +trigger.delay,
                        information: trigger,
                    },
                });
            }
        }
    }
    async checkPlugs(orgId, providerName, integrationId, postId) {
        const loadAllPlugs = this._integrationManager.getAllPlugs();
        const getPlugs = await this._integrationService.getPlugs(orgId, integrationId);
        const currentPlug = loadAllPlugs.find((p) => p.identifier === providerName);
        for (const plug of getPlugs) {
            const runPlug = currentPlug?.plugs?.find((p) => p.methodName === plug.plugFunction);
            if (!runPlug) {
                continue;
            }
            this._workerServiceProducer.emit('plugs', {
                id: 'plug_' + postId + '_' + runPlug.identifier,
                options: {
                    delay: runPlug.runEveryMilliseconds,
                },
                payload: {
                    plugId: plug.id,
                    postId,
                    delay: runPlug.runEveryMilliseconds,
                    totalRuns: runPlug.totalRuns,
                    currentRun: 1,
                },
            });
        }
    }
    async postArticle(integration, posts) {
        const getIntegration = this._integrationManager.getArticlesIntegration(integration.providerIdentifier);
        if (!getIntegration) {
            return;
        }
        const newPosts = await this.updateTags(integration.organizationId, posts);
        const { postId, releaseURL } = await getIntegration.post(integration.token, newPosts.map((p) => p.content).join('\n\n'), JSON.parse(newPosts[0].settings || '{}'));
        await this._notificationService.inAppNotification(integration.organizationId, `Your article has been published on ${(0, lodash_1.capitalize)(integration.providerIdentifier)}`, `Your article has been published at ${releaseURL}`, true);
        await this._postRepository.updatePost(newPosts[0].id, postId, releaseURL);
        return {
            postId,
            releaseURL,
        };
    }
    async deletePost(orgId, group) {
        const post = await this._postRepository.deletePost(orgId, group);
        if (post?.id) {
            await this._workerServiceProducer.delete('post', post.id);
            return { id: post.id };
        }
        return { error: true };
    }
    async countPostsFromDay(orgId, date) {
        return this._postRepository.countPostsFromDay(orgId, date);
    }
    async submit(id, order, message, integrationId) {
        if (!(await this._messagesService.canAddPost(id, order, integrationId))) {
            throw new Error('You can not add a post to this publication');
        }
        const getOrgByOrder = await this._messagesService.getOrgByOrder(order);
        const submit = await this._postRepository.submit(id, order, getOrgByOrder?.messageGroup?.buyerOrganizationId);
        const messageModel = await this._messagesService.createNewMessage(submit?.submittedForOrder?.messageGroupId || '', client_1.From.SELLER, '', {
            type: 'post',
            data: {
                id: order,
                postId: id,
                status: 'PENDING',
                integration: integrationId,
                description: message.slice(0, 300) + '...',
            },
        });
        await this._postRepository.updateMessage(id, messageModel.id);
        return messageModel;
    }
    async createPost(orgId, body) {
        const postList = [];
        for (const post of body.posts) {
            const messages = post.value.map(p => p.content);
            const updateContent = !body.shortLink ? messages : await this._shortLinkService.convertTextToShortLinks(orgId, messages);
            post.value = post.value.map((p, i) => ({
                ...p,
                content: updateContent[i],
            }));
            const { previousPost, posts } = await this._postRepository.createOrUpdatePost(body.type, orgId, body.type === 'now'
                ? (0, dayjs_1.default)().format('YYYY-MM-DDTHH:mm:00')
                : body.date, post);
            if (!posts?.length) {
                return;
            }
            await this._workerServiceProducer.delete('post', previousPost ? previousPost : posts?.[0]?.id);
            if (body.order && body.type !== 'draft') {
                await this.submit(posts[0].id, body.order, post.value[0].content, post.integration.id);
                continue;
            }
            if (body.type === 'now' ||
                (body.type === 'schedule' && (0, dayjs_1.default)(body.date).isAfter((0, dayjs_1.default)()))) {
                this._workerServiceProducer.emit('post', {
                    id: posts[0].id,
                    options: {
                        delay: body.type === 'now'
                            ? 0
                            : (0, dayjs_1.default)(posts[0].publishDate).diff((0, dayjs_1.default)(), 'millisecond'),
                    },
                    payload: {
                        id: posts[0].id,
                    },
                });
            }
            postList.push({
                postId: posts[0].id,
                integration: post.integration.id,
            });
        }
        return postList;
    }
    async changeDate(orgId, id, date) {
        const getPostById = await this._postRepository.getPostById(id, orgId);
        if (getPostById?.submittedForOrderId &&
            getPostById.approvedSubmitForOrder !== 'NO') {
            throw new Error('You can not change the date of a post that has been submitted');
        }
        await this._workerServiceProducer.delete('post', id);
        if (getPostById?.state !== 'DRAFT' && !getPostById?.submittedForOrderId) {
            this._workerServiceProducer.emit('post', {
                id: id,
                options: {
                    delay: (0, dayjs_1.default)(date).diff((0, dayjs_1.default)(), 'millisecond'),
                },
                payload: {
                    id: id,
                },
            });
        }
        return this._postRepository.changeDate(orgId, id, date);
    }
    async payout(id, url) {
        const getPost = await this._postRepository.getPostById(id);
        if (!getPost || !getPost.submittedForOrder) {
            return;
        }
        const findPrice = getPost.submittedForOrder.ordersItems.find((orderItem) => orderItem.integrationId === getPost.integrationId);
        await this._messagesService.createNewMessage(getPost.submittedForOrder.messageGroupId, client_1.From.SELLER, '', {
            type: 'published',
            data: {
                id: getPost.submittedForOrder.id,
                postId: id,
                status: 'PUBLISHED',
                integrationId: getPost.integrationId,
                integration: getPost.integration.providerIdentifier,
                picture: getPost.integration.picture,
                name: getPost.integration.name,
                url,
            },
        });
        const totalItems = getPost.submittedForOrder.ordersItems.reduce((all, p) => all + p.quantity, 0);
        const totalPosts = getPost.submittedForOrder.posts.length;
        if (totalItems === totalPosts) {
            await this._messagesService.completeOrder(getPost.submittedForOrder.id);
            await this._messagesService.createNewMessage(getPost.submittedForOrder.messageGroupId, client_1.From.SELLER, '', {
                type: 'order-completed',
                data: {
                    id: getPost.submittedForOrder.id,
                    postId: id,
                    status: 'PUBLISHED',
                },
            });
        }
        try {
            await this._stripeService.payout(getPost.submittedForOrder.id, getPost.submittedForOrder.captureId, getPost.submittedForOrder.seller.account, findPrice.price);
            return this._notificationService.inAppNotification(getPost.integration.organizationId, 'Payout completed', `You have received a payout of $${findPrice.price}`, true);
        }
        catch (err) {
            await this._messagesService.payoutProblem(getPost.submittedForOrder.id, getPost.submittedForOrder.seller.id, findPrice.price, id);
        }
    }
    async generatePostsDraft(orgId, body) {
        const getAllIntegrations = (await this._integrationService.getIntegrationsList(orgId)).filter((f) => !f.disabled && f.providerIdentifier !== 'reddit');
        // const posts = chunk(body.posts, getAllIntegrations.length);
        const allDates = (0, dayjs_1.default)()
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
            const randomDate = (0, lodash_1.shuffle)(dates)[0] + 'T' + `${formattedHours}:${formattedMinutes}:00`;
            if ((0, dayjs_1.default)(randomDate).isBefore((0, dayjs_1.default)())) {
                return findTime();
            }
            return randomDate;
        };
        for (const integration of getAllIntegrations) {
            for (const toPost of body.posts) {
                const group = (0, make_is_1.makeId)(10);
                const randomDate = findTime();
                await this.createPost(orgId, {
                    type: 'draft',
                    date: randomDate,
                    order: '',
                    shortLink: false,
                    posts: [
                        {
                            group,
                            integration: {
                                id: integration.id,
                            },
                            settings: {
                                subtitle: '',
                                title: '',
                                tags: [],
                                subreddit: [],
                            },
                            value: [
                                ...toPost.list.map((l) => ({
                                    id: '',
                                    content: l.post,
                                    image: [],
                                })),
                                {
                                    id: '',
                                    content: `Check out the full story here:\n${body.postId || body.url}`,
                                    image: [],
                                },
                            ],
                        },
                    ],
                });
            }
        }
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
    async findFreeDateTime(orgId) {
        const findTimes = await this._integrationService.findFreeDateTime(orgId);
        return this.findFreeDateTimeRecursive(orgId, findTimes, dayjs_1.default.utc().startOf('day'));
    }
    async createPopularPosts(post) {
        return this._postRepository.createPopularPosts(post);
    }
    async findFreeDateTimeRecursive(orgId, times, date) {
        const list = await this._postRepository.getPostsCountsByDates(orgId, times, date);
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
    }
    getComments(postId) {
        return this._postRepository.getComments(postId);
    }
    createComment(orgId, userId, postId, comment) {
        return this._postRepository.createComment(orgId, userId, postId, comment);
    }
};
exports.PostsService = PostsService;
exports.PostsService = PostsService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof posts_repository_1.PostsRepository !== "undefined" && posts_repository_1.PostsRepository) === "function" ? _a : Object, typeof (_b = typeof client_2.BullMqClient !== "undefined" && client_2.BullMqClient) === "function" ? _b : Object, typeof (_c = typeof integration_manager_1.IntegrationManager !== "undefined" && integration_manager_1.IntegrationManager) === "function" ? _c : Object, typeof (_d = typeof notification_service_1.NotificationService !== "undefined" && notification_service_1.NotificationService) === "function" ? _d : Object, typeof (_e = typeof messages_service_1.MessagesService !== "undefined" && messages_service_1.MessagesService) === "function" ? _e : Object, typeof (_f = typeof stripe_service_1.StripeService !== "undefined" && stripe_service_1.StripeService) === "function" ? _f : Object, typeof (_g = typeof integration_service_1.IntegrationService !== "undefined" && integration_service_1.IntegrationService) === "function" ? _g : Object, typeof (_h = typeof media_service_1.MediaService !== "undefined" && media_service_1.MediaService) === "function" ? _h : Object, typeof (_j = typeof short_link_service_1.ShortLinkService !== "undefined" && short_link_service_1.ShortLinkService) === "function" ? _j : Object])
], PostsService);


/***/ }),
/* 106 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PostsRepository = void 0;
const tslib_1 = __webpack_require__(3);
const prisma_service_1 = __webpack_require__(10);
const common_1 = __webpack_require__(4);
const client_1 = __webpack_require__(11);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
const isoWeek_1 = tslib_1.__importDefault(__webpack_require__(107));
const weekOfYear_1 = tslib_1.__importDefault(__webpack_require__(108));
const uuid_1 = __webpack_require__(33);
dayjs_1.default.extend(isoWeek_1.default);
dayjs_1.default.extend(weekOfYear_1.default);
let PostsRepository = class PostsRepository {
    constructor(_post, _popularPosts, _comments) {
        this._post = _post;
        this._popularPosts = _popularPosts;
        this._comments = _comments;
    }
    getOldPosts(orgId, date) {
        return this._post.model.post.findMany({
            where: {
                organizationId: orgId,
                publishDate: {
                    lte: (0, dayjs_1.default)(date).toDate(),
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
        const dateYear = (0, dayjs_1.default)().year(query.year);
        const date = query.display === 'day'
            ? dateYear.isoWeek(query.week).day(query.day)
            : query.display === 'week'
                ? dateYear.isoWeek(query.week)
                : dateYear.month(query.month - 1);
        const startDate = (query.display === 'day'
            ? date.startOf('day')
            : query.display === 'week'
                ? date.startOf('isoWeek')
                : date.startOf('month'))
            .subtract(2, 'hours')
            .toDate();
        const endDate = (query.display === 'day'
            ? date.endOf('day')
            : query.display === 'week'
                ? date.endOf('isoWeek')
                : date.endOf('month'))
            .add(2, 'hours')
            .toDate();
        return this._post.model.post.findMany({
            where: {
                OR: [
                    {
                        organizationId: orgId,
                    },
                    {
                        submittedForOrganizationId: orgId,
                    },
                ],
                publishDate: {
                    gte: startDate,
                    lte: endDate,
                },
                deletedAt: null,
                parentPostId: null,
                ...query.customer ? {
                    integration: {
                        customerId: query.customer,
                    }
                } : {},
            },
            select: {
                id: true,
                content: true,
                publishDate: true,
                releaseURL: true,
                submittedForOrganizationId: true,
                submittedForOrderId: true,
                state: true,
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
    }
    async deletePost(orgId, group) {
        await this._post.model.post.updateMany({
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
    }
    getPost(id, includeIntegration = false, orgId, isFirst) {
        return this._post.model.post.findUnique({
            where: {
                id,
                ...(orgId ? { organizationId: orgId } : {}),
                deletedAt: null,
            },
            include: {
                ...(includeIntegration
                    ? {
                        integration: true,
                    }
                    : {}),
                childrenPost: true,
            },
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
    changeState(id, state, err) {
        return this._post.model.post.update({
            where: {
                id,
            },
            data: {
                state,
                error: typeof err === 'string' ? err : JSON.stringify(err),
            },
        });
    }
    async changeDate(orgId, id, date) {
        return this._post.model.post.update({
            where: {
                organizationId: orgId,
                id,
            },
            data: {
                publishDate: (0, dayjs_1.default)(date).toDate(),
            },
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
    async createOrUpdatePost(state, orgId, date, body) {
        const posts = [];
        const uuid = (0, uuid_1.v4)();
        for (const value of body.value) {
            const updateData = (type) => ({
                publishDate: (0, dayjs_1.default)(date).toDate(),
                integration: {
                    connect: {
                        id: body.integration.id,
                        organizationId: orgId,
                    },
                },
                ...(posts?.[posts.length - 1]?.id
                    ? {
                        parentPost: {
                            connect: {
                                id: posts[posts.length - 1]?.id,
                            },
                        },
                    }
                    : type === 'update'
                        ? {
                            parentPost: {
                                disconnect: true,
                            },
                        }
                        : {}),
                content: value.content,
                group: uuid,
                approvedSubmitForOrder: client_1.APPROVED_SUBMIT_FOR_ORDER.NO,
                state: state === 'draft' ? 'DRAFT' : 'QUEUE',
                image: JSON.stringify(value.image),
                settings: JSON.stringify(body.settings),
                organization: {
                    connect: {
                        id: orgId,
                    },
                },
            });
            posts.push(await this._post.model.post.upsert({
                where: {
                    id: value.id || (0, uuid_1.v4)(),
                },
                create: { ...updateData('create') },
                update: {
                    ...updateData('update'),
                    lastMessage: {
                        disconnect: true,
                    },
                    submittedForOrder: {
                        disconnect: true,
                    },
                },
            }));
        }
        const previousPost = body.group
            ? (await this._post.model.post.findFirst({
                where: {
                    group: body.group,
                    deletedAt: null,
                    parentPostId: null,
                },
                select: {
                    id: true,
                },
            }))?.id
            : undefined;
        if (body.group) {
            await this._post.model.post.updateMany({
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
    }
    async submit(id, order, buyerOrganizationId) {
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
            where: {
                id,
                ...(org ? { organizationId: org } : {}),
            },
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
            where: {
                category,
                ...(topic ? { topic } : {}),
            },
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
    async getPostsCountsByDates(orgId, times, date) {
        const dates = await this._post.model.post.findMany({
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
        return times.filter((time) => date.clone().add(time, 'minutes').isAfter(dayjs_1.default.utc()) &&
            !dates.find((dateFind) => {
                return (dayjs_1.default
                    .utc(dateFind.publishDate)
                    .diff(date.clone().startOf('day'), 'minutes') == time);
            }));
    }
    async getComments(postId) {
        return this._comments.model.comments.findMany({
            where: {
                postId,
            },
            orderBy: {
                createdAt: 'asc',
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
};
exports.PostsRepository = PostsRepository;
exports.PostsRepository = PostsRepository = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _a : Object, typeof (_b = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _b : Object, typeof (_c = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _c : Object])
], PostsRepository);


/***/ }),
/* 107 */
/***/ ((module) => {

module.exports = require("dayjs/plugin/isoWeek");

/***/ }),
/* 108 */
/***/ ((module) => {

module.exports = require("dayjs/plugin/weekOfYear");

/***/ }),
/* 109 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MessagesService = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const messages_repository_1 = __webpack_require__(110);
const organization_repository_1 = __webpack_require__(22);
const notification_service_1 = __webpack_require__(14);
const dayjs_1 = tslib_1.__importDefault(__webpack_require__(13));
const client_1 = __webpack_require__(29);
let MessagesService = class MessagesService {
    constructor(_workerServiceProducer, _messagesRepository, _organizationRepository, _inAppNotificationService) {
        this._workerServiceProducer = _workerServiceProducer;
        this._messagesRepository = _messagesRepository;
        this._organizationRepository = _organizationRepository;
        this._inAppNotificationService = _inAppNotificationService;
    }
    async createConversation(userId, organizationId, body) {
        const conversation = await this._messagesRepository.createConversation(userId, organizationId, body);
        const orgs = await this._organizationRepository.getOrgsByUserId(body.to);
        await Promise.all(orgs.map(async (org) => {
            return this._inAppNotificationService.inAppNotification(org.id, 'Request for service', 'A user has requested a service from you', true);
        }));
        return conversation;
    }
    getMessagesGroup(userId, organizationId) {
        return this._messagesRepository.getMessagesGroup(userId, organizationId);
    }
    async getMessages(userId, organizationId, groupId, page) {
        if (page === 1) {
            this._messagesRepository.updateOrderOnline(userId);
        }
        return this._messagesRepository.getMessages(userId, organizationId, groupId, page);
    }
    async createNewMessage(group, from, content, special) {
        const message = await this._messagesRepository.createNewMessage(group, from, content, special);
        const user = from === 'BUYER' ? message.group.seller : message.group.buyer;
        await Promise.all(user.organizations.map((p) => {
            return this.sendMessageNotification({
                id: p.organizationId,
                lastOnline: user.lastOnline,
            });
        }));
        return message;
    }
    async sendMessageNotification(user) {
        if ((0, dayjs_1.default)(user.lastOnline).add(5, 'minute').isBefore((0, dayjs_1.default)())) {
            await this._inAppNotificationService.inAppNotification(user.id, 'New message', 'You have a new message', true);
        }
    }
    async createMessage(userId, orgId, groupId, body) {
        const message = await this._messagesRepository.createMessage(userId, orgId, groupId, body);
        await Promise.all(message.organizations.map((p) => {
            return this.sendMessageNotification({
                id: p.organizationId,
                lastOnline: message.lastOnline,
            });
        }));
        return message;
    }
    createOffer(userId, body) {
        return this._messagesRepository.createOffer(userId, body);
    }
    getOrderDetails(userId, organizationId, orderId) {
        return this._messagesRepository.getOrderDetails(userId, organizationId, orderId);
    }
    canAddPost(id, order, integrationId) {
        return this._messagesRepository.canAddPost(id, order, integrationId);
    }
    changeOrderStatus(orderId, status, paymentIntent) {
        return this._messagesRepository.changeOrderStatus(orderId, status, paymentIntent);
    }
    getOrgByOrder(orderId) {
        return this._messagesRepository.getOrgByOrder(orderId);
    }
    getMarketplaceAvailableOffers(orgId, id) {
        return this._messagesRepository.getMarketplaceAvailableOffers(orgId, id);
    }
    getPost(userId, orgId, postId) {
        return this._messagesRepository.getPost(userId, orgId, postId);
    }
    requestRevision(userId, orgId, postId, message) {
        return this._messagesRepository.requestRevision(userId, orgId, postId, message);
    }
    async requestApproved(userId, orgId, postId, message) {
        const post = await this._messagesRepository.requestApproved(userId, orgId, postId, message);
        if (post) {
            this._workerServiceProducer.emit('post', {
                id: post.id,
                options: {
                    delay: 0, //dayjs(post.publishDate).diff(dayjs(), 'millisecond'),
                },
                payload: {
                    id: post.id,
                },
            });
        }
    }
    async requestCancel(orgId, postId) {
        const cancel = await this._messagesRepository.requestCancel(orgId, postId);
        await this._workerServiceProducer.delete('post', postId);
        return cancel;
    }
    async completeOrderAndPay(orgId, order) {
        const orderList = await this._messagesRepository.completeOrderAndPay(orgId, order);
        if (!orderList) {
            return false;
        }
        orderList.posts.forEach((post) => {
            this._workerServiceProducer.delete('post', post.id);
        });
        return orderList;
    }
    completeOrder(orderId) {
        return this._messagesRepository.completeOrder(orderId);
    }
    payoutProblem(orderId, sellerId, amount, postId) {
        return this._messagesRepository.payoutProblem(orderId, sellerId, amount, postId);
    }
    getOrders(userId, orgId, type) {
        return this._messagesRepository.getOrders(userId, orgId, type);
    }
};
exports.MessagesService = MessagesService;
exports.MessagesService = MessagesService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof client_1.BullMqClient !== "undefined" && client_1.BullMqClient) === "function" ? _a : Object, typeof (_b = typeof messages_repository_1.MessagesRepository !== "undefined" && messages_repository_1.MessagesRepository) === "function" ? _b : Object, typeof (_c = typeof organization_repository_1.OrganizationRepository !== "undefined" && organization_repository_1.OrganizationRepository) === "function" ? _c : Object, typeof (_d = typeof notification_service_1.NotificationService !== "undefined" && notification_service_1.NotificationService) === "function" ? _d : Object])
], MessagesService);


/***/ }),
/* 110 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e, _f, _g;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MessagesRepository = void 0;
const tslib_1 = __webpack_require__(3);
const prisma_service_1 = __webpack_require__(10);
const common_1 = __webpack_require__(4);
const client_1 = __webpack_require__(11);
let MessagesRepository = class MessagesRepository {
    constructor(_messagesGroup, _messages, _orders, _organizations, _post, _payoutProblems, _users) {
        this._messagesGroup = _messagesGroup;
        this._messages = _messages;
        this._orders = _orders;
        this._organizations = _organizations;
        this._post = _post;
        this._payoutProblems = _payoutProblems;
        this._users = _users;
    }
    async createConversation(userId, organizationId, body) {
        const { id } = (await this._messagesGroup.model.messagesGroup.findFirst({
            where: {
                buyerOrganizationId: organizationId,
                buyerId: userId,
                sellerId: body.to,
            },
        })) ||
            (await this._messagesGroup.model.messagesGroup.create({
                data: {
                    buyerOrganizationId: organizationId,
                    buyerId: userId,
                    sellerId: body.to,
                },
            }));
        await this._messagesGroup.model.messagesGroup.update({
            where: {
                id,
            },
            data: {
                updatedAt: new Date(),
            },
        });
        await this._messages.model.messages.create({
            data: {
                groupId: id,
                from: client_1.From.BUYER,
                content: body.message,
            },
        });
        return { id };
    }
    getOrgByOrder(orderId) {
        return this._orders.model.orders.findFirst({
            where: {
                id: orderId,
            },
            select: {
                messageGroup: {
                    select: {
                        buyerOrganizationId: true,
                    },
                },
            },
        });
    }
    async getMessagesGroup(userId, organizationId) {
        return this._messagesGroup.model.messagesGroup.findMany({
            where: {
                OR: [
                    {
                        buyerOrganizationId: organizationId,
                        buyerId: userId,
                    },
                    {
                        sellerId: userId,
                    },
                ],
            },
            orderBy: {
                updatedAt: 'desc',
            },
            include: {
                seller: {
                    select: {
                        id: true,
                        name: true,
                        picture: {
                            select: {
                                id: true,
                                path: true,
                            },
                        },
                    },
                },
                buyer: {
                    select: {
                        id: true,
                        name: true,
                        picture: {
                            select: {
                                id: true,
                                path: true,
                            },
                        },
                    },
                },
                orders: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 1,
                },
                messages: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 1,
                },
            },
        });
    }
    async createMessage(userId, orgId, groupId, body) {
        const group = await this._messagesGroup.model.messagesGroup.findFirst({
            where: {
                id: groupId,
                OR: [
                    {
                        buyerOrganizationId: orgId,
                        buyerId: userId,
                    },
                    {
                        sellerId: userId,
                    },
                ],
            },
        });
        if (!group) {
            throw new Error('Group not found');
        }
        const create = await this.createNewMessage(groupId, group.buyerId === userId ? client_1.From.BUYER : client_1.From.SELLER, body.message);
        await this._messagesGroup.model.messagesGroup.update({
            where: {
                id: groupId,
            },
            data: {
                updatedAt: new Date(),
            },
        });
        if (userId === group.buyerId) {
            return create.group.seller;
        }
        return create.group.buyer;
    }
    async updateOrderOnline(userId) {
        await this._users.model.user.update({
            where: {
                id: userId,
            },
            data: {
                lastOnline: new Date(),
            },
        });
    }
    async getMessages(userId, organizationId, groupId, page) {
        return this._messagesGroup.model.messagesGroup.findFirst({
            where: {
                id: groupId,
                OR: [
                    {
                        buyerOrganizationId: organizationId,
                        buyerId: userId,
                    },
                    {
                        sellerId: userId,
                    },
                ],
            },
            include: {
                messages: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 10,
                    skip: (page - 1) * 10,
                },
            },
        });
    }
    async createOffer(userId, body) {
        const messageGroup = await this._messagesGroup.model.messagesGroup.findFirst({
            where: {
                id: body.group,
                sellerId: userId,
            },
            select: {
                id: true,
                buyer: {
                    select: {
                        id: true,
                    },
                },
                orders: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 1,
                },
            },
        });
        if (!messageGroup?.id) {
            throw new Error('Group not found');
        }
        if (messageGroup.orders.length &&
            messageGroup.orders[0].status !== 'COMPLETED' &&
            messageGroup.orders[0].status !== 'CANCELED') {
            throw new Error('Order already exists');
        }
        const data = await this._orders.model.orders.create({
            data: {
                sellerId: userId,
                buyerId: messageGroup.buyer.id,
                messageGroupId: messageGroup.id,
                ordersItems: {
                    createMany: {
                        data: body.socialMedia.map((item) => ({
                            quantity: item.total,
                            integrationId: item.value,
                            price: item.price,
                        })),
                    },
                },
                status: 'PENDING',
            },
            select: {
                id: true,
                ordersItems: {
                    select: {
                        quantity: true,
                        price: true,
                        integration: {
                            select: {
                                name: true,
                                providerIdentifier: true,
                                picture: true,
                                id: true,
                            },
                        },
                    },
                },
            },
        });
        await this._messages.model.messages.create({
            data: {
                groupId: body.group,
                from: client_1.From.SELLER,
                content: '',
                special: JSON.stringify({ type: 'offer', data: data }),
            },
        });
        return { success: true };
    }
    async createNewMessage(group, from, content, special) {
        return this._messages.model.messages.create({
            data: {
                groupId: group,
                from,
                content,
                special: JSON.stringify(special),
            },
            select: {
                id: true,
                group: {
                    select: {
                        buyer: {
                            select: {
                                lastOnline: true,
                                id: true,
                                organizations: true,
                            },
                        },
                        seller: {
                            select: {
                                lastOnline: true,
                                id: true,
                                organizations: true,
                            },
                        },
                    },
                },
            },
        });
    }
    async getOrderDetails(userId, organizationId, orderId) {
        const order = await this._messagesGroup.model.messagesGroup.findFirst({
            where: {
                buyerId: userId,
                buyerOrganizationId: organizationId,
            },
            select: {
                buyer: true,
                seller: true,
                orders: {
                    include: {
                        ordersItems: {
                            select: {
                                quantity: true,
                                integration: true,
                                price: true,
                            },
                        },
                    },
                    where: {
                        id: orderId,
                        status: 'PENDING',
                    },
                },
            },
        });
        if (!order?.orders[0]?.id) {
            throw new Error('Order not found');
        }
        return {
            buyer: order.buyer,
            seller: order.seller,
            order: order.orders[0],
        };
    }
    async canAddPost(id, order, integrationId) {
        const findOrder = await this._orders.model.orders.findFirst({
            where: {
                id: order,
                status: 'ACCEPTED',
            },
            select: {
                posts: true,
                ordersItems: true,
            },
        });
        if (!findOrder) {
            return false;
        }
        if (findOrder.posts.find((p) => p.id === id && p.approvedSubmitForOrder === 'YES')) {
            return false;
        }
        if (findOrder.posts.find((p) => p.id === id && p.approvedSubmitForOrder === 'WAITING_CONFIRMATION')) {
            return true;
        }
        const postsForIntegration = findOrder.ordersItems.filter((p) => p.integrationId === integrationId);
        const totalPostsRequired = postsForIntegration.reduce((acc, item) => acc + item.quantity, 0);
        const usedPosts = findOrder.posts.filter((p) => p.integrationId === integrationId &&
            ['WAITING_CONFIRMATION', 'YES'].indexOf(p.approvedSubmitForOrder) > -1).length;
        return totalPostsRequired > usedPosts;
    }
    changeOrderStatus(orderId, status, paymentIntent) {
        return this._orders.model.orders.update({
            where: {
                id: orderId,
            },
            data: {
                status,
                captureId: paymentIntent,
            },
        });
    }
    async getMarketplaceAvailableOffers(orgId, id) {
        const offers = await this._organizations.model.organization.findFirst({
            where: {
                id: orgId,
            },
            select: {
                users: {
                    select: {
                        user: {
                            select: {
                                orderSeller: {
                                    where: {
                                        status: 'ACCEPTED',
                                    },
                                    select: {
                                        id: true,
                                        posts: {
                                            where: {
                                                deletedAt: null,
                                            },
                                            select: {
                                                id: true,
                                                integrationId: true,
                                                approvedSubmitForOrder: true,
                                            },
                                        },
                                        messageGroup: {
                                            select: {
                                                buyerOrganizationId: true,
                                            },
                                        },
                                        buyer: {
                                            select: {
                                                id: true,
                                                name: true,
                                                picture: {
                                                    select: {
                                                        id: true,
                                                        path: true,
                                                    },
                                                },
                                            },
                                        },
                                        ordersItems: {
                                            select: {
                                                quantity: true,
                                                integration: {
                                                    select: {
                                                        id: true,
                                                        name: true,
                                                        providerIdentifier: true,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        const allOrders = offers?.users.flatMap((user) => user.user.orderSeller) || [];
        const onlyValidItems = allOrders.filter((order) => (order.posts.find((p) => p.id === id)
            ? 0
            : order.posts.filter((f) => f.approvedSubmitForOrder !== 'NO')
                .length) <
            order.ordersItems.reduce((acc, item) => acc + item.quantity, 0));
        return onlyValidItems
            .map((order) => {
            const postsNumbers = order.posts
                .filter((p) => ['WAITING_CONFIRMATION', 'YES'].indexOf(p.approvedSubmitForOrder) > -1)
                .reduce((acc, post) => {
                acc[post.integrationId] = acc[post.integrationId] + 1 || 1;
                return acc;
            }, {});
            const missing = order.ordersItems.map((item) => {
                return {
                    integration: item,
                    missing: item.quantity - (postsNumbers[item.integration.id] || 0),
                };
            });
            return {
                id: order.id,
                usedIds: order.posts.map((p) => ({
                    id: p.id,
                    status: p.approvedSubmitForOrder,
                })),
                buyer: order.buyer,
                missing,
            };
        })
            .filter((f) => f.missing.length);
    }
    async requestRevision(userId, orgId, postId, message) {
        const loadMessage = await this._messages.model.messages.findFirst({
            where: {
                id: message,
                group: {
                    buyerOrganizationId: orgId,
                },
            },
            select: {
                id: true,
                special: true,
            },
        });
        const post = await this._post.model.post.findFirst({
            where: {
                id: postId,
                approvedSubmitForOrder: 'WAITING_CONFIRMATION',
                deletedAt: null,
            },
        });
        if (post && loadMessage) {
            const special = JSON.parse(loadMessage.special);
            special.data.status = 'REVISION';
            await this._messages.model.messages.update({
                where: {
                    id: message,
                },
                data: {
                    special: JSON.stringify(special),
                },
            });
            await this._post.model.post.update({
                where: {
                    id: postId,
                    deletedAt: null,
                },
                data: {
                    approvedSubmitForOrder: 'NO',
                },
            });
        }
    }
    async requestCancel(orgId, postId) {
        const getPost = await this._post.model.post.findFirst({
            where: {
                id: postId,
                organizationId: orgId,
                approvedSubmitForOrder: {
                    in: ['WAITING_CONFIRMATION', 'YES'],
                },
            },
            select: {
                lastMessage: true,
            },
        });
        if (!getPost) {
            throw new Error('Post not found');
        }
        await this._post.model.post.update({
            where: {
                id: postId,
            },
            data: {
                approvedSubmitForOrder: 'NO',
                submittedForOrganizationId: null,
            },
        });
        const special = JSON.parse(getPost.lastMessage.special);
        special.data.status = 'CANCELED';
        await this._messages.model.messages.update({
            where: {
                id: getPost.lastMessage.id,
            },
            data: {
                special: JSON.stringify(special),
            },
        });
    }
    async requestApproved(userId, orgId, postId, message) {
        const loadMessage = await this._messages.model.messages.findFirst({
            where: {
                id: message,
                group: {
                    buyerOrganizationId: orgId,
                },
            },
            select: {
                id: true,
                special: true,
            },
        });
        const post = await this._post.model.post.findFirst({
            where: {
                id: postId,
                approvedSubmitForOrder: 'WAITING_CONFIRMATION',
                deletedAt: null,
            },
        });
        if (post && loadMessage) {
            const special = JSON.parse(loadMessage.special);
            special.data.status = 'APPROVED';
            await this._messages.model.messages.update({
                where: {
                    id: message,
                },
                data: {
                    special: JSON.stringify(special),
                },
            });
            await this._post.model.post.update({
                where: {
                    id: postId,
                    deletedAt: null,
                },
                data: {
                    approvedSubmitForOrder: 'YES',
                },
            });
            return post;
        }
        return false;
    }
    completeOrder(orderId) {
        return this._orders.model.orders.update({
            where: {
                id: orderId,
            },
            data: {
                status: 'COMPLETED',
            },
        });
    }
    async completeOrderAndPay(orgId, order) {
        const findOrder = await this._orders.model.orders.findFirst({
            where: {
                id: order,
                messageGroup: {
                    buyerOrganizationId: orgId,
                },
            },
            select: {
                captureId: true,
                seller: {
                    select: {
                        account: true,
                        id: true,
                    },
                },
                ordersItems: true,
                posts: true,
            },
        });
        if (!findOrder) {
            return false;
        }
        const releasedPosts = findOrder.posts.filter((p) => p.releaseURL);
        const nonReleasedPosts = findOrder.posts.filter((p) => !p.releaseURL);
        const totalPosts = releasedPosts.reduce((acc, item) => {
            acc[item.integrationId] = (acc[item.integrationId] || 0) + 1;
            return acc;
        }, {});
        const totalOrderItems = findOrder.ordersItems.reduce((acc, item) => {
            acc[item.integrationId] = (acc[item.integrationId] || 0) + item.quantity;
            return acc;
        }, {});
        const calculate = Object.keys(totalOrderItems).reduce((acc, key) => {
            acc.push({
                price: findOrder.ordersItems.find((p) => p.integrationId === key)
                    .price,
                quantity: totalOrderItems[key] - (totalPosts[key] || 0),
            });
            return acc;
        }, []);
        const price = calculate.reduce((acc, item) => {
            acc += item.price * item.quantity;
            return acc;
        }, 0);
        return {
            price,
            account: findOrder.seller.account,
            charge: findOrder.captureId,
            posts: nonReleasedPosts,
            sellerId: findOrder.seller.id,
        };
    }
    payoutProblem(orderId, sellerId, amount, postId) {
        return this._payoutProblems.model.payoutProblems.create({
            data: {
                amount,
                orderId,
                ...(postId ? { postId } : {}),
                userId: sellerId,
                status: 'PAYMENT_ERROR',
            },
        });
    }
    async getOrders(userId, orgId, type) {
        const orders = await this._orders.model.orders.findMany({
            where: {
                status: {
                    in: ['ACCEPTED', 'PENDING', 'COMPLETED'],
                },
                ...(type === 'seller'
                    ? {
                        sellerId: userId,
                    }
                    : {
                        messageGroup: {
                            buyerOrganizationId: orgId,
                        },
                    }),
            },
            orderBy: {
                updatedAt: 'desc',
            },
            select: {
                id: true,
                status: true,
                ...(type === 'seller'
                    ? {
                        buyer: {
                            select: {
                                name: true,
                            },
                        },
                    }
                    : {
                        seller: {
                            select: {
                                name: true,
                            },
                        },
                    }),
                ordersItems: {
                    select: {
                        id: true,
                        quantity: true,
                        price: true,
                        integration: {
                            select: {
                                id: true,
                                picture: true,
                                name: true,
                                providerIdentifier: true,
                            },
                        },
                    },
                },
                posts: {
                    select: {
                        id: true,
                        integrationId: true,
                        releaseURL: true,
                        approvedSubmitForOrder: true,
                        state: true,
                    },
                },
            },
        });
        return {
            orders: await Promise.all(orders.map(async (order) => {
                return {
                    id: order.id,
                    status: order.status,
                    // @ts-ignore
                    name: type === 'seller' ? order?.buyer?.name : order?.seller?.name,
                    price: order.ordersItems.reduce((acc, item) => acc + item.price * item.quantity, 0),
                    details: await Promise.all(order.ordersItems.map((item) => {
                        return {
                            posted: order.posts.filter((p) => p.releaseURL && p.integrationId === item.integration.id).length,
                            submitted: order.posts.filter((p) => !p.releaseURL &&
                                (p.approvedSubmitForOrder === 'WAITING_CONFIRMATION' ||
                                    p.approvedSubmitForOrder === 'YES') &&
                                p.integrationId === item.integration.id).length,
                            integration: item.integration,
                            total: item.quantity,
                            price: item.price,
                        };
                    })),
                };
            })),
        };
    }
    getPost(userId, orgId, postId) {
        return this._post.model.post.findFirst({
            where: {
                id: postId,
                submittedForOrder: {
                    messageGroup: {
                        OR: [{ sellerId: userId }, { buyerOrganizationId: orgId }],
                    },
                },
            },
            select: {
                organizationId: true,
                integration: {
                    select: {
                        providerIdentifier: true,
                    },
                },
            },
        });
    }
};
exports.MessagesRepository = MessagesRepository;
exports.MessagesRepository = MessagesRepository = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _a : Object, typeof (_b = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _b : Object, typeof (_c = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _c : Object, typeof (_d = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _d : Object, typeof (_e = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _e : Object, typeof (_f = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _f : Object, typeof (_g = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _g : Object])
], MessagesRepository);


/***/ }),
/* 111 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StripeService = void 0;
const tslib_1 = __webpack_require__(3);
const stripe_1 = tslib_1.__importDefault(__webpack_require__(112));
const common_1 = __webpack_require__(4);
const subscription_service_1 = __webpack_require__(42);
const organization_service_1 = __webpack_require__(38);
const make_is_1 = __webpack_require__(27);
const lodash_1 = __webpack_require__(12);
const messages_service_1 = __webpack_require__(109);
const pricing_1 = __webpack_require__(43);
const auth_service_1 = __webpack_require__(23);
const track_service_1 = __webpack_require__(113);
const users_service_1 = __webpack_require__(39);
const track_enum_1 = __webpack_require__(114);
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10',
});
let StripeService = class StripeService {
    constructor(_subscriptionService, _organizationService, _userService, _messagesService, _trackService) {
        this._subscriptionService = _subscriptionService;
        this._organizationService = _organizationService;
        this._userService = _userService;
        this._messagesService = _messagesService;
        this._trackService = _trackService;
    }
    validateRequest(rawBody, signature, endpointSecret) {
        return stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
    }
    async updateAccount(event) {
        if (!event.account) {
            return;
        }
        const accountCharges = event.data.object.payouts_enabled &&
            event.data.object.charges_enabled &&
            !event?.data?.object?.requirements?.disabled_reason;
        await this._subscriptionService.updateConnectedStatus(event.account, accountCharges);
    }
    async checkValidCard(event) {
        if (event.data.object.status === 'incomplete') {
            return false;
        }
        const getOrgFromCustomer = await this._organizationService.getOrgByCustomerId(event.data.object.customer);
        if (!getOrgFromCustomer?.allowTrial) {
            return true;
        }
        console.log('Checking card');
        const paymentMethods = await stripe.paymentMethods.list({
            customer: event.data.object.customer,
        });
        // find the last one created
        const latestMethod = paymentMethods.data.reduce((prev, current) => {
            if (prev.created < current.created) {
                return current;
            }
            return prev;
        });
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: 100,
                currency: 'usd',
                payment_method: latestMethod.id,
                customer: event.data.object.customer,
                automatic_payment_methods: {
                    allow_redirects: 'never',
                    enabled: true,
                },
                capture_method: 'manual', // Authorize without capturing
                confirm: true, // Confirm the PaymentIntent
            });
            if (paymentIntent.status !== 'requires_capture') {
                console.error('Cant charge');
                await stripe.paymentMethods.detach(paymentMethods.data[0].id);
                await stripe.subscriptions.cancel(event.data.object.id);
                return false;
            }
            await stripe.paymentIntents.cancel(paymentIntent.id);
            return true;
        }
        catch (err) {
            try {
                await stripe.paymentMethods.detach(paymentMethods.data[0].id);
                await stripe.subscriptions.cancel(event.data.object.id);
            }
            catch (err) { /*dont do anything*/ }
            return false;
        }
    }
    async createSubscription(event) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const { uniqueId, billing, period, } = event.data.object.metadata;
        const check = await this.checkValidCard(event);
        if (!check) {
            return { ok: false };
        }
        return this._subscriptionService.createOrUpdateSubscription(uniqueId, event.data.object.customer, pricing_1.pricing[billing].channel, billing, period, event.data.object.cancel_at);
    }
    async updateSubscription(event) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const { uniqueId, billing, period, } = event.data.object.metadata;
        const check = await this.checkValidCard(event);
        if (!check) {
            return { ok: false };
        }
        return this._subscriptionService.createOrUpdateSubscription(uniqueId, event.data.object.customer, pricing_1.pricing[billing].channel, billing, period, event.data.object.cancel_at);
    }
    async deleteSubscription(event) {
        await this._subscriptionService.deleteSubscription(event.data.object.customer);
    }
    async createOrGetCustomer(organization) {
        if (organization.paymentId) {
            return organization.paymentId;
        }
        const customer = await stripe.customers.create({
            name: organization.name,
        });
        await this._subscriptionService.updateCustomerId(organization.id, customer.id);
        return customer.id;
    }
    async getPackages() {
        const products = await stripe.prices.list({
            active: true,
            expand: ['data.tiers', 'data.product'],
            lookup_keys: [
                'standard_monthly',
                'standard_yearly',
                'pro_monthly',
                'pro_yearly',
            ],
        });
        const productsList = (0, lodash_1.groupBy)(products.data.map((p) => ({
            // @ts-ignore
            name: p.product?.name,
            recurring: p?.recurring?.interval,
            price: p?.tiers?.[0]?.unit_amount / 100,
        })), 'recurring');
        return { ...productsList };
    }
    async prorate(organizationId, body) {
        const org = await this._organizationService.getOrgById(organizationId);
        const customer = await this.createOrGetCustomer(org);
        const priceData = pricing_1.pricing[body.billing];
        const allProducts = await stripe.products.list({
            active: true,
            expand: ['data.prices'],
        });
        const findProduct = allProducts.data.find((product) => product.name.toUpperCase() === body.billing.toUpperCase()) ||
            (await stripe.products.create({
                active: true,
                name: body.billing,
            }));
        const pricesList = await stripe.prices.list({
            active: true,
            product: findProduct.id,
        });
        const findPrice = pricesList.data.find((p) => p?.recurring?.interval?.toLowerCase() ===
            (body.period === 'MONTHLY' ? 'month' : 'year') &&
            p?.nickname === body.billing + ' ' + body.period &&
            p?.unit_amount ===
                (body.period === 'MONTHLY'
                    ? priceData.month_price
                    : priceData.year_price) *
                    100) ||
            (await stripe.prices.create({
                active: true,
                product: findProduct.id,
                currency: 'usd',
                nickname: body.billing + ' ' + body.period,
                unit_amount: (body.period === 'MONTHLY'
                    ? priceData.month_price
                    : priceData.year_price) * 100,
                recurring: {
                    interval: body.period === 'MONTHLY' ? 'month' : 'year',
                },
            }));
        const proration_date = Math.floor(Date.now() / 1000);
        const currentUserSubscription = {
            data: (await stripe.subscriptions.list({
                customer,
                status: 'all',
            })).data.filter((f) => f.status === 'active' || f.status === 'trialing'),
        };
        try {
            const price = await stripe.invoices.retrieveUpcoming({
                customer,
                subscription: currentUserSubscription?.data?.[0]?.id,
                subscription_proration_behavior: 'create_prorations',
                subscription_billing_cycle_anchor: 'now',
                subscription_items: [
                    {
                        id: currentUserSubscription?.data?.[0]?.items?.data?.[0]?.id,
                        price: findPrice?.id,
                        quantity: 1,
                    },
                ],
                subscription_proration_date: proration_date,
            });
            return {
                price: price?.amount_remaining ? price?.amount_remaining / 100 : 0,
            };
        }
        catch (err) {
            return { price: 0 };
        }
    }
    async getCustomerSubscriptions(organizationId) {
        const org = (await this._organizationService.getOrgById(organizationId));
        const customer = org.paymentId;
        return stripe.subscriptions.list({
            customer: customer,
            status: 'all',
        });
    }
    async setToCancel(organizationId) {
        const id = (0, make_is_1.makeId)(10);
        const org = await this._organizationService.getOrgById(organizationId);
        const customer = await this.createOrGetCustomer(org);
        const currentUserSubscription = {
            data: (await stripe.subscriptions.list({
                customer,
                status: 'all',
            })).data.filter((f) => f.status !== 'canceled'),
        };
        const { cancel_at } = await stripe.subscriptions.update(currentUserSubscription.data[0].id, {
            cancel_at_period_end: !currentUserSubscription.data[0].cancel_at_period_end,
            metadata: {
                service: 'gitroom',
                id,
            },
        });
        return {
            id,
            cancel_at: cancel_at ? new Date(cancel_at * 1000) : undefined,
        };
    }
    async getCustomerByOrganizationId(organizationId) {
        const org = (await this._organizationService.getOrgById(organizationId));
        return org.paymentId;
    }
    async createBillingPortalLink(customer) {
        return stripe.billingPortal.sessions.create({
            customer,
            flow_data: {
                after_completion: {
                    type: 'redirect',
                    redirect: {
                        return_url: process.env['FRONTEND_URL'] + '/billing',
                    },
                },
                type: 'payment_method_update',
            },
        });
    }
    async createCheckoutSession(ud, uniqueId, customer, body, price, userId, allowTrial) {
        const isUtm = body.utm ? `&utm_source=${body.utm}` : '';
        const { url } = await stripe.checkout.sessions.create({
            customer,
            cancel_url: process.env['FRONTEND_URL'] + `/billing?cancel=true${isUtm}`,
            success_url: process.env['FRONTEND_URL'] +
                `/launches?onboarding=true&check=${uniqueId}${isUtm}`,
            mode: 'subscription',
            subscription_data: {
                ...(allowTrial ? { trial_period_days: 7 } : {}),
                metadata: {
                    service: 'gitroom',
                    ...body,
                    userId,
                    uniqueId,
                    ud,
                },
            },
            ...(body.tolt
                ? {
                    metadata: {
                        tolt_referral: body.tolt,
                    },
                }
                : {}),
            allow_promotion_codes: true,
            line_items: [
                {
                    price,
                    quantity: 1,
                },
            ],
        });
        return { url };
    }
    async createAccountProcess(userId, email, country) {
        const account = await this._subscriptionService.getUserAccount(userId);
        if (account?.account && account?.connectedAccount) {
            return { url: await this.addBankAccount(account.account) };
        }
        if (account?.account && !account?.connectedAccount) {
            await stripe.accounts.del(account.account);
        }
        const createAccount = await this.createAccount(userId, email, country);
        return { url: await this.addBankAccount(createAccount) };
    }
    async createAccount(userId, email, country) {
        const account = await stripe.accounts.create({
            type: 'custom',
            capabilities: {
                transfers: {
                    requested: true,
                },
                card_payments: {
                    requested: true,
                },
            },
            tos_acceptance: {
                service_agreement: 'full',
            },
            metadata: {
                service: 'gitroom',
            },
            country,
            email,
        });
        await this._subscriptionService.updateAccount(userId, account.id);
        return account.id;
    }
    async addBankAccount(userId) {
        const accountLink = await stripe.accountLinks.create({
            account: userId,
            refresh_url: process.env['FRONTEND_URL'] + '/marketplace/seller',
            return_url: process.env['FRONTEND_URL'] + '/marketplace/seller',
            type: 'account_onboarding',
            collection_options: {
                fields: 'eventually_due',
            },
        });
        return accountLink.url;
    }
    async checkSubscription(organizationId, subscriptionId) {
        const orgValue = await this._subscriptionService.checkSubscription(organizationId, subscriptionId);
        if (orgValue) {
            return 2;
        }
        const getCustomerSubscriptions = await this.getCustomerSubscriptions(organizationId);
        if (getCustomerSubscriptions.data.length === 0) {
            return 0;
        }
        if (getCustomerSubscriptions.data.find((p) => p.metadata.uniqueId === subscriptionId)?.canceled_at) {
            return 1;
        }
        return 0;
    }
    async payAccountStepOne(userId, organization, seller, orderId, ordersItems, groupId) {
        const customer = (await this.createOrGetCustomer(organization));
        const price = ordersItems.reduce((all, current) => {
            return all + current.price * current.quantity;
        }, 0);
        const { url } = await stripe.checkout.sessions.create({
            customer,
            mode: 'payment',
            currency: 'usd',
            success_url: process.env['FRONTEND_URL'] + `/messages/${groupId}`,
            metadata: {
                orderId,
                service: 'gitroom',
                type: 'marketplace',
            },
            line_items: [
                ...ordersItems,
                {
                    integrationType: `Gitroom Fee (${+process.env.FEE_AMOUNT * 100}%)`,
                    quantity: 1,
                    price: price * +process.env.FEE_AMOUNT,
                },
            ].map((item) => ({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        // @ts-ignore
                        name: (!item.price ? 'Platform: ' : '') +
                            (0, lodash_1.capitalize)(item.integrationType),
                    },
                    // @ts-ignore
                    unit_amount: item.price * 100,
                },
                quantity: item.quantity,
            })),
            payment_intent_data: {
                transfer_group: orderId,
            },
        });
        return { url };
    }
    async subscribe(uniqueId, organizationId, userId, body, allowTrial) {
        const id = (0, make_is_1.makeId)(10);
        const priceData = pricing_1.pricing[body.billing];
        const org = await this._organizationService.getOrgById(organizationId);
        const customer = await this.createOrGetCustomer(org);
        const allProducts = await stripe.products.list({
            active: true,
            expand: ['data.prices'],
        });
        const findProduct = allProducts.data.find((product) => product.name.toUpperCase() === body.billing.toUpperCase()) ||
            (await stripe.products.create({
                active: true,
                name: body.billing,
            }));
        const pricesList = await stripe.prices.list({
            active: true,
            product: findProduct.id,
        });
        const findPrice = pricesList.data.find((p) => p?.recurring?.interval?.toLowerCase() ===
            (body.period === 'MONTHLY' ? 'month' : 'year') &&
            p?.unit_amount ===
                (body.period === 'MONTHLY'
                    ? priceData.month_price
                    : priceData.year_price) *
                    100) ||
            (await stripe.prices.create({
                active: true,
                product: findProduct.id,
                currency: 'usd',
                nickname: body.billing + ' ' + body.period,
                unit_amount: (body.period === 'MONTHLY'
                    ? priceData.month_price
                    : priceData.year_price) * 100,
                recurring: {
                    interval: body.period === 'MONTHLY' ? 'month' : 'year',
                },
            }));
        const getCurrentSubscriptions = await this._subscriptionService.getSubscription(organizationId);
        if (!getCurrentSubscriptions) {
            return this.createCheckoutSession(uniqueId, id, customer, body, findPrice.id, userId, allowTrial);
        }
        const currentUserSubscription = {
            data: (await stripe.subscriptions.list({
                customer,
                status: 'all',
            })).data.filter((f) => f.status === 'active' || f.status === 'trialing'),
        };
        try {
            await stripe.subscriptions.update(currentUserSubscription.data[0].id, {
                cancel_at_period_end: false,
                metadata: {
                    service: 'gitroom',
                    ...body,
                    userId,
                    id,
                    ud: uniqueId,
                },
                proration_behavior: 'always_invoice',
                items: [
                    {
                        id: currentUserSubscription.data[0].items.data[0].id,
                        price: findPrice.id,
                        quantity: 1,
                    },
                ],
            });
            return { id };
        }
        catch (err) {
            const { url } = await this.createBillingPortalLink(customer);
            return {
                portal: url,
            };
        }
    }
    async paymentSucceeded(event) {
        // get subscription from payment
        const subscription = await stripe.subscriptions.retrieve(event.data.object.subscription);
        const { userId, ud } = subscription.metadata;
        const user = await this._userService.getUserById(userId);
        if (user && user.ip && user.agent) {
            this._trackService.track(ud, user.ip, user.agent, track_enum_1.TrackEnum.Purchase, {
                value: event.data.object.amount_paid / 100,
            });
        }
        return { ok: true };
    }
    async updateOrder(event) {
        if (event?.data?.object?.metadata?.type !== 'marketplace') {
            return { ok: true };
        }
        const { orderId } = event?.data?.object?.metadata || { orderId: '' };
        if (!orderId) {
            return;
        }
        const charge = (await stripe.paymentIntents.retrieve(event.data.object.payment_intent)).latest_charge;
        const id = typeof charge === 'string' ? charge : charge?.id;
        await this._messagesService.changeOrderStatus(orderId, 'ACCEPTED', id);
        return { ok: true };
    }
    async payout(orderId, charge, account, price) {
        return stripe.transfers.create({
            amount: price * 100,
            currency: 'usd',
            destination: account,
            source_transaction: charge,
            transfer_group: orderId,
        });
    }
    async lifetimeDeal(organizationId, code) {
        const getCurrentSubscription = await this._subscriptionService.getSubscriptionByOrganizationId(organizationId);
        if (getCurrentSubscription && !getCurrentSubscription?.isLifetime) {
            throw new Error('You already have a non lifetime subscription');
        }
        try {
            const testCode = auth_service_1.AuthService.fixedDecryption(code);
            const findCode = await this._subscriptionService.getCode(testCode);
            if (findCode) {
                return {
                    success: false,
                };
            }
            const nextPackage = !getCurrentSubscription ? 'STANDARD' : 'PRO';
            const findPricing = pricing_1.pricing[nextPackage];
            await this._subscriptionService.createOrUpdateSubscription((0, make_is_1.makeId)(10), organizationId, getCurrentSubscription?.subscriptionTier === 'PRO'
                ? getCurrentSubscription.totalChannels + 5
                : findPricing.channel, nextPackage, 'MONTHLY', null, testCode, organizationId);
            return {
                success: true,
            };
        }
        catch (err) {
            console.log(err);
            return {
                success: false,
            };
        }
    }
};
exports.StripeService = StripeService;
exports.StripeService = StripeService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof subscription_service_1.SubscriptionService !== "undefined" && subscription_service_1.SubscriptionService) === "function" ? _a : Object, typeof (_b = typeof organization_service_1.OrganizationService !== "undefined" && organization_service_1.OrganizationService) === "function" ? _b : Object, typeof (_c = typeof users_service_1.UsersService !== "undefined" && users_service_1.UsersService) === "function" ? _c : Object, typeof (_d = typeof messages_service_1.MessagesService !== "undefined" && messages_service_1.MessagesService) === "function" ? _d : Object, typeof (_e = typeof track_service_1.TrackService !== "undefined" && track_service_1.TrackService) === "function" ? _e : Object])
], StripeService);


/***/ }),
/* 112 */
/***/ ((module) => {

module.exports = require("stripe");

/***/ }),
/* 113 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TrackService = void 0;
const tslib_1 = __webpack_require__(3);
const track_enum_1 = __webpack_require__(114);
const common_1 = __webpack_require__(4);
const facebook_nodejs_business_sdk_1 = __webpack_require__(115);
const crypto_1 = __webpack_require__(26);
const access_token = process.env.FACEBOOK_PIXEL_ACCESS_TOKEN;
const pixel_id = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL;
if (access_token && pixel_id) {
    facebook_nodejs_business_sdk_1.FacebookAdsApi.init(access_token || '');
}
let TrackService = class TrackService {
    hashValue(value) {
        return (0, crypto_1.createHash)('sha256').update(value).digest('hex');
    }
    track(uniqueId, ip, agent, tt, additional, fbclid, user) {
        if (!access_token || !pixel_id) {
            return;
        }
        // @ts-ignore
        const current_timestamp = Math.floor(new Date() / 1000);
        const userData = new facebook_nodejs_business_sdk_1.UserData();
        if (ip || user?.ip) {
            userData.setClientIpAddress(ip || user?.ip || '');
        }
        if (agent || user?.agent) {
            userData.setClientUserAgent(agent || user?.agent || '');
        }
        if (fbclid) {
            userData.setFbc(fbclid);
        }
        if (user && user.email) {
            userData.setEmail(this.hashValue(user.email));
        }
        let customData = null;
        if (additional?.value) {
            customData = new facebook_nodejs_business_sdk_1.CustomData();
            customData.setValue(additional.value).setCurrency('USD');
        }
        const serverEvent = new facebook_nodejs_business_sdk_1.ServerEvent()
            .setEventName(track_enum_1.TrackEnum[tt])
            .setEventTime(current_timestamp)
            .setActionSource('website');
        if (user && user.id) {
            serverEvent.setEventId(uniqueId || user.id);
        }
        if (userData) {
            serverEvent.setUserData(userData);
        }
        if (customData) {
            serverEvent.setCustomData(customData);
        }
        const eventsData = [serverEvent];
        const eventRequest = new facebook_nodejs_business_sdk_1.EventRequest(access_token, pixel_id).setEvents(eventsData);
        return eventRequest.execute();
    }
};
exports.TrackService = TrackService;
exports.TrackService = TrackService = tslib_1.__decorate([
    (0, common_1.Injectable)()
], TrackService);


/***/ }),
/* 114 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TrackEnum = void 0;
var TrackEnum;
(function (TrackEnum) {
    TrackEnum[TrackEnum["ViewContent"] = 0] = "ViewContent";
    TrackEnum[TrackEnum["CompleteRegistration"] = 1] = "CompleteRegistration";
    TrackEnum[TrackEnum["InitiateCheckout"] = 2] = "InitiateCheckout";
    TrackEnum[TrackEnum["StartTrial"] = 3] = "StartTrial";
    TrackEnum[TrackEnum["Purchase"] = 4] = "Purchase";
})(TrackEnum || (exports.TrackEnum = TrackEnum = {}));


/***/ }),
/* 115 */
/***/ ((module) => {

module.exports = require("facebook-nodejs-business-sdk");

/***/ }),
/* 116 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MediaService = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const media_repository_1 = __webpack_require__(117);
const openai_service_1 = __webpack_require__(118);
const subscription_service_1 = __webpack_require__(42);
let MediaService = class MediaService {
    constructor(_mediaRepository, _openAi, _subscriptionService) {
        this._mediaRepository = _mediaRepository;
        this._openAi = _openAi;
        this._subscriptionService = _subscriptionService;
    }
    async deleteMedia(org, id) {
        return this._mediaRepository.deleteMedia(org, id);
    }
    getMediaById(id) {
        return this._mediaRepository.getMediaById(id);
    }
    async generateImage(prompt, org, generatePromptFirst) {
        if (generatePromptFirst) {
            prompt = await this._openAi.generatePromptForPicture(prompt);
            console.log('Prompt:', prompt);
        }
        const image = await this._openAi.generateImage(prompt, !!generatePromptFirst);
        await this._subscriptionService.useCredit(org);
        return image;
    }
    saveFile(org, fileName, filePath) {
        return this._mediaRepository.saveFile(org, fileName, filePath);
    }
    getMedia(org, page) {
        return this._mediaRepository.getMedia(org, page);
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof media_repository_1.MediaRepository !== "undefined" && media_repository_1.MediaRepository) === "function" ? _a : Object, typeof (_b = typeof openai_service_1.OpenaiService !== "undefined" && openai_service_1.OpenaiService) === "function" ? _b : Object, typeof (_c = typeof subscription_service_1.SubscriptionService !== "undefined" && subscription_service_1.SubscriptionService) === "function" ? _c : Object])
], MediaService);


/***/ }),
/* 117 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MediaRepository = void 0;
const tslib_1 = __webpack_require__(3);
const prisma_service_1 = __webpack_require__(10);
const common_1 = __webpack_require__(4);
let MediaRepository = class MediaRepository {
    constructor(_media) {
        this._media = _media;
    }
    saveFile(org, fileName, filePath) {
        return this._media.model.media.create({
            data: {
                organization: {
                    connect: {
                        id: org,
                    },
                },
                name: fileName,
                path: filePath,
            },
        });
    }
    getMediaById(id) {
        return this._media.model.media.findUnique({
            where: {
                id,
            },
        });
    }
    deleteMedia(org, id) {
        return this._media.model.media.update({
            where: {
                id,
                organizationId: org,
            },
            data: {
                deletedAt: new Date(),
            }
        });
    }
    async getMedia(org, page) {
        const pageNum = (page || 1) - 1;
        const query = {
            where: {
                organization: {
                    id: org,
                },
            },
        };
        const pages = pageNum === 0
            ? Math.ceil((await this._media.model.media.count(query)) / 28)
            : 0;
        const results = await this._media.model.media.findMany({
            where: {
                organizationId: org,
                deletedAt: null,
            },
            orderBy: {
                createdAt: 'desc',
            },
            skip: pageNum * 28,
            take: 28,
        });
        return {
            pages,
            results,
        };
    }
};
exports.MediaRepository = MediaRepository;
exports.MediaRepository = MediaRepository = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _a : Object])
], MediaRepository);


/***/ }),
/* 118 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OpenaiService = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const openai_1 = tslib_1.__importDefault(__webpack_require__(119));
const lodash_1 = __webpack_require__(12);
const zod_1 = __webpack_require__(120);
const zod_2 = __webpack_require__(121);
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
});
const PicturePrompt = zod_2.z.object({
    prompt: zod_2.z.string(),
});
let OpenaiService = class OpenaiService {
    async generateImage(prompt, isUrl) {
        const generate = (await openai.images.generate({
            prompt,
            response_format: isUrl ? 'url' : 'b64_json',
            model: 'dall-e-3',
        })).data[0];
        return isUrl ? generate.url : generate.b64_json;
    }
    async generatePromptForPicture(prompt) {
        return ((await openai.beta.chat.completions.parse({
            model: 'gpt-4o-2024-08-06',
            messages: [
                {
                    role: 'system',
                    content: `You are an assistant that take a description and style and generate a prompt that will be used later to generate images, make it a very long and descriptive explanation, and write a lot of things for the renderer like, if it${"'"}s realistic describe the camera`,
                },
                {
                    role: 'user',
                    content: `prompt: ${prompt}`,
                },
            ],
            response_format: (0, zod_1.zodResponseFormat)(PicturePrompt, 'picturePrompt'),
        })).choices[0].message.parsed?.prompt || '');
    }
    async generatePosts(content) {
        const posts = (await Promise.all([
            openai.chat.completions.create({
                messages: [
                    {
                        role: 'assistant',
                        content: 'Generate a Twitter post from the content without emojis in the following JSON format: { "post": string } put it in an array with one element',
                    },
                    {
                        role: 'user',
                        content: content,
                    },
                ],
                n: 5,
                temperature: 1,
                model: 'gpt-4o',
            }),
            openai.chat.completions.create({
                messages: [
                    {
                        role: 'assistant',
                        content: 'Generate a thread for social media in the following JSON format: Array<{ "post": string }> without emojis',
                    },
                    {
                        role: 'user',
                        content: content,
                    },
                ],
                n: 5,
                temperature: 1,
                model: 'gpt-4o',
            }),
        ])).flatMap((p) => p.choices);
        return (0, lodash_1.shuffle)(posts.map((choice) => {
            const { content } = choice.message;
            const start = content?.indexOf('[');
            const end = content?.lastIndexOf(']');
            try {
                return JSON.parse('[' +
                    content
                        ?.slice(start + 1, end)
                        .replace(/\n/g, ' ')
                        .replace(/ {2,}/g, ' ') +
                    ']');
            }
            catch (e) {
                return [];
            }
        }));
    }
    async extractWebsiteText(content) {
        const websiteContent = await openai.chat.completions.create({
            messages: [
                {
                    role: 'assistant',
                    content: 'You take a full website text, and extract only the article content',
                },
                {
                    role: 'user',
                    content,
                },
            ],
            model: 'gpt-4o',
        });
        const { content: articleContent } = websiteContent.choices[0].message;
        return this.generatePosts(articleContent);
    }
};
exports.OpenaiService = OpenaiService;
exports.OpenaiService = OpenaiService = tslib_1.__decorate([
    (0, common_1.Injectable)()
], OpenaiService);


/***/ }),
/* 119 */
/***/ ((module) => {

module.exports = require("openai");

/***/ }),
/* 120 */
/***/ ((module) => {

module.exports = require("openai/helpers/zod");

/***/ }),
/* 121 */
/***/ ((module) => {

module.exports = require("zod");

/***/ }),
/* 122 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var ShortLinkService_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ShortLinkService = void 0;
const tslib_1 = __webpack_require__(3);
const dub_1 = __webpack_require__(123);
const empty_1 = __webpack_require__(124);
const common_1 = __webpack_require__(4);
const getProvider = () => {
    if (process.env.DUB_TOKEN) {
        return new dub_1.Dub();
    }
    return new empty_1.Empty();
};
let ShortLinkService = ShortLinkService_1 = class ShortLinkService {
    askShortLinkedin(messages) {
        if (ShortLinkService_1.provider.shortLinkDomain === 'empty') {
            return false;
        }
        const mergeMessages = messages.join(' ');
        const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/g;
        const urls = mergeMessages.match(urlRegex);
        if (!urls) {
            // No URLs found, return the original text
            return false;
        }
        return urls.some((url) => url.indexOf(ShortLinkService_1.provider.shortLinkDomain) === -1);
    }
    async convertTextToShortLinks(id, messages) {
        if (ShortLinkService_1.provider.shortLinkDomain === 'empty') {
            return messages;
        }
        const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/g;
        return Promise.all(messages.map(async (text) => {
            const urls = text.match(urlRegex);
            if (!urls) {
                // No URLs found, return the original text
                return text;
            }
            const replacementMap = {};
            // Process each URL asynchronously
            await Promise.all(urls.map(async (url) => {
                if (url.indexOf(ShortLinkService_1.provider.shortLinkDomain) === -1) {
                    replacementMap[url] =
                        await ShortLinkService_1.provider.convertLinkToShortLink(id, url);
                }
                else {
                    replacementMap[url] = url; // Keep the original URL if it matches the prefix
                }
            }));
            // Replace the URLs in the text with their replacements
            return text.replace(urlRegex, (url) => replacementMap[url]);
        }));
    }
    async convertShortLinksToLinks(messages) {
        if (ShortLinkService_1.provider.shortLinkDomain === 'empty') {
            return messages;
        }
        const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/g;
        return Promise.all(messages.map(async (text) => {
            const urls = text.match(urlRegex);
            if (!urls) {
                // No URLs found, return the original text
                return text;
            }
            const replacementMap = {};
            // Process each URL asynchronously
            await Promise.all(urls.map(async (url) => {
                if (url.indexOf(ShortLinkService_1.provider.shortLinkDomain) > -1) {
                    replacementMap[url] =
                        await ShortLinkService_1.provider.convertShortLinkToLink(url);
                }
                else {
                    replacementMap[url] = url; // Keep the original URL if it matches the prefix
                }
            }));
            // Replace the URLs in the text with their replacements
            return text.replace(urlRegex, (url) => replacementMap[url]);
        }));
    }
    async getStatistics(messages) {
        if (ShortLinkService_1.provider.shortLinkDomain === 'empty') {
            return [];
        }
        const mergeMessages = messages.join(' ');
        const regex = new RegExp(`https?://${ShortLinkService_1.provider.shortLinkDomain.replace('.', '\\.')}/[^\\s]*`, 'g');
        const urls = mergeMessages.match(regex);
        if (!urls) {
            // No URLs found, return the original text
            return [];
        }
        return ShortLinkService_1.provider.linksStatistics(urls);
    }
    async getAllLinks(id) {
        if (ShortLinkService_1.provider.shortLinkDomain === 'empty') {
            return [];
        }
        return ShortLinkService_1.provider.getAllLinksStatistics(id, 1);
    }
};
exports.ShortLinkService = ShortLinkService;
ShortLinkService.provider = getProvider();
exports.ShortLinkService = ShortLinkService = ShortLinkService_1 = tslib_1.__decorate([
    (0, common_1.Injectable)()
], ShortLinkService);


/***/ }),
/* 123 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Dub = void 0;
const options = {
    headers: {
        Authorization: `Bearer ${process.env.DUB_TOKEN}`,
        'Content-Type': 'application/json',
    },
};
class Dub {
    constructor() {
        this.shortLinkDomain = 'dub.sh';
    }
    async linksStatistics(links) {
        return Promise.all(links.map(async (link) => {
            const response = await (await fetch(`https://api.dub.co/links/info?domain=${this.shortLinkDomain}&key=${link.split('/').pop()}`, options)).json();
            return {
                short: link,
                original: response.url,
                clicks: response.clicks,
            };
        }));
    }
    async convertLinkToShortLink(id, link) {
        return (await (await fetch(`https://api.dub.co/links`, {
            ...options,
            method: 'POST',
            body: JSON.stringify({
                url: link,
                tenantId: id,
                domain: this.shortLinkDomain,
            }),
        })).json()).shortLink;
    }
    async convertShortLinkToLink(shortLink) {
        return await (await (await fetch(`https://api.dub.co/links/info?domain=${shortLink}`, options)).json()).url;
    }
    // recursive functions that gets maximum 100 links per request if there are less than 100 links stop the recursion
    async getAllLinksStatistics(id, page = 1) {
        const response = await (await fetch(`https://api.dub.co/links?tenantId=${id}&page=${page}&pageSize=100`, options)).json();
        const mapLinks = response.links.map((link) => ({
            short: link,
            original: response.url,
            clicks: response.clicks,
        }));
        if (mapLinks.length < 100) {
            return mapLinks;
        }
        return [...mapLinks, ...(await this.getAllLinksStatistics(id, page + 1))];
    }
}
exports.Dub = Dub;


/***/ }),
/* 124 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Empty = void 0;
class Empty {
    constructor() {
        this.shortLinkDomain = 'empty';
    }
    async linksStatistics(links) {
        return [];
    }
    async convertLinkToShortLink(link) {
        return '';
    }
    async convertShortLinkToLink(shortLink) {
        return '';
    }
    getAllLinksStatistics(id, page) {
        return Promise.resolve([]);
    }
}
exports.Empty = Empty;


/***/ }),
/* 125 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ItemUserRepository = void 0;
const tslib_1 = __webpack_require__(3);
const prisma_service_1 = __webpack_require__(10);
const common_1 = __webpack_require__(4);
let ItemUserRepository = class ItemUserRepository {
    constructor(_itemUser) {
        this._itemUser = _itemUser;
    }
    addOrRemoveItem(add, userId, item) {
        if (!add) {
            return this._itemUser.model.itemUser.deleteMany({
                where: {
                    user: {
                        id: userId,
                    },
                    key: item,
                },
            });
        }
        return this._itemUser.model.itemUser.create({
            data: {
                key: item,
                user: {
                    connect: {
                        id: userId,
                    },
                },
            },
        });
    }
    getItems(userId) {
        return this._itemUser.model.itemUser.findMany({
            where: {
                user: {
                    id: userId,
                },
            },
        });
    }
};
exports.ItemUserRepository = ItemUserRepository;
exports.ItemUserRepository = ItemUserRepository = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _a : Object])
], ItemUserRepository);


/***/ }),
/* 126 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ItemUserService = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const item_user_repository_1 = __webpack_require__(125);
let ItemUserService = class ItemUserService {
    constructor(_itemUserRepository) {
        this._itemUserRepository = _itemUserRepository;
    }
    addOrRemoveItem(add, userId, item) {
        return this._itemUserRepository.addOrRemoveItem(add, userId, item);
    }
    getItems(userId) {
        return this._itemUserRepository.getItems(userId);
    }
};
exports.ItemUserService = ItemUserService;
exports.ItemUserService = ItemUserService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof item_user_repository_1.ItemUserRepository !== "undefined" && item_user_repository_1.ItemUserRepository) === "function" ? _a : Object])
], ItemUserService);


/***/ }),
/* 127 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ExtractContentService = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const jsdom_1 = __webpack_require__(7);
function findDepth(element) {
    let depth = 0;
    let elementer = element;
    while (elementer.parentNode) {
        depth++;
        // @ts-ignore
        elementer = elementer.parentNode;
    }
    return depth;
}
let ExtractContentService = class ExtractContentService {
    async extractContent(url) {
        const load = await (await fetch(url)).text();
        const dom = new jsdom_1.JSDOM(load);
        // only element that has a title
        const allTitles = Array.from(dom.window.document.querySelectorAll('*'))
            .filter((f) => {
            return (f.querySelector('h1') ||
                f.querySelector('h2') ||
                f.querySelector('h3') ||
                f.querySelector('h4') ||
                f.querySelector('h5') ||
                f.querySelector('h6'));
        })
            .reverse();
        const findTheOneWithMostTitles = allTitles.reduce((all, current) => {
            const depth = findDepth(current);
            const calculate = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].reduce((total, tag) => {
                if (current.querySelector(tag)) {
                    return total + 1;
                }
                return total;
            }, 0);
            if (calculate > all.total) {
                return { total: calculate, depth, element: current };
            }
            if (depth > all.depth) {
                return { total: calculate, depth, element: current };
            }
            return all;
        }, { total: 0, depth: 0, element: null });
        return findTheOneWithMostTitles?.element?.textContent?.replace(/\n/g, ' ').replace(/ {2,}/g, ' ');
        //
        // const allElements = Array.from(
        //   dom.window.document.querySelectorAll('*')
        // ).filter((f) => f.tagName !== 'SCRIPT');
        // const findIndex = allElements.findIndex((element) => {
        //   return (
        //     ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].indexOf(
        //       element.tagName.toLowerCase()
        //     ) > -1
        //   );
        // });
        //
        // if (!findIndex) {
        //   return false;
        // }
        //
        // return allElements
        //   .slice(findIndex)
        //   .map((element) => element.textContent)
        //   .filter((f) => {
        //     const trim = f?.trim();
        //     return (trim?.length || 0) > 0 && trim !== '\n';
        //   })
        //   .map((f) => f?.trim())
        //   .join('')
        //   .replace(/\n/g, ' ')
        //   .replace(/ {2,}/g, ' ');
    }
};
exports.ExtractContentService = ExtractContentService;
exports.ExtractContentService = ExtractContentService = tslib_1.__decorate([
    (0, common_1.Injectable)()
], ExtractContentService);


/***/ }),
/* 128 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AgenciesService = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const agencies_repository_1 = __webpack_require__(129);
const notification_service_1 = __webpack_require__(14);
let AgenciesService = class AgenciesService {
    constructor(_agenciesRepository, _notificationService) {
        this._agenciesRepository = _agenciesRepository;
        this._notificationService = _notificationService;
    }
    getAgencyByUser(user) {
        return this._agenciesRepository.getAgencyByUser(user);
    }
    getCount() {
        return this._agenciesRepository.getCount();
    }
    getAllAgencies() {
        return this._agenciesRepository.getAllAgencies();
    }
    getAllAgenciesSlug() {
        return this._agenciesRepository.getAllAgenciesSlug();
    }
    getAgencyInformation(agency) {
        return this._agenciesRepository.getAgencyInformation(agency);
    }
    async approveOrDecline(email, action, id) {
        await this._agenciesRepository.approveOrDecline(action, id);
        const agency = await this._agenciesRepository.getAgencyById(id);
        if (action === 'approve') {
            await this._notificationService.sendEmail(agency?.user?.email, 'Your Agency has been approved and added to Postiz 🚀', `
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Agency has been approved and added to Postiz 🚀</title>
</head>

<body style="font-family: Arial, sans-serif; margin: 0; padding: 0;">
  Hi there, <br /><br />
  Your agency ${agency?.name} has been added to Postiz!<br />
  You can <a href="https://postiz.com/agencies/${agency?.slug}">check it here</a><br />
  It will appear on the main agency of Postiz in the next 24 hours.<br /><br />
</body>
</html>`);
            return;
        }
        await this._notificationService.sendEmail(agency?.user?.email, 'Your Agency has been declined 😔', `
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Agency has been declined</title>
</head>

<body style="font-family: Arial, sans-serif; margin: 0; padding: 0;">
  Hi there, <br /><br />
  Your agency ${agency?.name} has been declined to Postiz!<br />
  If you think we have made a mistake, please reply to this email and let us know
</body>
</html>`);
        return;
    }
    async createAgency(user, body) {
        const agency = await this._agenciesRepository.createAgency(user, body);
        await this._notificationService.sendEmail('nevo@postiz.com', 'New agency created', `
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Template</title>
</head>

<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
    <table align="center" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; margin-top: 20px; border: 1px solid #ddd;">
        <tr>
            <td style="padding: 0 20px 20px 20px; text-align: center;">
                <!-- Website -->
                <a href="${body.website}" style="text-decoration: none; color: #007bff;">${body.website}</a>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px; text-align: center;">
                <!-- Social Media Links -->
                <p style="margin: 10px 0; font-size: 16px;">
                    Social Medias:
                    <a href="${body.facebook}" style="margin: 0 10px; text-decoration: none; color: #007bff;">${body.facebook}</a><br />
                    <a href="${body.instagram}" style="margin: 0 10px; text-decoration: none; color: #007bff;">${body.instagram}</a><br />
                    <a href="${body.twitter}" style="margin: 0 10px; text-decoration: none; color: #007bff;">${body.twitter}</a><br />
                    <a href="${body.linkedIn}" style="margin: 0 10px; text-decoration: none; color: #007bff;">${body.linkedIn}</a><br />
                    <a href="${body.youtube}" style="margin: 0 10px; text-decoration: none; color: #007bff;">${body.youtube}</a><br />
                    <a href="${body.tiktok}" style="margin: 0 10px; text-decoration: none; color: #007bff;">${body.tiktok}</a>
                </p>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px;">
                <!-- Short Description -->
                <h2 style="text-align: center; color: #333;">Logo</h2>
                <p style="text-align: center; color: #555; font-size: 16px;">
                  <img src="${body.logo.path}" width="60" height="60" />
                </p>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px;">
                <!-- Short Description -->
                <h2 style="text-align: center; color: #333;">Name</h2>
                <p style="text-align: center; color: #555; font-size: 16px;">${body.name}</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px;">
                <!-- Short Description -->
                <h2 style="text-align: center; color: #333;">Short Description</h2>
                <p style="text-align: center; color: #555; font-size: 16px;">${body.shortDescription}</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px;">
                <!-- Description -->
                <h2 style="text-align: center; color: #333;">Description</h2>
                <p style="text-align: center; color: #555; font-size: 16px;">${body.description}</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px;">
                <!-- Niches -->
                <h2 style="text-align: center; color: #333;">Niches</h2>
                <p style="text-align: center; color: #555; font-size: 16px;">${body.niches.join(',')}</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px; text-align: center; background-color: #000;">
                <a href="https://postiz.com/agencies/action/approve/${agency.id}" style="margin: 0 10px; text-decoration: none; color: #007bff;">To approve click here</a><br /><br /><br />
                <a href="https://postiz.com/agencies/action/decline/${agency.id}" style="margin: 0 10px; text-decoration: none; color: #007bff;">To decline click here</a><br /><br /><br />
            </td>
        </tr>
        <tr>
            <td style="padding: 20px; text-align: center; background-color: #f4f4f4;">
                <p style="color: #777; font-size: 14px;">&copy; 2024 Your Gitroom Limited All rights reserved.</p>
            </td>
        </tr>
    </table>
</body>

</html>
    `);
        return agency;
    }
};
exports.AgenciesService = AgenciesService;
exports.AgenciesService = AgenciesService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof agencies_repository_1.AgenciesRepository !== "undefined" && agencies_repository_1.AgenciesRepository) === "function" ? _a : Object, typeof (_b = typeof notification_service_1.NotificationService !== "undefined" && notification_service_1.NotificationService) === "function" ? _b : Object])
], AgenciesService);


/***/ }),
/* 129 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AgenciesRepository = void 0;
const tslib_1 = __webpack_require__(3);
const prisma_service_1 = __webpack_require__(10);
const common_1 = __webpack_require__(4);
let AgenciesRepository = class AgenciesRepository {
    constructor(_socialMediaAgencies, _socialMediaAgenciesNiche) {
        this._socialMediaAgencies = _socialMediaAgencies;
        this._socialMediaAgenciesNiche = _socialMediaAgenciesNiche;
    }
    getAllAgencies() {
        return this._socialMediaAgencies.model.socialMediaAgency.findMany({
            where: {
                deletedAt: null,
                approved: true,
            },
            include: {
                logo: true,
                niches: true,
            },
            orderBy: {
                createdAt: 'desc',
            }
        });
    }
    getCount() {
        return this._socialMediaAgencies.model.socialMediaAgency.count({
            where: {
                deletedAt: null,
                approved: true,
            },
        });
    }
    getAllAgenciesSlug() {
        return this._socialMediaAgencies.model.socialMediaAgency.findMany({
            where: {
                deletedAt: null,
                approved: true,
            },
            select: {
                slug: true,
            },
        });
    }
    approveOrDecline(action, id) {
        return this._socialMediaAgencies.model.socialMediaAgency.update({
            where: {
                id,
            },
            data: {
                approved: action === 'approve',
            },
        });
    }
    getAgencyById(id) {
        return this._socialMediaAgencies.model.socialMediaAgency.findFirst({
            where: {
                id,
                deletedAt: null,
                approved: true,
            },
            include: {
                logo: true,
                niches: true,
                user: true,
            },
        });
    }
    getAgencyInformation(agency) {
        return this._socialMediaAgencies.model.socialMediaAgency.findFirst({
            where: {
                slug: agency,
                deletedAt: null,
                approved: true,
            },
            include: {
                logo: true,
                niches: true,
            },
        });
    }
    getAgencyByUser(user) {
        return this._socialMediaAgencies.model.socialMediaAgency.findFirst({
            where: {
                userId: user.id,
                deletedAt: null,
            },
            include: {
                logo: true,
                niches: true,
            },
        });
    }
    async createAgency(user, body) {
        const insertAgency = await this._socialMediaAgencies.model.socialMediaAgency.upsert({
            where: {
                userId: user.id,
            },
            update: {
                userId: user.id,
                name: body.name,
                website: body.website,
                facebook: body.facebook,
                instagram: body.instagram,
                twitter: body.twitter,
                linkedIn: body.linkedIn,
                youtube: body.youtube,
                tiktok: body.tiktok,
                logoId: body.logo.id,
                shortDescription: body.shortDescription,
                description: body.description,
                approved: false,
            },
            create: {
                userId: user.id,
                name: body.name,
                website: body.website,
                facebook: body.facebook,
                instagram: body.instagram,
                twitter: body.twitter,
                linkedIn: body.linkedIn,
                youtube: body.youtube,
                tiktok: body.tiktok,
                logoId: body.logo.id,
                shortDescription: body.shortDescription,
                description: body.description,
                slug: body.name.toLowerCase().replace(/ /g, '-'),
                approved: false,
            },
            select: {
                id: true,
            },
        });
        await this._socialMediaAgenciesNiche.model.socialMediaAgencyNiche.deleteMany({
            where: {
                agencyId: insertAgency.id,
                niche: {
                    notIn: body.niches,
                },
            },
        });
        const currentNiche = await this._socialMediaAgenciesNiche.model.socialMediaAgencyNiche.findMany({
            where: {
                agencyId: insertAgency.id,
            },
            select: {
                niche: true,
            },
        });
        const addNewNiche = body.niches.filter((n) => !currentNiche.some((c) => c.niche === n));
        await this._socialMediaAgenciesNiche.model.socialMediaAgencyNiche.createMany({
            data: addNewNiche.map((n) => ({
                agencyId: insertAgency.id,
                niche: n,
            })),
        });
        return insertAgency;
    }
};
exports.AgenciesRepository = AgenciesRepository;
exports.AgenciesRepository = AgenciesRepository = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _a : Object, typeof (_b = typeof prisma_service_1.PrismaRepository !== "undefined" && prisma_service_1.PrismaRepository) === "function" ? _b : Object])
], AgenciesRepository);


/***/ }),
/* 130 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CustomersService = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const customers_repository_1 = __webpack_require__(100);
let CustomersService = class CustomersService {
    constructor(_customersRepository) {
        this._customersRepository = _customersRepository;
    }
    getCustomerList(orgId) {
        return this._customersRepository.getCustomerList(orgId);
    }
    getCustomerById(id, orgId) {
        return this._customersRepository.getCustomerById(id, orgId);
    }
    async createCustomer(body, orgId) {
        const res = await this._customersRepository.createCustomer(body, orgId);
        return res;
    }
    async updateCustomer(id, body, orgId) {
        const res = await this._customersRepository.updateCustomer(id, body, orgId);
        return res;
    }
    async deleteCustomer(id, orgId) {
        const res = await this._customersRepository.deleteCustomer(id, orgId);
        return res;
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof customers_repository_1.CustomersRepository !== "undefined" && customers_repository_1.CustomersRepository) === "function" ? _a : Object])
], CustomersService);


/***/ }),
/* 131 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PostsController = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const microservices_1 = __webpack_require__(6);
const posts_service_1 = __webpack_require__(105);
let PostsController = class PostsController {
    constructor(_postsService) {
        this._postsService = _postsService;
    }
    async post(data) {
        console.log('processing', data);
        return this._postsService.post(data.id);
    }
    async payout(data) {
        return this._postsService.payout(data.id, data.releaseURL);
    }
};
exports.PostsController = PostsController;
tslib_1.__decorate([
    (0, microservices_1.EventPattern)('post', microservices_1.Transport.REDIS),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], PostsController.prototype, "post", null);
tslib_1.__decorate([
    (0, microservices_1.EventPattern)('submit', microservices_1.Transport.REDIS),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], PostsController.prototype, "payout", null);
exports.PostsController = PostsController = tslib_1.__decorate([
    (0, common_1.Controller)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof posts_service_1.PostsService !== "undefined" && posts_service_1.PostsService) === "function" ? _a : Object])
], PostsController);


/***/ }),
/* 132 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BullMqModule = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const client_1 = __webpack_require__(29);
let BullMqModule = class BullMqModule {
};
exports.BullMqModule = BullMqModule;
exports.BullMqModule = BullMqModule = tslib_1.__decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [client_1.BullMqClient],
        exports: [client_1.BullMqClient],
    })
], BullMqModule);


/***/ }),
/* 133 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PlugsController = void 0;
const tslib_1 = __webpack_require__(3);
const common_1 = __webpack_require__(4);
const microservices_1 = __webpack_require__(6);
const integration_service_1 = __webpack_require__(45);
let PlugsController = class PlugsController {
    constructor(_integrationService) {
        this._integrationService = _integrationService;
    }
    async plug(data) {
        return this._integrationService.processPlugs(data);
    }
    async internalPlug(data) {
        return this._integrationService.processInternalPlug(data);
    }
};
exports.PlugsController = PlugsController;
tslib_1.__decorate([
    (0, microservices_1.EventPattern)('plugs', microservices_1.Transport.REDIS),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], PlugsController.prototype, "plug", null);
tslib_1.__decorate([
    (0, microservices_1.EventPattern)('internal-plugs', microservices_1.Transport.REDIS),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], PlugsController.prototype, "internalPlug", null);
exports.PlugsController = PlugsController = tslib_1.__decorate([
    (0, common_1.Controller)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof integration_service_1.IntegrationService !== "undefined" && integration_service_1.IntegrationService) === "function" ? _a : Object])
], PlugsController);


/***/ }),
/* 134 */
/***/ ((module) => {

module.exports = require("@nestjs/config");

/***/ }),
/* 135 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BullMqServer = void 0;
const microservices_1 = __webpack_require__(6);
const bullmq_1 = __webpack_require__(30);
const redis_service_1 = __webpack_require__(31);
class BullMqServer extends microservices_1.Server {
    constructor() {
        super(...arguments);
        this.workers = [];
    }
    /**
     * This method is triggered when you run "app.listen()".
     */
    listen(callback) {
        this.queues = [...this.messageHandlers.keys()].reduce((all, pattern) => {
            all.set(pattern, new bullmq_1.Queue(pattern, { connection: redis_service_1.ioRedis }));
            return all;
        }, new Map());
        this.workers = Array.from(this.messageHandlers).map(([pattern, handler]) => {
            return new bullmq_1.Worker(pattern, async (job) => {
                const stream$ = this.transformToObservable(await handler(job.data.payload, job));
                this.send(stream$, (packet) => {
                    if (packet.err) {
                        return job.discard();
                    }
                    return true;
                });
            }, {
                connection: redis_service_1.ioRedis,
                removeOnComplete: {
                    count: 0,
                },
                removeOnFail: {
                    count: 0,
                },
            });
        });
        callback();
    }
    /**
     * This method is triggered on application shutdown.
     */
    close() {
        this.workers.map((worker) => worker.close());
        this.queues.forEach((queue) => queue.close());
        return true;
    }
}
exports.BullMqServer = BullMqServer;


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
const core_1 = __webpack_require__(1);
const app_module_1 = __webpack_require__(2);
const strategy_1 = __webpack_require__(135);
async function bootstrap() {
    // some comment again
    const app = await core_1.NestFactory.createMicroservice(app_module_1.AppModule, {
        strategy: new strategy_1.BullMqServer()
    });
    await app.listen();
}
bootstrap();

})();

var __webpack_export_target__ = exports;
for(var __webpack_i__ in __webpack_exports__) __webpack_export_target__[__webpack_i__] = __webpack_exports__[__webpack_i__];
if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });
/******/ })()
;
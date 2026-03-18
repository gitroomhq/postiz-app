import { __awaiter } from "tslib";
import { MastraService } from "./mastra.service";
import { MCPServer } from '@mastra/mcp';
import { randomUUID } from 'crypto';
import { OrganizationService } from "../database/prisma/organizations/organization.service";
import { OAuthService } from "../database/prisma/oauth/oauth.service";
import { runWithContext } from './async.storage';
export const startMcp = (app) => __awaiter(void 0, void 0, void 0, function* () {
    const mastraService = app.get(MastraService, { strict: false });
    const organizationService = app.get(OrganizationService, { strict: false });
    const oauthService = app.get(OAuthService, { strict: false });
    const resolveAuth = (token) => __awaiter(void 0, void 0, void 0, function* () {
        if (token.startsWith('pos_')) {
            const authorization = yield oauthService.getOrgByOAuthToken(token);
            if (!authorization)
                return null;
            return authorization.organization;
        }
        return organizationService.getOrgByApiKey(token);
    });
    const mastra = yield mastraService.mastra();
    const agent = mastra.getAgent('postiz');
    const tools = yield agent.getTools();
    const serverConfig = {
        name: 'Postiz MCP',
        version: '1.0.0',
        tools,
        agents: { postiz: agent },
    };
    const server = new MCPServer(serverConfig);
    app.use('/mcp', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        // Skip if this is the /mcp/:id route
        if (req.path !== '/' && req.path !== '') {
            next();
            return;
        }
        // @ts-ignore
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Expose-Headers', '*');
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
            return;
        }
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            res.status(401).send('Missing Authorization header');
            return;
        }
        // @ts-ignore
        req.auth = yield resolveAuth(token);
        // @ts-ignore
        if (!req.auth) {
            res.status(401).send('Invalid API Key or OAuth token');
            return;
        }
        const url = new URL('/mcp', process.env.NEXT_PUBLIC_BACKEND_URL);
        // @ts-ignore
        yield runWithContext({ requestId: token, auth: req.auth }, () => __awaiter(void 0, void 0, void 0, function* () {
            yield server.startHTTP({
                url,
                httpPath: url.pathname,
                options: {
                    sessionIdGenerator: () => {
                        return randomUUID();
                    },
                },
                req,
                res,
            });
        }));
    }));
    app.use('/mcp/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        // @ts-ignore
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Expose-Headers', '*');
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
            return;
        }
        // @ts-ignore
        req.auth = yield organizationService.getOrgByApiKey(req.params.id);
        // @ts-ignore
        if (!req.auth) {
            res.status(400).send('Invalid API Key');
            return;
        }
        const url = new URL(`/mcp/${req.params.id}`, process.env.NEXT_PUBLIC_BACKEND_URL);
        yield runWithContext(
        // @ts-ignore
        { requestId: req.params.id, auth: req.auth }, () => __awaiter(void 0, void 0, void 0, function* () {
            yield server.startHTTP({
                url,
                httpPath: url.pathname,
                options: {
                    sessionIdGenerator: () => {
                        return randomUUID();
                    },
                },
                req,
                res,
            });
        }));
    }));
    app.use(['/sse/:id', '/message/:id'], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        // @ts-ignore
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Expose-Headers', '*');
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
            return;
        }
        // @ts-ignore
        req.auth = yield organizationService.getOrgByApiKey(req.params.id);
        // @ts-ignore
        if (!req.auth) {
            res.status(400).send('Invalid API Key');
            return;
        }
        const url = new URL(req.originalUrl, process.env.NEXT_PUBLIC_BACKEND_URL);
        yield runWithContext(
        // @ts-ignore
        { requestId: req.params.id, auth: req.auth }, () => __awaiter(void 0, void 0, void 0, function* () {
            yield new MCPServer(serverConfig).startSSE({
                url,
                ssePath: `/sse/${req.params.id}`,
                messagePath: `/message/${req.params.id}`,
                req,
                res,
            });
        }));
    }));
});
//# sourceMappingURL=start.mcp.js.map
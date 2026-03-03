import { INestApplication } from '@nestjs/common';
import { Request, Response } from 'express';
import { MastraService } from '@gitroom/nestjs-libraries/chat/mastra.service';
import { MCPServer } from '@mastra/mcp';
import { randomUUID } from 'crypto';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { OAuthService } from '@gitroom/nestjs-libraries/database/prisma/oauth/oauth.service';
import { runWithContext } from './async.storage';
export const startMcp = async (app: INestApplication) => {
  const mastraService = app.get(MastraService, { strict: false });
  const organizationService = app.get(OrganizationService, { strict: false });
  const oauthService = app.get(OAuthService, { strict: false });

  const resolveAuth = async (token: string) => {
    if (token.startsWith('pos_')) {
      const authorization = await oauthService.getOrgByOAuthToken(token);
      if (!authorization) return null;
      return authorization.organization;
    }
    return organizationService.getOrgByApiKey(token);
  };

  const mastra = await mastraService.mastra();
  const agent = mastra.getAgent('postiz');
  const tools = await agent.getTools();

  const serverConfig = {
    name: 'Postiz MCP',
    version: '1.0.0',
    tools,
    agents: { postiz: agent },
  };

  const server = new MCPServer(serverConfig);

  app.use('/mcp', async (req: Request, res: Response, next: () => void) => {
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

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.status(401).send('Missing Authorization header');
      return;
    }

    // @ts-ignore
    req.auth = await resolveAuth(token);
    // @ts-ignore
    if (!req.auth) {
      res.status(401).send('Invalid API Key or OAuth token');
      return;
    }

    const url = new URL('/mcp', process.env.NEXT_PUBLIC_BACKEND_URL);

    // @ts-ignore
    await runWithContext({ requestId: token, auth: req.auth }, async () => {
      await server.startHTTP({
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
    });
  });

  app.use('/mcp/:id', async (req: Request, res: Response) => {
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
    req.auth = await organizationService.getOrgByApiKey(req.params.id);
    // @ts-ignore
    if (!req.auth) {
      res.status(400).send('Invalid API Key');
      return;
    }

    const url = new URL(
      `/mcp/${req.params.id}`,
      process.env.NEXT_PUBLIC_BACKEND_URL
    );

    await runWithContext(
      // @ts-ignore
      { requestId: req.params.id, auth: req.auth },
      async () => {
        await server.startHTTP({
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
      }
    );
  });

  app.use(['/sse/:id', '/message/:id'], async (req: Request, res: Response) => {
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
    req.auth = await organizationService.getOrgByApiKey(req.params.id);
    // @ts-ignore
    if (!req.auth) {
      res.status(400).send('Invalid API Key');
      return;
    }

    const url = new URL(req.originalUrl, process.env.NEXT_PUBLIC_BACKEND_URL);

    await runWithContext(
      // @ts-ignore
      { requestId: req.params.id, auth: req.auth },
      async () => {
        await new MCPServer(serverConfig).startSSE({
          url,
          ssePath: `/sse/${req.params.id}`,
          messagePath: `/message/${req.params.id}`,
          req,
          res,
        });
      }
    );
  });
};

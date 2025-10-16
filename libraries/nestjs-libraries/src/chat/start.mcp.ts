import { INestApplication } from '@nestjs/common';
import { Request, Response } from 'express';
import { MastraService } from '@gitroom/nestjs-libraries/chat/mastra.service';
import { MCPServer } from '@mastra/mcp';
import { randomUUID } from 'crypto';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { runWithContext } from './async.storage';
export const startMcp = async (app: INestApplication) => {
  const mastraService = app.get(MastraService, { strict: false });
  const organizationService = app.get(OrganizationService, { strict: false });

  const mastra = await mastraService.mastra();
  const agent = mastra.getAgent('postiz');
  const tools = await agent.getTools();

  const server = new MCPServer({
    name: 'Postiz MCP',
    version: '1.0.0',
    tools,
    agents: { postiz: agent },
  });

  app.use(
    '/mcp/:id',
    async (req: Request, res: Response) => {
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
        return ;
      }

      const url = new URL(
        `/mcp/${req.params.id}`,
        process.env.NEXT_PUBLIC_BACKEND_URL
      );

      // @ts-ignore
      await runWithContext({ requestId: req.params.id, auth: req.auth }, async () => {
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
    }
  );
};

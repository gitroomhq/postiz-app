import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createTool } from '@mastra/core/tools';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  StreamableHTTPClientTransport,
  StreamableHTTPError,
} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  CallToolResult,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { getRelay } from '@gitroom/nestjs-libraries/chat/async.storage';
import { ssrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';
import { isSafePublicHttpsUrl } from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';
import { OAuthService } from '@gitroom/nestjs-libraries/database/prisma/oauth/oauth.service';
import { LoadToolsService } from '@gitroom/nestjs-libraries/chat/load.tools.service';

export interface SelfHostedInstance {
  mcpUrl: string;
  apiKey: string;
}

// Every Postiz MCP server since v2.19.0 (the first one with the API key /mcp
// route) has these; a server without them is not a Postiz instance
const requiredTools = ['integrationList', 'integrationSchedulePostTool'];

// Tool results are small JSON, an instance never needs this server to hold
// more than this in memory
const maxResponseBytes = 10 * 1024 * 1024;

// The address comes from a public endpoint: the pinned-DNS SSRF guard stays
// on whatever DISABLE_SSRF_PROTECTION says, no redirects and a cap on the body
const instanceFetch = async (url: string | URL, init?: RequestInit) => {
  const response = await fetch(url, {
    ...init,
    redirect: 'error',
    // @ts-ignore - undici option, not in lib.dom fetch types
    dispatcher: ssrfSafeDispatcher,
  });

  if (Number(response.headers.get('content-length')) > maxResponseBytes) {
    await response.body?.cancel();
    throw new Error('The response of the instance is too large');
  }
  if (!response.body) {
    return response;
  }

  let received = 0;
  const capped = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        received += chunk.byteLength;
        if (received > maxResponseBytes) {
          controller.error(
            new Error('The response of the instance is too large')
          );
          return;
        }
        controller.enqueue(chunk);
      },
    })
  );

  return new Response(capped, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};

// Postiz Cloud relays the MCP connection of a self-hosted Postiz: the person
// brings the instance and its API key on the consent screen ("Use
// self-hosted"), and the tool calls of that connection run on the instance
@Injectable()
export class McpRelayService {
  constructor(
    private _oauthService: OAuthService,
    private _loadToolsService: LoadToolsService
  ) {}

  // Turns what the person typed on the consent screen into the MCP endpoint
  // of their instance, and checks that the API key works there
  async connect(
    instanceUrl: string,
    apiKey?: string
  ): Promise<SelfHostedInstance> {
    const value = instanceUrl.trim();
    let url: URL;
    try {
      url = new URL(
        /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`
      );
    } catch {
      throw new HttpException(
        'Enter the address of your Postiz instance, for example https://postiz.example.com',
        HttpStatus.BAD_REQUEST
      );
    }

    // An address with credentials (an email like me@company.com reads as
    // user "me" on company.com) is never sent anywhere
    if (url.username || url.password) {
      throw new HttpException(
        'Enter the address of your Postiz instance, for example https://postiz.example.com',
        HttpStatus.BAD_REQUEST
      );
    }

    // The MCP URL from Settings > Developers carries the API key:
    // <backend>/mcp/<key>
    const fromSettings = url.pathname.match(/^(.*?)\/mcp\/([^/]+)\/?$/);
    const key =
      apiKey?.trim() || (fromSettings && decodeURIComponent(fromSettings[2]));
    if (!key) {
      throw new HttpException(
        'Enter the API key of your Postiz instance',
        HttpStatus.BAD_REQUEST
      );
    }

    if (!(await isSafePublicHttpsUrl(url.origin))) {
      throw new HttpException(
        'Your Postiz instance must be reachable from the internet over https',
        HttpStatus.BAD_REQUEST
      );
    }

    // The docker image serves the backend under /api of the same domain,
    // a backend on its own domain answers on /mcp
    const path = (fromSettings ? fromSettings[1] : url.pathname)
      .replace(/\/+$/, '')
      .replace(/\/mcp$/, '');
    const candidates = path.endsWith('/api')
      ? [`${url.origin}${path}/mcp`]
      : [`${url.origin}${path}/api/mcp`, `${url.origin}${path}/mcp`];

    for (const mcpUrl of candidates) {
      let tools: string[];
      try {
        tools = await this.withClient({ mcpUrl, apiKey: key }, async (client) =>
          (await client.listTools(undefined, { timeout: 10000 })).tools.map(
            (tool) => tool.name
          )
        );
      } catch (err) {
        if (err instanceof StreamableHTTPError && err.code === 401) {
          throw new HttpException(
            'Your Postiz instance rejected this API key',
            HttpStatus.BAD_REQUEST
          );
        }
        if (err instanceof StreamableHTTPError && err.code === 403) {
          throw new HttpException(
            'Your Postiz instance refused the connection (403), make sure nothing in front of it blocks requests from Postiz Cloud',
            HttpStatus.BAD_REQUEST
          );
        }
        // nothing that speaks MCP at this address, try the next one
        continue;
      }

      if (!requiredTools.every((name) => tools.includes(name))) {
        throw new HttpException(
          `${url.origin} does not look like a Postiz instance, or it runs a version older than v2.19.0`,
          HttpStatus.BAD_REQUEST
        );
      }

      // Every tool any install has must run on the instance, an older one
      // would answer some calls with errors (tools of optional features, like
      // clipping, depend on the instance setup, not its version)
      const missing = this._loadToolsService
        .coreToolNames()
        .filter((name) => !tools.includes(name));
      if (missing.length) {
        throw new HttpException(
          `Your Postiz instance is missing tools this connection needs (${missing.join(', ')}). Update it to the latest Postiz version and connect again`,
          HttpStatus.BAD_REQUEST
        );
      }

      return { mcpUrl, apiKey: key };
    }

    throw new HttpException(
      `Could not find a Postiz MCP server at ${url.origin}. Paste the MCP URL from Settings > Developers of your instance, and make sure it runs Postiz v2.19.0 or newer`,
      HttpStatus.BAD_REQUEST
    );
  }

  // The same definitions this server serves everyone (the listing stays the
  // reviewed one, and nothing an instance returns ends up in a description),
  // run by the instance. Pass tools without ui:// widgets - those upload to
  // this server - and _meta (a tool's widget link) is dropped too
  tools(source: Record<string, any>) {
    return Object.fromEntries(
      Object.entries(source).map(([name, tool]) => [
        name,
        createTool({
          id: tool.id,
          description: tool.description,
          inputSchema: tool.inputSchema,
          outputSchema: tool.outputSchema,
          mcp: { annotations: tool.mcp?.annotations },
          execute: async (inputData: Record<string, unknown>, context: any) => {
            const instance = getRelay();
            if (!instance) {
              throw new Error(
                'This connection is not linked to a self-hosted instance'
              );
            }

            let result: CallToolResult;
            try {
              result = await this.callTool(
                instance,
                name,
                inputData,
                context?.mcp?.extra?.signal
              );
            } catch (err) {
              return this.failure(tool, (err as Error).message);
            }

            const text = this.text(result);
            if (!tool.outputSchema) {
              return text;
            }

            // The structured result is what the outputSchema describes;
            // instances whose tool had no outputSchema yet answer with JSON text
            let output: unknown = result.structuredContent;
            if (output === undefined) {
              try {
                output = JSON.parse(text);
              } catch {
                return this.failure(
                  tool,
                  text ||
                    `${name} returned an unexpected answer from your Postiz instance`
                );
              }
            }

            // an instance on another Postiz version can answer in another shape
            const check = await tool.outputSchema['~standard']?.validate(output);
            if (check?.issues) {
              return this.failure(
                tool,
                `Your Postiz instance answered ${name} in a format this connection does not know, update the instance to the latest Postiz version`
              );
            }

            return output;
          },
        }),
      ])
    );
  }

  async callTool(
    instance: SelfHostedInstance & { id?: string },
    name: string,
    args: Record<string, unknown>,
    signal?: AbortSignal
  ) {
    let result: CallToolResult;
    try {
      result = (await this.withClient(instance, (client) =>
        client.callTool({ name, arguments: args }, undefined, {
          signal,
          // under the 100 seconds Cloudflare gives a request to the MCP host
          timeout: 90000,
        })
      )) as CallToolResult;
    } catch (err) {
      // The key was rotated (or the instance reset): the connection can never
      // work again, so it goes away and the client asks to connect again
      if (err instanceof StreamableHTTPError && err.code === 401 && instance.id) {
        await this._oauthService.deleteSelfHostedAuthorization(instance.id);
      }
      throw new Error(this.describeError(instance, name, err));
    }

    if (result.isError) {
      const text = this.text(result);
      // an instance older than this server doesn't have every tool yet
      if (text.startsWith('Unknown tool:')) {
        throw new Error(
          `${name} is not available on your Postiz instance: the feature it needs is not set up there, or the instance needs an update to the latest Postiz version`
        );
      }
      // arguments this server validated but an older instance doesn't accept
      if (text.startsWith('Tool validation failed')) {
        throw new Error(
          `Your Postiz instance runs an older version of ${name}, update it to the latest Postiz version to use it`
        );
      }
      throw new Error(text || `${name} failed on your Postiz instance`);
    }

    return result;
  }

  private async withClient<T>(
    instance: SelfHostedInstance,
    run: (client: Client) => Promise<T>
  ) {
    const transport = new StreamableHTTPClientTransport(
      new URL(instance.mcpUrl),
      {
        requestInit: {
          headers: { Authorization: `Bearer ${instance.apiKey}` },
        },
        fetch: instanceFetch,
      }
    );
    const client = new Client({ name: 'Postiz Cloud', version: '1.0.0' });

    try {
      await client.connect(transport, { timeout: 10000 });
      return await run(client);
    } finally {
      // instances older than v2.23.0 keep a session per connection, end it
      // so relayed calls don't pile them up
      if (transport.sessionId) {
        await transport.terminateSession().catch(() => {});
      }
      await client.close().catch(() => {});
    }
  }

  // A tool whose output has an `error` field answers normally with it (the
  // clients count error results against the connector), any other one
  // returns an error result
  private async failure(tool: any, message: string) {
    if (!tool.outputSchema) {
      return message;
    }
    const check = await tool.outputSchema['~standard']?.validate({
      error: message,
    });
    if (check && !check.issues) {
      return { error: message };
    }
    throw new Error(message);
  }

  private text(result: CallToolResult) {
    return (result.content || [])
      .filter((part) => part.type === 'text')
      .map((part) => (part as { text: string }).text)
      .join('\n')
      .trim();
  }

  // What the model (and so the person) reads when the instance can't run a
  // tool - it has to say what to do next
  private describeError(
    instance: SelfHostedInstance,
    name: string,
    err: unknown
  ) {
    const origin = new URL(instance.mcpUrl).origin;
    if (err instanceof StreamableHTTPError && err.code === 401) {
      return `Your Postiz instance (${origin}) rejected the saved API key, it was probably rotated, so this connection was removed. Connect Postiz again to keep using your instance`;
    }
    if (err instanceof StreamableHTTPError && err.code === 403) {
      return `Your Postiz instance (${origin}) refused the request (403), make sure nothing in front of it blocks requests from Postiz Cloud`;
    }
    if (err instanceof McpError && err.code === ErrorCode.RequestTimeout) {
      return `Your Postiz instance (${origin}) did not answer ${name} in time`;
    }
    if (err instanceof McpError) {
      return `Your Postiz instance (${origin}) could not run ${name}: ${err.message}`;
    }
    return `Could not reach your Postiz instance (${origin}): ${
      err instanceof Error ? err.message : String(err)
    }. Make sure it is online and reachable from the internet`;
  }
}

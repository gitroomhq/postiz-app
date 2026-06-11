import { Container, getContainer } from '@cloudflare/containers';

/**
 * Postiz on Cloudflare — fronting Worker.
 *
 * Routes:
 *   /__backup/*                 container <-> R2 state backup/restore (auth:
 *                               INTERNAL_SECRET). The container has no S3
 *                               credentials; the Worker's R2 binding is the
 *                               only path to durable storage.
 *   /__ai/v1/images/generations OpenAI-images-shaped endpoint backed by
 *                               Workers AI *through the AI Gateway*. The
 *                               gateway compat endpoint doesn't serve
 *                               images/generations (error 2019), so this is
 *                               the sanctioned Worker-side exception — see
 *                               ~/.claude/CLAUDE.md "Inside a Worker".
 *   everything else             proxied to the container (nginx :5000).
 *
 * scheduled(): keep-alive ping so the in-container Temporal timers
 * (scheduled posts) keep firing; container cold-starts restore from R2.
 */

interface Env {
  POSTIZ_CONTAINER: DurableObjectNamespace<PostizContainer>;
  BACKUPS: R2Bucket;
  AI: Ai;
  PUBLIC_URL: string;
  CF_ACCOUNT_ID: string;
  CF_GATEWAY_ID: string;
  AI_TEXT_MODEL: string;
  IMAGE_MODEL: string;
  DISABLE_REGISTRATION: string;
  // secrets
  JWT_SECRET: string;
  CF_AIG_TOKEN: string;
  INTERNAL_SECRET: string;
  // optional: external stores (skip in-container postgres/redis when set)
  DATABASE_URL?: string;
  REDIS_URL?: string;
}

const containerEnv = (env: Env): Record<string, string> => {
  const publicUrl = env.PUBLIC_URL.replace(/\/$/, '');
  const vars: Record<string, string> = {
    MAIN_URL: publicUrl,
    FRONTEND_URL: publicUrl,
    NEXT_PUBLIC_BACKEND_URL: `${publicUrl}/api`,
    BACKEND_INTERNAL_URL: 'http://127.0.0.1:3000',
    JWT_SECRET: env.JWT_SECRET,
    IS_GENERAL: 'true',
    DISABLE_REGISTRATION: env.DISABLE_REGISTRATION || 'false',
    STORAGE_PROVIDER: 'local',
    UPLOAD_DIRECTORY: '/uploads',
    NEXT_PUBLIC_UPLOAD_DIRECTORY: '/uploads',
    API_LIMIT: '30',
    // AI Gateway routing (consumed by ai.gateway.config.ts in the app)
    CF_ACCOUNT_ID: env.CF_ACCOUNT_ID,
    CF_GATEWAY_ID: env.CF_GATEWAY_ID,
    CF_AIG_TOKEN: env.CF_AIG_TOKEN,
    AI_TEXT_MODEL: env.AI_TEXT_MODEL,
    AI_IMAGE_BASE_URL: `${publicUrl}/__ai/v1`,
    // several feature gates check OPENAI_API_KEY truthiness
    OPENAI_API_KEY: env.CF_AIG_TOKEN,
    // backup plumbing
    BACKUP_URL: `${publicUrl}/__backup`,
    INTERNAL_SECRET: env.INTERNAL_SECRET,
  };
  if (env.DATABASE_URL) vars.DATABASE_URL = env.DATABASE_URL;
  if (env.REDIS_URL) vars.REDIS_URL = env.REDIS_URL;
  return vars;
};

export class PostizContainer extends Container<Env> {
  defaultPort = 5000;
  // The cron keep-alive (every 5 min) keeps it warm; this is the backstop.
  sleepAfter = '6h';

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.envVars = containerEnv(env);
  }

  // RPC for /__admin/restart: tear the instance down so the next request
  // boots a fresh container on the latest deployed image (state restores
  // from R2). Long-lived instances otherwise keep serving the old image.
  async restartContainer(): Promise<void> {
    await this.destroy();
  }
}

const unauthorized = () => new Response('unauthorized', { status: 401 });

const checkAuth = (request: Request, secret: string): boolean => {
  const header = request.headers.get('authorization') || '';
  return !!secret && header === `Bearer ${secret}`;
};

async function handleBackup(request: Request, env: Env): Promise<Response> {
  if (!checkAuth(request, env.INTERNAL_SECRET)) return unauthorized();

  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.replace(/^\/__backup\/?/, ''));

  // GET /__backup/?list=<prefix> -> newline-separated keys (shell-friendly)
  const listPrefix = url.searchParams.get('list');
  if (request.method === 'GET' && listPrefix !== null) {
    const keys: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await env.BACKUPS.list({ prefix: listPrefix, cursor });
      keys.push(...page.objects.map((o) => o.key));
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    return new Response(keys.join('\n'), {
      headers: { 'content-type': 'text/plain' },
    });
  }

  if (!key) return new Response('missing key', { status: 400 });

  if (request.method === 'PUT') {
    await env.BACKUPS.put(key, request.body);
    return new Response('ok');
  }

  if (request.method === 'GET') {
    const object = await env.BACKUPS.get(key);
    if (!object) return new Response('not found', { status: 404 });
    return new Response(object.body, {
      headers: { 'content-type': 'application/octet-stream' },
    });
  }

  return new Response('method not allowed', { status: 405 });
}

async function handleImageGeneration(
  request: Request,
  env: Env
): Promise<Response> {
  // The container authenticates with the AI Gateway token (it is already a
  // shared secret on both sides); INTERNAL_SECRET also accepted.
  if (
    !checkAuth(request, env.CF_AIG_TOKEN) &&
    !checkAuth(request, env.INTERNAL_SECRET)
  ) {
    return unauthorized();
  }
  if (request.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  const body = (await request.json().catch(() => null)) as {
    prompt?: string;
  } | null;
  if (!body?.prompt) {
    return Response.json(
      { error: { message: 'prompt is required' } },
      { status: 400 }
    );
  }

  // Worker-side calls cannot resolve dynamic/* routes (env.AI.run 404s on
  // them), so we call a concrete Workers AI model id while still routing
  // through the gateway for caching/observability/cost analytics. Swap back
  // to dynamic/image_gen when the binding path supports it upstream.
  const result = (await env.AI.run(
    env.IMAGE_MODEL as Parameters<Ai['run']>[0],
    { prompt: body.prompt },
    { gateway: { id: env.CF_GATEWAY_ID } }
  )) as { image?: string };

  if (!result?.image) {
    return Response.json(
      { error: { message: 'image generation returned no data' } },
      { status: 502 }
    );
  }

  // OpenAI images API response shape (b64); mime is sniffed downstream.
  return Response.json({
    created: Math.floor(Date.now() / 1000),
    data: [{ b64_json: result.image }],
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/__backup')) {
      return handleBackup(request, env);
    }
    if (url.pathname === '/__admin/restart') {
      if (!checkAuth(request, env.INTERNAL_SECRET)) return unauthorized();
      if (request.method !== 'POST') {
        return new Response('method not allowed', { status: 405 });
      }
      await getContainer(env.POSTIZ_CONTAINER).restartContainer();
      return new Response('container stopped; next request boots the latest image\n');
    }
    if (url.pathname === '/__ai/v1/images/generations') {
      return handleImageGeneration(request, env);
    }
    if (url.pathname.startsWith('/__ai')) {
      return new Response('not found', { status: 404 });
    }

    return getContainer(env.POSTIZ_CONTAINER).fetch(request);
  },

  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    // Wake/keep the container so Temporal timers and the backup loop run.
    await getContainer(env.POSTIZ_CONTAINER)
      .fetch(new Request('https://keepalive.internal/api/'))
      .catch((err) => console.log('keepalive failed', String(err)));
  },
} satisfies ExportedHandler<Env>;

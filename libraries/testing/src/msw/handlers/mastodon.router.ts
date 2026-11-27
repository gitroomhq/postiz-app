/**
 * A fake Mastodon instance, written against Fetch Request/Response so the same
 * behaviour can be mounted both in-process (MSW, see ../mastodon.server.ts) and
 * as a real HTTP server for E2E, where the backend and orchestrator are
 * separate processes.
 *
 * Mastodon because every call site reads process.env.MASTODON_URL, so
 * redirecting it needs no process patching, and because it implements the full
 * postPending -> checkPostStatus -> finalizePost state machine.
 */

export type RecordedRequest = {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
};

export type ProgrammedResponse = {
  path: string;
  status: number;
  body?: unknown;
  /** Serve this response `times` times, then fall back to normal behaviour. */
  times?: number;
};

export class MastodonMock {
  requests: RecordedRequest[] = [];
  program: ProgrammedResponse[] = [];

  private sequence = 0;
  /** Idempotency-Key -> the status it created, mirroring Mastodon's dedupe. */
  private statusesByKey = new Map<string, { id: string }>();
  /** Media id -> how many more polls should answer 206 (still processing). */
  private mediaProcessing = new Map<string, number>();

  reset() {
    this.requests = [];
    this.program = [];
    this.sequence = 0;
    this.statusesByKey.clear();
    this.mediaProcessing.clear();
  }

  /** Make `mediaId` report "still processing" for the next `times` polls. */
  setMediaProcessing(mediaId: string, times: number) {
    this.mediaProcessing.set(mediaId, times);
  }

  requestsTo(path: string) {
    return this.requests.filter((r) => r.path === path);
  }

  async handle(request: Request): Promise<Response | undefined> {
    const url = new URL(request.url);
    const path = url.pathname;
    const contentType = request.headers.get('content-type') || '';

    let body: unknown;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      if (
        contentType.includes('multipart/form-data') ||
        contentType.includes('x-www-form-urlencoded')
      ) {
        body = Object.fromEntries((await request.formData()).entries());
      } else if (contentType.includes('json')) {
        body = await request.json().catch(() => undefined);
      } else {
        body = await request.text().catch(() => undefined);
      }
    }

    this.requests.push({
      method: request.method,
      path,
      headers: Object.fromEntries(request.headers.entries()),
      body,
    });

    const programmed = this.program.find((p) => p.path === path);
    if (programmed) {
      if (programmed.times === undefined || --programmed.times <= 0) {
        this.program = this.program.filter((p) => p !== programmed);
      }
      return Response.json(programmed.body ?? { error: 'programmed' }, {
        status: programmed.status,
      });
    }

    return this.route(request, path);
  }

  private route(request: Request, path: string): Response | undefined {
    // --- OAuth, used by the connect-channel flow -------------------------
    if (path === '/oauth/token' && request.method === 'POST') {
      return Response.json({
        access_token: 'e2e-mastodon-token',
        token_type: 'Bearer',
        scope: 'write:statuses profile write:media',
        created_at: Date.now(),
      });
    }

    if (path === '/api/v1/accounts/verify_credentials') {
      return Response.json({
        id: 'mock-account-1',
        username: 'e2e',
        acct: 'e2e',
        display_name: 'E2E Mastodon',
        avatar: `${new URL(request.url).origin}/avatar.png`,
      });
    }

    // --- media -----------------------------------------------------------
    if (path === '/api/v1/media' && request.method === 'POST') {
      // 202 means "accepted, still processing"; the provider treats the id as
      // usable immediately and polls for readiness in checkPostStatus.
      return Response.json({ id: `media-${++this.sequence}` }, { status: 202 });
    }

    if (path.startsWith('/api/v1/media/')) {
      const mediaId = path.split('/').pop() as string;
      const remaining = this.mediaProcessing.get(mediaId) ?? 0;

      if (remaining > 0) {
        this.mediaProcessing.set(mediaId, remaining - 1);
        return new Response(null, { status: 206 });
      }

      return Response.json({ id: mediaId }, { status: 200 });
    }

    // --- the assertion target -------------------------------------------
    if (path === '/api/v1/statuses' && request.method === 'POST') {
      const key = request.headers.get('idempotency-key');

      if (key && this.statusesByKey.has(key)) {
        return Response.json(this.statusesByKey.get(key));
      }

      const status = { id: `status-${++this.sequence}` };
      if (key) {
        this.statusesByKey.set(key, status);
      }

      return Response.json(status);
    }

    if (path === '/avatar.png') {
      return new Response('x', { status: 200 });
    }

    return undefined;
  }
}

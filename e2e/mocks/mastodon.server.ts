import { createServer } from 'node:http';
import { MastodonMock } from '@gitroom/testing/msw/handlers/mastodon.router';

/**
 * The fake Mastodon instance, mounted as a real HTTP server.
 *
 * E2E runs the backend and orchestrator as separate processes, so an in-process
 * interceptor could neither reach them nor report back. Pointing MASTODON_URL
 * at this server needs no process patching at all, and the /__mock/ endpoints
 * give Playwright a way to assert that a post really arrived at the provider.
 */
const mock = new MastodonMock();
// Derived from the same variable everything else reads, so pointing
// MOCK_MASTODON_URL at another port cannot silently leave the server behind.
const port = Number(new URL(process.env.MOCK_MASTODON_URL ?? 'http://127.0.0.1:4600').port);

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks);

  // --- control plane, used by the Playwright fixtures ---------------------
  if (url.pathname.startsWith('/__mock/')) {
    if (url.pathname === '/__mock/requests') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(mock.requests));
      return;
    }

    if (url.pathname === '/__mock/reset') {
      mock.reset();
      res.writeHead(204);
      res.end();
      return;
    }

    if (url.pathname === '/__mock/program') {
      mock.program.push(...JSON.parse(raw.toString() || '[]'));
      res.writeHead(204);
      res.end();
      return;
    }

    if (url.pathname === '/__mock/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
  }

  const request = new Request(url, {
    method: req.method,
    headers: req.headers as Record<string, string>,
    ...(req.method === 'GET' || req.method === 'HEAD'
      ? {}
      : { body: raw.length ? raw : undefined }),
  });

  const response = await mock.handle(request);

  if (!response) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end('{}');
    return;
  }

  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  res.end(Buffer.from(await response.arrayBuffer()));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[mock-mastodon] listening on http://127.0.0.1:${port}`);
});

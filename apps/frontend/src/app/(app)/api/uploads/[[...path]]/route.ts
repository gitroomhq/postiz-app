import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, statSync } from 'fs';
import { resolve, sep } from 'path';
// @ts-ignore
import mime from 'mime';
async function* nodeStreamToIterator(stream: any) {
  for await (const chunk of stream) {
    yield chunk;
  }
}
function iteratorToStream(iterator: any) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(new Uint8Array(value));
      }
    },
  });
}
export const GET = async (
  request: NextRequest,
  context: {
    params: Promise<{
      path?: string[];
    }>;
  }
) => {
  const { path } = await context.params;
  const base = resolve(process.env.UPLOAD_DIRECTORY!);
  const filePath = resolve(base, (path ?? []).join('/'));
  // Confine reads to UPLOAD_DIRECTORY. resolve() collapses any `..` segments
  // (including URL-decoded ones), so this blocks every path-traversal variant.
  if (filePath !== base && !filePath.startsWith(base + sep)) {
    return new NextResponse('Not found', { status: 404 });
  }
  const fileStats = statSync(filePath);
  const contentType = mime.getType(filePath) || 'application/octet-stream';

  // Honor ranged requests: providers that push media in chunks (TikTok video)
  // fetch byte windows with a Range header and treat the response body as that
  // window, so ignoring Range would corrupt their uploads.
  const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.get('range') || '');
  const start = range ? Number(range[1]) : 0;
  const end = range && range[2] ? Number(range[2]) : fileStats.size - 1;

  if (
    range &&
    (start >= fileStats.size || end >= fileStats.size || start > end)
  ) {
    return new NextResponse(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${fileStats.size}` },
    });
  }

  const response = createReadStream(filePath, range ? { start, end } : {});
  const iterator = nodeStreamToIterator(response);
  const webStream = iteratorToStream(iterator);
  return new Response(webStream, {
    status: range ? 206 : 200,
    headers: {
      'Content-Type': contentType,
      // Set the appropriate content-type header
      'Content-Length': (end - start + 1).toString(),
      // Set the content-length header
      'Last-Modified': fileStats.mtime.toUTCString(),
      // Set the last-modified header
      'Cache-Control': 'public, max-age=31536000, immutable', // Example cache-control header
      'Accept-Ranges': 'bytes',
      ...(range
        ? { 'Content-Range': `bytes ${start}-${end}/${fileStats.size}` }
        : {}),
    },
  });
};

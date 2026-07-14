import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';

// Every fetch this tool makes is pinned to this origin. The page to read is
// chosen by the model, so it is attacker-influenceable through prompt
// injection (the tool is also exposed over MCP) — treat it as untrusted.
const DOCS_ORIGIN = 'https://docs.postiz.com';
const INDEX_URL = `${DOCS_ORIGIN}/llms.txt`;

const MAX_PAGES = 3;
const MAX_PAGE_LENGTH = 50000;
const CACHE_TTL = 1000 * 60 * 60;
const MAX_REDIRECTS = 3;

@Injectable()
export class DocsSearchTool implements AgentToolInterface {
  // The service is a singleton, so a plain Map is enough: the index is fetched
  // on essentially every product question and the docs change rarely.
  private cache = new Map<string, { content: string; expires: number }>();

  name = 'searchPostizDocs';

  private async fetchDoc(url: string) {
    const cached = this.cache.get(url);
    if (cached && cached.expires > Date.now()) {
      return cached.content;
    }

    const content = await this.download(url);
    this.cache.set(url, { content, expires: Date.now() + CACHE_TTL });

    return content;
  }

  // Follows redirects by hand. The origin check in resolve() only pins the URL
  // we ask for: fetch follows redirects on its own, so a 3xx off the docs site
  // would walk straight out of the pin and hand an attacker's body to the
  // model. Same-origin hops still need to work (trailing slashes, renamed
  // pages), so refuse only the ones that leave the origin.
  private async download(url: string) {
    let current = url;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const response = await fetch(current, { redirect: 'manual' });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error(`${current} returned ${response.status} with no location`);
        }

        const next = new URL(location, current);
        if (next.origin !== DOCS_ORIGIN) {
          throw new Error(
            `${current} redirected to ${next.origin}, outside the docs site`
          );
        }

        current = next.toString();
        continue;
      }

      if (!response.ok) {
        throw new Error(`${current} returned ${response.status}`);
      }

      return (await response.text()).slice(0, MAX_PAGE_LENGTH);
    }

    throw new Error(`Too many redirects while fetching ${url}`);
  }

  // The pages the index actually lists. The origin pin alone would let the
  // model (or a prompt injection) walk any path on the docs host; this turns
  // it into an allow-list of real pages.
  private async indexedPages() {
    const index = await this.fetchDoc(INDEX_URL);

    return new Set(
      index.match(new RegExp(`${DOCS_ORIGIN}/[^\\s)]+`, 'g')) ?? []
    );
  }

  // Accepts either a bare path ("providers/instagram") or a full docs URL, and
  // returns the .md URL to fetch — or an error if it points anywhere else.
  private resolve(page: string): { url?: string; error?: string } {
    const refusal = {
      error: `Refusing to fetch "${page}": outside the Postiz documentation site.`,
    };

    // "../.." can't escape the origin, but it can only ever point at a page
    // that isn't in the index, so it's never a legitimate request.
    if (page.split(/[/\\]/).includes('..')) {
      return refusal;
    }

    let url: URL;
    try {
      // Resolving is not enough on its own: new URL('//evil.com/x', DOCS_ORIGIN)
      // is https://evil.com/x, and 'file:///etc/passwd' ignores the base
      // entirely. The origin check after resolution is what actually pins it.
      url = new URL(page, `${DOCS_ORIGIN}/`);
    } catch (err) {
      return refusal;
    }

    if (url.origin !== DOCS_ORIGIN) {
      return refusal;
    }

    // The .md variant is the raw markdown; without it we'd get the HTML page.
    const pathname = url.pathname.endsWith('.md')
      ? url.pathname
      : `${url.pathname}.md`;

    return { url: `${DOCS_ORIGIN}${pathname}` };
  }

  run() {
    return createTool({
      id: 'searchPostizDocs',
      description: `Read the official Postiz documentation at ${DOCS_ORIGIN}. This is your ONLY source of truth about what the Postiz product does.
Call this before answering ANY question about the product itself — how to do something in the app, whether Postiz supports or has a feature, where to find something, or how to configure something. Never answer such questions from your own prior knowledge of Postiz.
Do NOT use this tool for a channel's posting settings, fields, limits or rules (what a channel needs in order to post, what a setting means, how long a post can be) - the 'integrationSchema' tool is the authority for those, even when the user is only asking a question and nothing is being scheduled. The docs can be out of date about them.
Call it with no arguments first to get the index of every documentation page (title, URL and a one-line description of each), then call it again with the 1-3 pages from that index that look most relevant to read their full content.
Answer only from the content you read, and cite the page title and its ${DOCS_ORIGIN}/... URL. If the docs don't cover it, say you couldn't find it — do not guess.
Returns { index } , { pages: [{ url, content }] } or { error } on failure.`,
      mcp: {
        annotations: {
          title: 'Search Postiz Documentation',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      inputSchema: z.object({
        pages: z
          .array(z.string())
          .optional()
          .describe(
            'Doc pages to read, taken from the index. Omit this on the first call to get the index of every documentation page; then call again with the 1-3 pages that look most relevant.'
          ),
      }),
      // Mastra validates a tool's return against this schema, so it must also
      // allow the graceful { error } shape — a docs lookup that throws would
      // surface to the user as a broken agent instead of "I couldn't check".
      // Same rationale as upload.from.url.tool.ts.
      outputSchema: z.object({
        index: z.string().optional(),
        pages: z
          .array(
            z.object({
              url: z.string(),
              content: z.string().optional(),
              error: z.string().optional(),
            })
          )
          .optional(),
        error: z.string().optional(),
      }),
      execute: async (inputData) => {
        // The docs are public: no checkAuth, nothing here is org-scoped.
        const pages = inputData?.pages ?? [];

        try {
          if (!pages.length) {
            return { index: await this.fetchDoc(INDEX_URL) };
          }

          if (pages.length > MAX_PAGES) {
            return {
              error: `Too many pages requested (${pages.length}). Ask for at most ${MAX_PAGES} pages per call — pick the most relevant ones from the index.`,
            };
          }

          const indexed = await this.indexedPages();

          return {
            pages: await Promise.all(
              pages.map(async (page) => {
                const { url, error } = this.resolve(page);
                if (!url) {
                  return { url: page, error };
                }

                if (!indexed.has(url)) {
                  return {
                    url,
                    error: `${url} is not a page in the documentation index. Call this tool with no arguments to get the index, and only ask for pages listed there.`,
                  };
                }

                try {
                  return { url, content: await this.fetchDoc(url) };
                } catch (err) {
                  // One unreachable page must not fail the whole lookup.
                  return { url, error: this.describe(err) };
                }
              })
            ),
          };
        } catch (err) {
          return {
            error: `Failed to read the Postiz documentation: ${this.describe(
              err
            )}`,
          };
        }
      },
    });
  }

  // undici's fetch rejects with a generic TypeError('fetch failed') and hides
  // the real reason (DNS, TLS, ...) in err.cause. Error.cause isn't in the
  // es2020 lib typings this repo compiles against, hence the cast.
  private describe(err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    const cause =
      err instanceof Error
        ? (err as Error & { cause?: unknown }).cause
        : undefined;

    return cause instanceof Error && cause.message
      ? `${message} (${cause.message})`
      : message;
  }
}

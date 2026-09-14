<p align="center">
  <a href="https://postqueen.ai">
    <img src="https://raw.githubusercontent.com/GkhanKINAY/postqueen-app/main/.github/assets/header.svg" width="840" alt="PostQueen: the queen of your posts, your AI social media manager" />
  </a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@postqueen/node"><img src="https://img.shields.io/npm/v/@postqueen/node" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@postqueen/node"><img src="https://img.shields.io/npm/dm/@postqueen/node" alt="npm downloads"></a>
  <a href="https://github.com/GkhanKINAY/postqueen-app/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="License: AGPL-3.0"></a>
</p>

# PostQueen NodeJS SDK

Typed Node client for the [PostQueen](https://postqueen.ai) public API. Schedule posts, upload
media and read your connected channels across 30+ networks, from X and LinkedIn to TikTok and
YouTube, with a handful of methods and full types.

## Install

```bash
npm install @postqueen/node
```

Grab your API key at [app.postqueen.ai/settings](https://app.postqueen.ai/settings)
(Developers → Public API → Reveal).

## Quick start

```typescript
import fs from 'fs';
import PostQueen from '@postqueen/node';

const postqueen = new PostQueen(process.env.POSTQUEEN_API_KEY!);

// Which channels can I post to?
const channels = await postqueen.integrations();

// Upload media first: TikTok, Instagram and YouTube only accept trusted URLs
const media = await postqueen.upload(fs.readFileSync('./launch.png'), 'png');

// Schedule the post
await postqueen.post({
  type: 'schedule',
  date: '2026-08-01T09:00:00Z',
  shortLink: false,
  tags: [],
  posts: [
    {
      integration: { id: channels[0].id },
      value: [
        {
          content: 'We just shipped 🎉',
          image: [{ id: media.id, path: media.path }],
        },
      ],
    },
  ],
});
```

`type` is one of `draft`, `schedule` or `now`. `date` (ISO 8601), `shortLink`, `tags` and at least
one entry in `posts` are required. Per-platform options go into each post's `settings` object; see
the [API reference](https://api.postqueen.ai/docs) for the schema of the channel you are posting to.

## API

| Method | Returns |
| --- | --- |
| `post(posts: CreatePostDto)` | Schedule a post; returns parsed JSON |
| `postList(filters: GetPostsDto)` | List posts in a date range; returns parsed JSON |
| `upload(file: Buffer, extension: string)` | Upload an image or video; returns parsed JSON with the hosted `path` |
| `integrations()` | List connected channels; returns parsed JSON |
| `deletePost(id: string)` | Delete a post; returns the raw `Response`, so call `.json()` yourself if you need the body |

`upload()` maps the extension to a content type; `png`, `jpg`, `jpeg` and `gif` are recognized.

## Self-hosted instances

Pass your own API base URL as the second constructor argument, or set `POSTQUEEN_API_URL`:

```typescript
const postqueen = new PostQueen(apiKey, 'https://yourdomain.com/api');
```

## Other ways to reach the same API

| | |
| --- | --- |
| REST API reference | [api.postqueen.ai/docs](https://api.postqueen.ai/docs) |
| Documentation | [docs.postqueen.ai](https://docs.postqueen.ai) |
| CLI | [`postqueen`](https://www.npmjs.com/package/postqueen) |
| n8n node | [`n8n-nodes-postqueen`](https://www.npmjs.com/package/n8n-nodes-postqueen) |
| MCP server | `https://api.postqueen.ai/mcp/<YOUR_API_KEY>` |
| Source and issues | [github.com/GkhanKINAY/postqueen-app](https://github.com/GkhanKINAY/postqueen-app) |

## License

[AGPL-3.0](https://github.com/GkhanKINAY/postqueen-app/blob/main/LICENSE). PostQueen is a fork of
[Postiz](https://github.com/gitroomhq/postiz-app) by Nevo David / Gitroom. Thank you to the Postiz
contributors for the foundation this builds on.

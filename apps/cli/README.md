# Postiz CLI

> Command-line interface for the Postiz social media scheduling platform

## Overview

The Postiz CLI allows you to interact with the Postiz API from the command line, making it easy for developers and AI agents to automate social media scheduling, manage posts, and upload media.

## Quick Start

### Installation

```bash
# Install dependencies
pnpm install

# Build the CLI
pnpm run build

# Run locally (development)
pnpm run start -- [command]

# Or link globally
pnpm link --global
```

### Setup

Before using the CLI, you need to set your Postiz API key:

```bash
export POSTIZ_API_KEY=your_api_key_here
```

Optionally, you can set a custom API URL:

```bash
export POSTIZ_API_URL=https://your-custom-api.com
```

## Usage

```bash
postiz <command> [options]
```

### Commands

#### Create a Post

```bash
postiz posts:create -c "Your content here" -i "integration-id-1,integration-id-2"
```

**Options:**
- `-c, --content <text>` - Post/comment content (can be used multiple times)
- `-m, --media <urls>` - Comma-separated media URLs for the corresponding `-c` (can be used multiple times)
- `-i, --integrations <ids>` - Comma-separated integration IDs (required)
- `-s, --schedule <date>` - Schedule date (ISO 8601)
- `-d, --delay <ms>` - Delay between comments in milliseconds (default: 5000)
- `-p, --provider-type <type>` - Provider type for platform-specific settings (e.g., reddit, youtube, x, tiktok)
- `--settings <json>` - Provider-specific settings as JSON string

**Examples:**

```bash
# Simple post
postiz posts:create -c "Hello World!" -i "twitter-123"

# Post with multiple images
postiz posts:create \
  -c "Check these out!" \
  -m "img1.jpg,img2.jpg,img3.jpg" \
  -i "twitter-123"

# Post with comments, each having their own media
postiz posts:create \
  -c "Main post 🚀" -m "main.jpg,main2.jpg" \
  -c "First comment 📸" -m "comment1.jpg" \
  -c "Second comment 🎨" -m "comment2.jpg" \
  -i "twitter-123"

# Comments can contain semicolons!
postiz posts:create \
  -c "Main post" \
  -c "Comment with semicolon; see, it works!" \
  -c "Another comment; multiple; semicolons!" \
  -i "twitter-123"

# Twitter thread with custom delay
postiz posts:create \
  -c "Thread 1/3" \
  -c "Thread 2/3" \
  -c "Thread 3/3" \
  -d 2000 \
  -i "twitter-123"

# Scheduled post
postiz posts:create \
  -c "Future post" \
  -s "2024-12-31T12:00:00Z" \
  -i "twitter-123"

# With provider-specific settings
postiz posts:create \
  -c "Video description" \
  -p youtube \
  --settings '{"title":"My Video","type":"public"}' \
  -i "youtube-123"
```

### Provider-Specific Settings

Many platforms support specific settings (Reddit subreddits, YouTube visibility, TikTok privacy, etc.):

```bash
# Reddit with subreddit settings
postiz posts:create \
  -c "Post content" \
  -p reddit \
  --settings '{"subreddit":[{"value":{"subreddit":"programming","title":"My Title","type":"text","url":"","is_flair_required":false}}]}' \
  -i "reddit-123"

# YouTube with title and visibility
postiz posts:create \
  -c "Video description" \
  -p youtube \
  --settings '{"title":"My Video","type":"public","tags":[{"value":"tech","label":"Tech"}]}' \
  -i "youtube-123"

# X (Twitter) with reply settings
postiz posts:create \
  -c "Tweet" \
  -p x \
  --settings '{"who_can_reply_post":"everyone"}' \
  -i "twitter-123"
```

See **[PROVIDER_SETTINGS.md](./PROVIDER_SETTINGS.md)** for complete documentation on all platform-specific settings.
```

#### List Posts

```bash
postiz posts:list [options]
```

**Options:**
- `-p, --page <number>` - Page number (default: 1)
- `-l, --limit <number>` - Posts per page (default: 10)
- `-s, --search <query>` - Search query

**Examples:**

```bash
# List all posts
postiz posts:list

# With pagination
postiz posts:list -p 2 -l 20

# Search posts
postiz posts:list -s "keyword"
```

#### Delete a Post

```bash
postiz posts:delete <post-id>
```

**Example:**

```bash
postiz posts:delete abc123xyz
```

#### List Integrations

```bash
postiz integrations:list
```

Shows all connected social media accounts.

#### Upload a File

```bash
postiz upload <file-path>
```

**Example:**

```bash
postiz upload ./images/photo.png
```

## Development

### Project Structure

```
apps/cli/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── api.ts                # API client
│   ├── config.ts             # Configuration handler
│   └── commands/
│       ├── posts.ts          # Post commands
│       ├── integrations.ts   # Integration commands
│       └── upload.ts         # Upload commands
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── README.md
└── SKILL.md                  # AI agent usage guide
```

### Scripts

- `pnpm run dev` - Watch mode for development
- `pnpm run build` - Build the CLI
- `pnpm run start` - Run the built CLI

### Building

The CLI uses `tsup` for building:

```bash
pnpm run build
```

This creates a `dist/` directory with:
- Compiled JavaScript
- Type declarations
- Source maps
- Executable shebang for Node.js

## For AI Agents

See [SKILL.md](./SKILL.md) for detailed usage patterns and examples for AI agents.

## API Reference

The CLI interacts with these Postiz API endpoints:

- `POST /public/v1/posts` - Create a post
- `GET /public/v1/posts` - List posts
- `DELETE /public/v1/posts/:id` - Delete a post
- `GET /public/v1/integrations` - List integrations
- `POST /public/v1/upload` - Upload media

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTIZ_API_KEY` | ✅ Yes | - | Your Postiz API key |
| `POSTIZ_API_URL` | No | `https://api.postiz.com` | Custom API endpoint |

## Error Handling

The CLI provides user-friendly error messages:

- ✅ Success messages with green checkmarks
- ❌ Error messages with red X marks
- 📋 Info messages with emojis
- Exit code 0 for success, 1 for errors

## Examples

### Basic Workflow

```bash
# 1. Set API key
export POSTIZ_API_KEY=your_key

# 2. Check connected integrations
postiz integrations:list

# 3. Create a post
postiz posts:create -c "Hello from CLI!" -i "twitter-123"

# 4. List posts
postiz posts:list

# 5. Delete a post
postiz posts:delete post-id-123
```

### Scheduled Posting

```bash
# Schedule posts for different times
postiz posts:create -c "Morning post" -s "2024-01-15T09:00:00Z"
postiz posts:create -c "Afternoon post" -s "2024-01-15T15:00:00Z"
postiz posts:create -c "Evening post" -s "2024-01-15T20:00:00Z"
```

### Media Upload Workflow

```bash
# Upload an image
postiz upload ./image.png

# The response includes the URL, use it in a post
postiz posts:create -c "Check this out!" --image "url-from-upload"
```

## Contributing

This CLI is part of the [Postiz monorepo](https://github.com/gitroomhq/postiz-app).

## License

AGPL-3.0

## Links

- [Postiz Website](https://postiz.com)
- [API Documentation](https://postiz.com/api-docs)
- [GitHub Repository](https://github.com/gitroomhq/postiz-app)

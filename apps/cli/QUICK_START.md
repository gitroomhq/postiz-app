# Postiz CLI - Quick Start Guide

## Installation

### From Source (Development)

```bash
# Navigate to the monorepo root
cd /path/to/gitroom

# Install dependencies
pnpm install

# Build the CLI
pnpm run build:cli

# Test locally
node apps/cli/dist/index.js --help
```

### Global Installation (Development)

```bash
# From the CLI directory
cd apps/cli

# Link globally
pnpm link --global

# Now you can use 'postiz' anywhere
postiz --help
```

### From npm (Coming Soon)

```bash
# Once published
npm install -g postiz

# Or with pnpm
pnpm add -g postiz
```

## Setup

### 1. Get Your API Key

1. Log in to your Postiz account at https://postiz.com
2. Navigate to Settings → API Keys
3. Generate a new API key

### 2. Set Environment Variable

```bash
# Bash/Zsh
export POSTIZ_API_KEY=your_api_key_here

# Fish
set -x POSTIZ_API_KEY your_api_key_here

# PowerShell
$env:POSTIZ_API_KEY="your_api_key_here"
```

To make it permanent, add it to your shell profile:

```bash
# ~/.bashrc or ~/.zshrc
echo 'export POSTIZ_API_KEY=your_api_key_here' >> ~/.bashrc
source ~/.bashrc
```

### 3. Verify Installation

```bash
postiz --help
```

## Basic Commands

### Create a Post

```bash
# Simple post
postiz posts:create -c "Hello World!" -i "twitter-123"

# Post with multiple images
postiz posts:create \
  -c "Check these out!" \
  -m "img1.jpg,img2.jpg" \
  -i "twitter-123"

# Post with comments (each can have different media!)
postiz posts:create \
  -c "Main post" -m "main.jpg" \
  -c "First comment" -m "comment1.jpg" \
  -c "Second comment" -m "comment2.jpg" \
  -i "twitter-123"

# Scheduled post
postiz posts:create \
  -c "Future post" \
  -s "2024-12-31T12:00:00Z" \
  -i "twitter-123"
```

### List Posts

```bash
# List all posts
postiz posts:list

# With pagination
postiz posts:list -p 2 -l 20

# Search
postiz posts:list -s "keyword"
```

### Delete a Post

```bash
postiz posts:delete abc123xyz
```

### List Integrations

```bash
postiz integrations:list
```

### Upload Media

```bash
postiz upload ./path/to/image.png
```

## Common Workflows

### 1. Check What's Connected

```bash
# See all your connected social media accounts
postiz integrations:list
```

The output will show integration IDs like:
```json
[
  { "id": "twitter-123", "provider": "twitter" },
  { "id": "linkedin-456", "provider": "linkedin" }
]
```

### 2. Create Multi-Platform Post

```bash
# Use the integration IDs from step 1
postiz posts:create \
  -c "Posting to multiple platforms!" \
  -i "twitter-123,linkedin-456,facebook-789"
```

### 3. Schedule Multiple Posts

```bash
# Morning post
postiz posts:create -c "Good morning!" -s "2024-01-15T09:00:00Z"

# Afternoon post
postiz posts:create -c "Lunch time update!" -s "2024-01-15T12:00:00Z"

# Evening post
postiz posts:create -c "Good night!" -s "2024-01-15T20:00:00Z"
```

### 4. Upload and Post Image

```bash
# First upload the image
postiz upload ./my-image.png

# Copy the URL from the response, then create post
postiz posts:create -c "Check out this image!" --image "url-from-upload"
```

## Tips & Tricks

### Using with jq for JSON Parsing

```bash
# Get just the post IDs
postiz posts:list | jq '.[] | .id'

# Get integration names
postiz integrations:list | jq '.[] | .provider'
```

### Script Automation

```bash
#!/bin/bash
# Create a batch of posts

for hour in 09 12 15 18; do
  postiz posts:create \
    -c "Automated post at ${hour}:00" \
    -s "2024-01-15T${hour}:00:00Z"
  echo "Created post for ${hour}:00"
done
```

### Environment Variables

```bash
# Custom API endpoint (for self-hosted)
export POSTIZ_API_URL=https://your-instance.com

# Use the CLI with custom endpoint
postiz posts:list
```

## Troubleshooting

### API Key Not Set

```
❌ Error: POSTIZ_API_KEY environment variable is required
```

**Solution:** Set the environment variable:
```bash
export POSTIZ_API_KEY=your_key
```

### Command Not Found

```
postiz: command not found
```

**Solution:** Either:
1. Use the full path: `node apps/cli/dist/index.js`
2. Link globally: `cd apps/cli && pnpm link --global`
3. Add to PATH: `export PATH=$PATH:/path/to/apps/cli/dist`

### API Errors

```
❌ API Error (401): Unauthorized
```

**Solution:** Check your API key is valid and has proper permissions.

```
❌ API Error (404): Not Found
```

**Solution:** Verify the post ID exists when deleting.

## Getting Help

```bash
# General help
postiz --help

# Command-specific help
postiz posts:create --help
postiz posts:list --help
postiz posts:delete --help
```

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Check [SKILL.md](./SKILL.md) for AI agent integration patterns
- See [examples/](./examples/) for more usage examples

## Links

- [Postiz Website](https://postiz.com)
- [API Documentation](https://postiz.com/api-docs)
- [GitHub Repository](https://github.com/gitroomhq/postiz-app)
- [Report Issues](https://github.com/gitroomhq/postiz-app/issues)

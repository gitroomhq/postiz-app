# Postiz CLI Skill

## Description

The Postiz CLI is a command-line interface for interacting with the Postiz social media scheduling API. It allows AI agents and developers to programmatically manage posts, integrations, and media uploads.

## Prerequisites

- API Key: You need a valid Postiz API key
- Set the environment variable: `export POSTIZ_API_KEY=your_api_key`
- Optional: Set custom API URL with `export POSTIZ_API_URL=https://your-api-url.com`

## Installation

```bash
# From the monorepo root
pnpm install

# Build the CLI
pnpm --filter postiz run build

# Link globally (optional)
cd apps/cli
pnpm link --global
```

## Available Commands

### Posts Management

#### Create a Post

The CLI supports both **simple** and **complex** post creation:

##### Simple Post Creation (Command-line)

```bash
postiz posts:create -c "Your post content" -i "integration-id-1,integration-id-2"
```

Options:
- `-c, --content <text>`: Post content/text
- `-i, --integrations <ids>`: Comma-separated integration IDs (required)
- `-s, --schedule <date>`: Schedule date in ISO 8601 format
- `--image <urls>`: Comma-separated image URLs or paths (multiple images supported)
- `--comments <text>`: Semicolon-separated comments
- `--shortLink`: Use URL shortener (default: true)

Examples:
```bash
# Create immediate post
postiz posts:create -c "Hello World!" -i "twitter-123,linkedin-456"

# Create scheduled post
postiz posts:create -c "Future post" -s "2024-12-31T12:00:00Z" -i "twitter-123"

# Create post with multiple images
postiz posts:create -c "Check these out!" --image "url1.jpg,url2.jpg,url3.jpg" -i "twitter-123"

# Create post with comments (simple)
postiz posts:create -c "Main post" --comments "First comment;Second comment" -i "twitter-123"
```

##### Complex Post Creation (JSON File)

For posts with **comments that have their own media**, use JSON files:

```bash
postiz posts:create --json ./my-post.json
```

**JSON Structure:**
```json
{
  "type": "now",
  "date": "2024-01-15T12:00:00Z",
  "shortLink": true,
  "tags": [],
  "posts": [
    {
      "integration": { "id": "twitter-123" },
      "value": [
        {
          "content": "Main post with media 🚀",
          "image": [
            { "id": "img1", "path": "https://example.com/main1.jpg" },
            { "id": "img2", "path": "https://example.com/main2.jpg" }
          ]
        },
        {
          "content": "First comment with its own media 📸",
          "image": [
            { "id": "img3", "path": "https://example.com/comment1.jpg" }
          ],
          "delay": 5000
        },
        {
          "content": "Second comment with different media 🎨",
          "image": [
            { "id": "img4", "path": "https://example.com/comment2.jpg" }
          ],
          "delay": 10000
        }
      ],
      "settings": { "__type": "EmptySettings" }
    }
  ]
}
```

**Key Features:**
- ✅ **Multiple posts** to different platforms in one request
- ✅ **Each post can have multiple values** (main post + comments/thread)
- ✅ **Each value can have multiple images** (array of MediaDto)
- ✅ **Delays between comments** (in milliseconds)
- ✅ **Platform-specific content** (different content per integration)

See `examples/` directory for:
- `post-with-comments.json` - Post with comments, each having their own media
- `multi-platform-post.json` - Post to multiple platforms with different content
- `thread-post.json` - Create a Twitter thread with 5 tweets
- `EXAMPLES.md` - Comprehensive guide with all use cases

#### List Posts
```bash
postiz posts:list
```

Options:
- `-p, --page <number>`: Page number (default: 1)
- `-l, --limit <number>`: Posts per page (default: 10)
- `-s, --search <query>`: Search query

Examples:
```bash
# List all posts
postiz posts:list

# List with pagination
postiz posts:list -p 2 -l 20

# Search posts
postiz posts:list -s "hello"
```

#### Delete a Post
```bash
postiz posts:delete <post-id>
```

Example:
```bash
postiz posts:delete abc123xyz
```

### Integrations

#### List Connected Integrations
```bash
postiz integrations:list
```

This command shows all connected social media accounts and their IDs, which can be used when creating posts.

### Media Upload

#### Upload a File
```bash
postiz upload <file-path>
```

Example:
```bash
postiz upload ./images/photo.png
```

Supported formats: PNG, JPG, JPEG, GIF

## Usage for AI Agents

AI agents can use this CLI to automate social media scheduling. The CLI supports both simple and advanced post structures, including posts with comments where each has its own media.

### Understanding the Post Structure

```typescript
CreatePostDto {
  type: 'now' | 'schedule' | 'draft' | 'update',
  date: string,              // ISO 8601 timestamp
  shortLink: boolean,        // Enable URL shortening
  tags: Tag[],              // Array of tags
  posts: [                  // Can post to multiple platforms
    {
      integration: { id: string },    // Platform integration ID
      value: [                        // Main post + comments/thread
        {
          content: string,            // Text content
          image: MediaDto[],          // Array of media (multiple images)
          delay?: number,             // Delay in ms (for comments)
          id?: string                 // Optional ID
        }
      ],
      settings: { __type: 'EmptySettings' }
    }
  ]
}
```

### Common Patterns

### Pattern 1: Create and Schedule Multiple Posts
```bash
# Set API key once
export POSTIZ_API_KEY=your_key

# Create posts programmatically
postiz posts:create -c "Morning update" -s "2024-01-15T09:00:00Z" -i "twitter-123"
postiz posts:create -c "Afternoon update" -s "2024-01-15T15:00:00Z" -i "twitter-123"
postiz posts:create -c "Evening update" -s "2024-01-15T20:00:00Z" -i "twitter-123"
```

### Pattern 2: Upload Media and Create Post
```bash
# First, upload the media
UPLOAD_RESULT=$(postiz upload ./image.png)

# Extract the URL from the result (you'll need to parse the JSON)
# Then create post with the media URL
postiz posts:create -c "Check out this image!" --image "<url-from-upload>"
```

### Pattern 3: Check Integrations Before Posting
```bash
# List available integrations
postiz integrations:list

# Use the integration IDs from the response to create posts
postiz posts:create -c "Multi-platform post" -i "twitter-123,linkedin-456,facebook-789"
```

### Pattern 4: Manage Existing Posts
```bash
# List all posts to get IDs
postiz posts:list

# Delete a specific post
postiz posts:delete <post-id-from-list>
```

### Pattern 5: Create Post with Comments and Media (Advanced)

```bash
# Create a JSON file programmatically
cat > post.json << 'EOF'
{
  "type": "now",
  "date": "2024-01-15T12:00:00Z",
  "shortLink": true,
  "tags": [],
  "posts": [{
    "integration": { "id": "twitter-123" },
    "value": [
      {
        "content": "Main post with 2 images 🚀",
        "image": [
          { "id": "1", "path": "https://example.com/img1.jpg" },
          { "id": "2", "path": "https://example.com/img2.jpg" }
        ]
      },
      {
        "content": "First comment with its own image 📸",
        "image": [
          { "id": "3", "path": "https://example.com/comment-img.jpg" }
        ],
        "delay": 5000
      }
    ],
    "settings": { "__type": "EmptySettings" }
  }]
}
EOF

# Post it
postiz posts:create --json post.json
```

### Pattern 6: Multi-Platform Campaign

```javascript
// AI Agent: Create coordinated multi-platform posts
const campaign = {
  type: "schedule",
  date: "2024-12-25T12:00:00Z",
  shortLink: true,
  tags: [{ value: "campaign", label: "Campaign" }],
  posts: [
    {
      integration: { id: "twitter-123" },
      value: [{
        content: "Twitter-optimized content 🐦",
        image: [{ id: "t1", path: "twitter-image.jpg" }]
      }]
    },
    {
      integration: { id: "linkedin-456" },
      value: [{
        content: "Professional LinkedIn content 💼",
        image: [{ id: "l1", path: "linkedin-image.jpg" }]
      }]
    },
    {
      integration: { id: "facebook-789" },
      value: [
        {
          content: "Facebook main post 📱",
          image: [{ id: "f1", path: "facebook-main.jpg" }]
        },
        {
          content: "Additional context in comments",
          image: [{ id: "f2", path: "facebook-comment.jpg" }],
          delay: 300000  // 5 minutes later
        }
      ]
    }
  ]
};

require('fs').writeFileSync('campaign.json', JSON.stringify(campaign, null, 2));
execSync('postiz posts:create --json campaign.json');
```

### Pattern 7: Twitter Thread Creation

```bash
# Create a thread with multiple tweets, each with media
postiz posts:create --json - << 'EOF'
{
  "type": "now",
  "date": "2024-01-15T12:00:00Z",
  "shortLink": true,
  "tags": [],
  "posts": [{
    "integration": { "id": "twitter-123" },
    "value": [
      {
        "content": "🧵 Thread about X (1/3)",
        "image": [{ "id": "1", "path": "https://example.com/thread-1.jpg" }]
      },
      {
        "content": "Key point number 1 (2/3)",
        "image": [{ "id": "2", "path": "https://example.com/thread-2.jpg" }],
        "delay": 2000
      },
      {
        "content": "Conclusion and CTA (3/3)",
        "image": [{ "id": "3", "path": "https://example.com/thread-3.jpg" }],
        "delay": 2000
      }
    ],
    "settings": { "__type": "EmptySettings" }
  }]
}
EOF
```

### Pattern 8: Upload Media, Then Post

```bash
# 1. Upload images first
IMG1=$(postiz upload ./image1.jpg | jq -r '.path')
IMG2=$(postiz upload ./image2.jpg | jq -r '.path')

# 2. Create post with uploaded images
cat > post.json << EOF
{
  "type": "now",
  "date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "shortLink": true,
  "tags": [],
  "posts": [{
    "integration": { "id": "twitter-123" },
    "value": [{
      "content": "Check out these images!",
      "image": [
        { "id": "img1", "path": "$IMG1" },
        { "id": "img2", "path": "$IMG2" }
      ]
    }],
    "settings": { "__type": "EmptySettings" }
  }]
}
EOF

postiz posts:create --json post.json
```

## Output Format

All commands return JSON output, making it easy for AI agents to parse and process results:

```json
{
  "success": true,
  "data": {
    "id": "post-123",
    "content": "Hello World!",
    "scheduledDate": "2024-01-15T12:00:00Z"
  }
}
```

## Error Handling

The CLI provides clear error messages:

- Missing API key: `❌ Error: POSTIZ_API_KEY environment variable is required`
- API errors: `❌ API Error (status): message`
- File not found: `❌ Failed to upload file: message`

Exit codes:
- `0`: Success
- `1`: Error occurred

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTIZ_API_KEY` | Yes | - | Your Postiz API key |
| `POSTIZ_API_URL` | No | `https://api.postiz.com` | Custom API endpoint |

## Tips for AI Agents

1. **Always set the API key** before running commands
2. **Parse JSON output** using tools like `jq` for scripting
3. **Check exit codes** to determine if commands succeeded
4. **Use integrations:list** first to get valid integration IDs
5. **Schedule posts** in the future using ISO 8601 date format
6. **Upload media first** before referencing in posts

## Example Workflow Script

```bash
#!/bin/bash

# Set API key
export POSTIZ_API_KEY="your-api-key-here"

# Get integrations
INTEGRATIONS=$(postiz integrations:list)
echo "Available integrations: $INTEGRATIONS"

# Create a post
postiz posts:create \
  -c "Automated post from AI agent" \
  -s "2024-12-25T12:00:00Z" \
  -i "twitter-123,linkedin-456"

# List all posts
postiz posts:list -l 5

echo "✅ Workflow completed!"
```

## Support

For issues or questions:
- GitHub: https://github.com/gitroomhq/postiz-app
- Documentation: https://postiz.com/docs
- API Reference: https://postiz.com/api-docs

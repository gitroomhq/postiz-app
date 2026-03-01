| Property | Value |
|----------|-------|
| **name** | postiz |
| **description** | Social media automation CLI for scheduling posts across 28+ platforms |
| **allowed-tools** | Bash(postiz:*) |

---

## Core Workflow

The fundamental pattern for using Postiz CLI:

1. **Discover** - List integrations and get their settings
2. **Fetch** - Use integration tools to retrieve dynamic data (flairs, playlists, companies)
3. **Prepare** - Upload media files if needed
4. **Post** - Create posts with content, media, and platform-specific settings

```bash
# 1. Discover
postiz integrations:list
postiz integrations:settings <integration-id>

# 2. Fetch (if needed)
postiz integrations:trigger <integration-id> <method> -d '{"key":"value"}'

# 3. Prepare
postiz upload image.jpg

# 4. Post
postiz posts:create -c "Content" -m "image.jpg" -i "<integration-id>"
```

---

## Essential Commands

### Setup

```bash
# Required environment variable
export POSTIZ_API_KEY=your_api_key_here

# Optional custom API URL
export POSTIZ_API_URL=https://custom-api-url.com
```

### Integration Discovery

```bash
# List all connected integrations
postiz integrations:list

# Get settings schema for specific integration
postiz integrations:settings <integration-id>

# Trigger integration tool to fetch dynamic data
postiz integrations:trigger <integration-id> <method-name>
postiz integrations:trigger <integration-id> <method-name> -d '{"param":"value"}'
```

### Creating Posts

```bash
# Simple post (date is REQUIRED)
postiz posts:create -c "Content" -s "2024-12-31T12:00:00Z" -i "integration-id"

# Draft post
postiz posts:create -c "Content" -s "2024-12-31T12:00:00Z" -t draft -i "integration-id"

# Post with media
postiz posts:create -c "Content" -m "img1.jpg,img2.jpg" -s "2024-12-31T12:00:00Z" -i "integration-id"

# Post with comments (each with own media)
postiz posts:create \
  -c "Main post" -m "main.jpg" \
  -c "First comment" -m "comment1.jpg" \
  -c "Second comment" -m "comment2.jpg,comment3.jpg" \
  -s "2024-12-31T12:00:00Z" \
  -i "integration-id"

# Multi-platform post
postiz posts:create -c "Content" -s "2024-12-31T12:00:00Z" -i "twitter-id,linkedin-id,facebook-id"

# Platform-specific settings
postiz posts:create \
  -c "Content" \
  -s "2024-12-31T12:00:00Z" \
  --settings '{"subreddit":[{"value":{"subreddit":"programming","title":"My Post","type":"text"}}]}' \
  -i "reddit-id"

# Complex post from JSON file
postiz posts:create --json post.json
```

### Managing Posts

```bash
# List posts (defaults to last 30 days to next 30 days)
postiz posts:list

# List posts in date range
postiz posts:list --startDate "2024-01-01T00:00:00Z" --endDate "2024-12-31T23:59:59Z"

# Delete post
postiz posts:delete <post-id>
```

### Media Upload

**⚠️ IMPORTANT:** Always upload files to Postiz before using them in posts. Many platforms (TikTok, Instagram, YouTube) **require verified URLs** and will reject external links.

```bash
# Upload file and get URL
postiz upload image.jpg

# Supports: images (PNG, JPG, GIF, WEBP, SVG), videos (MP4, MOV, AVI, MKV, WEBM),
# audio (MP3, WAV, OGG, AAC), documents (PDF, DOC, DOCX)

# Workflow: Upload → Extract URL → Use in post
VIDEO=$(postiz upload video.mp4)
VIDEO_PATH=$(echo "$VIDEO" | jq -r '.path')
postiz posts:create -c "Content" -s "2024-12-31T12:00:00Z" -m "$VIDEO_PATH" -i "tiktok-id"
```

---

## Common Patterns

### Pattern 1: Discover & Use Integration Tools

**Reddit - Get flairs for a subreddit:**
```bash
# Get Reddit integration ID
REDDIT_ID=$(postiz integrations:list | jq -r '.[] | select(.identifier=="reddit") | .id')

# Fetch available flairs
FLAIRS=$(postiz integrations:trigger "$REDDIT_ID" getFlairs -d '{"subreddit":"programming"}')
FLAIR_ID=$(echo "$FLAIRS" | jq -r '.output[0].id')

# Use in post
postiz posts:create \
  -c "My post content" \
  -s "2024-12-31T12:00:00Z" \
  --settings "{\"subreddit\":[{\"value\":{\"subreddit\":\"programming\",\"title\":\"Post Title\",\"type\":\"text\",\"is_flair_required\":true,\"flair\":{\"id\":\"$FLAIR_ID\",\"name\":\"Discussion\"}}}]}" \
  -i "$REDDIT_ID"
```

**YouTube - Get playlists:**
```bash
YOUTUBE_ID=$(postiz integrations:list | jq -r '.[] | select(.identifier=="youtube") | .id')
PLAYLISTS=$(postiz integrations:trigger "$YOUTUBE_ID" getPlaylists)
PLAYLIST_ID=$(echo "$PLAYLISTS" | jq -r '.output[0].id')

postiz posts:create \
  -c "Video description" \
  -s "2024-12-31T12:00:00Z" \
  --settings "{\"title\":\"My Video\",\"type\":\"public\",\"playlistId\":\"$PLAYLIST_ID\"}" \
  -m "video.mp4" \
  -i "$YOUTUBE_ID"
```

**LinkedIn - Post as company:**
```bash
LINKEDIN_ID=$(postiz integrations:list | jq -r '.[] | select(.identifier=="linkedin") | .id')
COMPANIES=$(postiz integrations:trigger "$LINKEDIN_ID" getCompanies)
COMPANY_ID=$(echo "$COMPANIES" | jq -r '.output[0].id')

postiz posts:create \
  -c "Company announcement" \
  -s "2024-12-31T12:00:00Z" \
  --settings "{\"companyId\":\"$COMPANY_ID\"}" \
  -i "$LINKEDIN_ID"
```

### Pattern 2: Upload Media Before Posting

```bash
# Upload multiple files
VIDEO_RESULT=$(postiz upload video.mp4)
VIDEO_PATH=$(echo "$VIDEO_RESULT" | jq -r '.path')

THUMB_RESULT=$(postiz upload thumbnail.jpg)
THUMB_PATH=$(echo "$THUMB_RESULT" | jq -r '.path')

# Use in post
postiz posts:create \
  -c "Check out my video!" \
  -s "2024-12-31T12:00:00Z" \
  -m "$VIDEO_PATH" \
  -i "tiktok-id"
```

### Pattern 3: Twitter Thread

```bash
postiz posts:create \
  -c "🧵 Thread starter (1/4)" -m "intro.jpg" \
  -c "Point one (2/4)" -m "point1.jpg" \
  -c "Point two (3/4)" -m "point2.jpg" \
  -c "Conclusion (4/4)" -m "outro.jpg" \
  -s "2024-12-31T12:00:00Z" \
  -d 2000 \
  -i "twitter-id"
```

### Pattern 4: Multi-Platform Campaign

```bash
# Create JSON file with platform-specific content
cat > campaign.json << 'EOF'
{
  "integrations": ["twitter-123", "linkedin-456", "facebook-789"],
  "posts": [
    {
      "provider": "twitter",
      "post": [
        {
          "content": "Short tweet version #tech",
          "image": ["twitter-image.jpg"]
        }
      ]
    },
    {
      "provider": "linkedin",
      "post": [
        {
          "content": "Professional LinkedIn version with more context...",
          "image": ["linkedin-image.jpg"]
        }
      ]
    }
  ]
}
EOF

postiz posts:create --json campaign.json
```

### Pattern 5: Validate Settings Before Posting

```javascript
const { execSync } = require('child_process');

function validateAndPost(content, integrationId, settings) {
  // Get integration settings
  const settingsResult = execSync(
    `postiz integrations:settings ${integrationId}`,
    { encoding: 'utf-8' }
  );
  const schema = JSON.parse(settingsResult);

  // Check character limit
  if (content.length > schema.output.maxLength) {
    console.warn(`Content exceeds ${schema.output.maxLength} chars, truncating...`);
    content = content.substring(0, schema.output.maxLength - 3) + '...';
  }

  // Create post
  const result = execSync(
    `postiz posts:create -c "${content}" -s "2024-12-31T12:00:00Z" --settings '${JSON.stringify(settings)}' -i "${integrationId}"`,
    { encoding: 'utf-8' }
  );

  return JSON.parse(result);
}
```

### Pattern 6: Batch Scheduling

```bash
#!/bin/bash

# Schedule posts for the week
DATES=(
  "2024-02-14T09:00:00Z"
  "2024-02-15T09:00:00Z"
  "2024-02-16T09:00:00Z"
)

CONTENT=(
  "Monday motivation 💪"
  "Tuesday tips 💡"
  "Wednesday wisdom 🧠"
)

for i in "${!DATES[@]}"; do
  postiz posts:create \
    -c "${CONTENT[$i]}" \
    -s "${DATES[$i]}" \
    -i "twitter-id" \
    -m "post-${i}.jpg"
  echo "Scheduled: ${CONTENT[$i]} for ${DATES[$i]}"
done
```

### Pattern 7: Error Handling & Retry

```javascript
const { execSync } = require('child_process');

async function postWithRetry(content, integrationId, date, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = execSync(
        `postiz posts:create -c "${content}" -s "${date}" -i "${integrationId}"`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      console.log('✅ Post created successfully');
      return JSON.parse(result);
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed: ${error.message}`);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw new Error(`Failed after ${maxRetries} attempts`);
      }
    }
  }
}
```

---

## Technical Concepts

### Integration Tools Workflow

Many integrations require dynamic data (IDs, tags, playlists) that can't be hardcoded. The tools workflow enables discovery and usage:

1. **Check available tools** - `integrations:settings` returns a `tools` array
2. **Review tool schema** - Each tool has `methodName`, `description`, and `dataSchema`
3. **Trigger tool** - Call `integrations:trigger` with required parameters
4. **Use output** - Tool returns data to use in post settings

**Example tools by platform:**
- **Reddit**: `getFlairs`, `searchSubreddits`, `getSubreddits`
- **YouTube**: `getPlaylists`, `getCategories`, `getChannels`
- **LinkedIn**: `getCompanies`, `getOrganizations`
- **Twitter/X**: `getListsowned`, `getCommunities`
- **Pinterest**: `getBoards`, `getBoardSections`

### Provider Settings Structure

Platform-specific settings use a discriminator pattern with `__type` field:

```json
{
  "posts": [
    {
      "provider": "reddit",
      "post": [{ "content": "...", "image": [...] }],
      "settings": {
        "__type": "reddit",
        "subreddit": [{
          "value": {
            "subreddit": "programming",
            "title": "Post Title",
            "type": "text",
            "url": "",
            "is_flair_required": false
          }
        }]
      }
    }
  ]
}
```

Pass settings directly:
```bash
postiz posts:create -c "Content" -s "2024-12-31T12:00:00Z" --settings '{"subreddit":[...]}' -i "reddit-id"
# Backend automatically adds "__type" based on integration ID
```

### Comments and Threading

Posts can have comments (threads on Twitter/X, replies elsewhere). Each comment can have its own media:

```bash
# Using multiple -c and -m flags
postiz posts:create \
  -c "Main post" -m "image1.jpg,image2.jpg" \
  -c "Comment 1" -m "comment-img.jpg" \
  -c "Comment 2" -m "another.jpg,more.jpg" \
  -s "2024-12-31T12:00:00Z" \
  -d 5000 \  # Delay between comments in ms
  -i "integration-id"
```

Internally creates:
```json
{
  "posts": [{
    "value": [
      { "content": "Main post", "image": ["image1.jpg", "image2.jpg"] },
      { "content": "Comment 1", "image": ["comment-img.jpg"], "delay": 5000 },
      { "content": "Comment 2", "image": ["another.jpg", "more.jpg"], "delay": 5000 }
    ]
  }]
}
```

### Date Handling

All dates use ISO 8601 format:
- Schedule posts: `-s "2024-12-31T12:00:00Z"`
- List posts: `--startDate "2024-01-01T00:00:00Z" --endDate "2024-12-31T23:59:59Z"`
- Defaults: `posts:list` uses 30 days ago to 30 days from now

### Media Upload Response

Upload returns JSON with path and metadata:
```json
{
  "path": "https://cdn.postiz.com/uploads/abc123.jpg",
  "size": 123456,
  "type": "image/jpeg"
}
```

Extract path for use in posts:
```bash
RESULT=$(postiz upload image.jpg)
PATH=$(echo "$RESULT" | jq -r '.path')
postiz posts:create -c "Content" -s "2024-12-31T12:00:00Z" -m "$PATH" -i "integration-id"
```

### JSON Mode vs CLI Flags

**CLI flags** - Quick posts:
```bash
postiz posts:create -c "Content" -m "img.jpg" -i "twitter-id"
```

**JSON mode** - Complex posts with multiple platforms and settings:
```bash
postiz posts:create --json post.json
```

JSON mode supports:
- Multiple platforms with different content per platform
- Complex provider-specific settings
- Scheduled posts
- Posts with many comments
- Custom delay between comments

---

## Platform-Specific Examples

### Reddit
```bash
postiz posts:create \
  -c "Post content" \
  -s "2024-12-31T12:00:00Z" \
  --settings '{"subreddit":[{"value":{"subreddit":"programming","title":"My Title","type":"text","url":"","is_flair_required":false}}]}' \
  -i "reddit-id"
```

### YouTube
```bash
# Upload video first (required!)
VIDEO=$(postiz upload video.mp4)
VIDEO_URL=$(echo "$VIDEO" | jq -r '.path')

postiz posts:create \
  -c "Video description" \
  -s "2024-12-31T12:00:00Z" \
  --settings '{"title":"Video Title","type":"public","tags":[{"value":"tech","label":"Tech"}]}' \
  -m "$VIDEO_URL" \
  -i "youtube-id"
```

### TikTok
```bash
# Upload video first (TikTok only accepts verified URLs!)
VIDEO=$(postiz upload video.mp4)
VIDEO_URL=$(echo "$VIDEO" | jq -r '.path')

postiz posts:create \
  -c "Video caption #fyp" \
  -s "2024-12-31T12:00:00Z" \
  --settings '{"privacy":"PUBLIC_TO_EVERYONE","duet":true,"stitch":true}' \
  -m "$VIDEO_URL" \
  -i "tiktok-id"
```

### X (Twitter)
```bash
postiz posts:create \
  -c "Tweet content" \
  -s "2024-12-31T12:00:00Z" \
  --settings '{"who_can_reply_post":"everyone"}' \
  -i "twitter-id"
```

### LinkedIn
```bash
# Personal post
postiz posts:create -c "Content" -s "2024-12-31T12:00:00Z" -i "linkedin-id"

# Company post
postiz posts:create \
  -c "Content" \
  -s "2024-12-31T12:00:00Z" \
  --settings '{"companyId":"company-123"}' \
  -i "linkedin-id"
```

### Instagram
```bash
# Upload image first (Instagram requires verified URLs!)
IMAGE=$(postiz upload image.jpg)
IMAGE_URL=$(echo "$IMAGE" | jq -r '.path')

# Regular post
postiz posts:create \
  -c "Caption #hashtag" \
  -s "2024-12-31T12:00:00Z" \
  --settings '{"post_type":"post"}' \
  -m "$IMAGE_URL" \
  -i "instagram-id"

# Story
STORY=$(postiz upload story.jpg)
STORY_URL=$(echo "$STORY" | jq -r '.path')

postiz posts:create \
  -c "" \
  -s "2024-12-31T12:00:00Z" \
  --settings '{"post_type":"story"}' \
  -m "$STORY_URL" \
  -i "instagram-id"
```

---

## Supporting Resources

**Deep-dive documentation:**
- [HOW_TO_RUN.md](./HOW_TO_RUN.md) - Installation and setup methods
- [COMMAND_LINE_GUIDE.md](./COMMAND_LINE_GUIDE.md) - Complete command syntax reference
- [PROVIDER_SETTINGS.md](./PROVIDER_SETTINGS.md) - All 28+ platform settings schemas
- [INTEGRATION_TOOLS_WORKFLOW.md](./INTEGRATION_TOOLS_WORKFLOW.md) - Complete tools workflow guide
- [INTEGRATION_SETTINGS_DISCOVERY.md](./INTEGRATION_SETTINGS_DISCOVERY.md) - Settings discovery workflow
- [SUPPORTED_FILE_TYPES.md](./SUPPORTED_FILE_TYPES.md) - All supported media formats
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Code architecture
- [PUBLISHING.md](./PUBLISHING.md) - npm publishing guide

**Ready-to-use examples:**
- [examples/EXAMPLES.md](./examples/EXAMPLES.md) - Comprehensive examples
- [examples/basic-usage.sh](./examples/basic-usage.sh) - Shell script basics
- [examples/ai-agent-example.js](./examples/ai-agent-example.js) - Node.js agent
- [examples/post-with-comments.json](./examples/post-with-comments.json) - Threading example
- [examples/multi-platform-with-settings.json](./examples/multi-platform-with-settings.json) - Campaign example
- [examples/youtube-video.json](./examples/youtube-video.json) - YouTube with tags
- [examples/reddit-post.json](./examples/reddit-post.json) - Reddit with subreddit
- [examples/tiktok-video.json](./examples/tiktok-video.json) - TikTok with privacy

---

## Common Gotchas

1. **API Key not set** - Always `export POSTIZ_API_KEY=key` before using CLI
2. **Invalid integration ID** - Run `integrations:list` to get current IDs
3. **Settings schema mismatch** - Check `integrations:settings` for required fields
4. **Media MUST be uploaded to Postiz first** - ⚠️ **CRITICAL:** TikTok, Instagram, YouTube, and many platforms only accept verified URLs. Upload files via `postiz upload` first, then use the returned URL in `-m`. External URLs will be rejected!
5. **JSON escaping in shell** - Use single quotes for JSON: `--settings '{...}'`
6. **Date format** - Must be ISO 8601: `"2024-12-31T12:00:00Z"` and is REQUIRED
7. **Tool not found** - Check available tools in `integrations:settings` output
8. **Character limits** - Each platform has different limits, check `maxLength` in settings
9. **Required settings** - Some platforms require specific settings (Reddit needs title, YouTube needs title)
10. **Media MIME types** - CLI auto-detects from file extension, ensure correct extension

---

## Quick Reference

```bash
# Environment
export POSTIZ_API_KEY=key

# Discovery
postiz integrations:list                           # Get integration IDs
postiz integrations:settings <id>                  # Get settings schema
postiz integrations:trigger <id> <method> -d '{}'  # Fetch dynamic data

# Posting (date is REQUIRED)
postiz posts:create -c "text" -s "2024-12-31T12:00:00Z" -i "id"                  # Simple
postiz posts:create -c "text" -s "2024-12-31T12:00:00Z" -t draft -i "id"        # Draft
postiz posts:create -c "text" -m "img.jpg" -s "2024-12-31T12:00:00Z" -i "id"    # With media
postiz posts:create -c "main" -c "comment" -s "2024-12-31T12:00:00Z" -i "id"    # With comment
postiz posts:create -c "text" -s "2024-12-31T12:00:00Z" --settings '{}' -i "id" # Platform-specific
postiz posts:create --json file.json                                             # Complex

# Management
postiz posts:list                                  # List posts
postiz posts:delete <id>                          # Delete post
postiz upload <file>                              # Upload media

# Help
postiz --help                                     # Show help
postiz posts:create --help                        # Command help
```

# Provider-Specific Settings

The Postiz CLI supports platform-specific settings for each integration. Different platforms have different options and requirements.

## How to Use Provider Settings

### Method 1: Command Line Flags

```bash
postiz posts:create \
  -c "Your content" \
  -p <provider-type> \
  --settings '<json-settings>' \
  -i "integration-id"
```

### Method 2: JSON File

```bash
postiz posts:create --json post-with-settings.json
```

In the JSON file, specify settings per integration:

```json
{
  "type": "now",
  "date": "2024-01-15T12:00:00Z",
  "shortLink": true,
  "tags": [],
  "posts": [{
    "integration": { "id": "reddit-123" },
    "value": [{ "content": "Post content", "image": [] }],
    "settings": {
      "__type": "reddit",
      "subreddit": [{
        "value": {
          "subreddit": "programming",
          "title": "My Post Title",
          "type": "text",
          "url": "",
          "is_flair_required": false
        }
      }]
    }
  }]
}
```

## Supported Platforms & Settings

### Reddit (`reddit`)

**Settings:**
- `subreddit` (required): Subreddit name
- `title` (required): Post title
- `type` (required): `"text"` or `"link"`
- `url` (required for links): URL if type is "link"
- `is_flair_required` (boolean): Whether flair is required
- `flair` (optional): Flair object with `id` and `name`

**Example:**
```bash
postiz posts:create \
  -c "Post content here" \
  -p reddit \
  --settings '{
    "subreddit": [{
      "value": {
        "subreddit": "programming",
        "title": "Check out this cool project",
        "type": "text",
        "url": "",
        "is_flair_required": false
      }
    }]
  }' \
  -i "reddit-123"
```

### YouTube (`youtube`)

**Settings:**
- `title` (required): Video title (2-100 characters)
- `type` (required): `"public"`, `"private"`, or `"unlisted"`
- `selfDeclaredMadeForKids` (optional): `"yes"` or `"no"`
- `thumbnail` (optional): Thumbnail MediaDto object
- `tags` (optional): Array of tag objects with `value` and `label`

**Example:**
```bash
postiz posts:create \
  -c "Video description here" \
  -p youtube \
  --settings '{
    "title": "My Awesome Video",
    "type": "public",
    "selfDeclaredMadeForKids": "no",
    "tags": [
      {"value": "tech", "label": "Tech"},
      {"value": "tutorial", "label": "Tutorial"}
    ]
  }' \
  -i "youtube-123"
```

### X / Twitter (`x`)

**Settings:**
- `community` (optional): X community URL (format: `https://x.com/i/communities/1234567890`)
- `who_can_reply_post` (required): Who can reply
  - `"everyone"` - Anyone can reply
  - `"following"` - Only people you follow
  - `"mentionedUsers"` - Only mentioned users
  - `"subscribers"` - Only subscribers
  - `"verified"` - Only verified users

**Example:**
```bash
postiz posts:create \
  -c "Tweet content" \
  -p x \
  --settings '{
    "who_can_reply_post": "everyone"
  }' \
  -i "twitter-123"
```

**With Community:**
```bash
postiz posts:create \
  -c "Community tweet" \
  -p x \
  --settings '{
    "community": "https://x.com/i/communities/1493446837214187523",
    "who_can_reply_post": "everyone"
  }' \
  -i "twitter-123"
```

### LinkedIn (`linkedin`)

**Settings:**
- `post_as_images_carousel` (boolean): Post as image carousel
- `carousel_name` (optional): Carousel name if posting as carousel

**Example:**
```bash
postiz posts:create \
  -c "LinkedIn post" \
  -m "img1.jpg,img2.jpg,img3.jpg" \
  -p linkedin \
  --settings '{
    "post_as_images_carousel": true,
    "carousel_name": "Product Showcase"
  }' \
  -i "linkedin-123"
```

### Instagram (`instagram`)

**Settings:**
- `post_type` (required): `"post"` or `"story"`
- `is_trial_reel` (optional): Boolean
- `graduation_strategy` (optional): `"MANUAL"` or `"SS_PERFORMANCE"`
- `collaborators` (optional): Array of collaborator objects with `label`

**Example:**
```bash
postiz posts:create \
  -c "Instagram post" \
  -m "photo.jpg" \
  -p instagram \
  --settings '{
    "post_type": "post",
    "is_trial_reel": false
  }' \
  -i "instagram-123"
```

**Story Example:**
```bash
postiz posts:create \
  -c "Story content" \
  -m "story-image.jpg" \
  -p instagram \
  --settings '{
    "post_type": "story"
  }' \
  -i "instagram-123"
```

### TikTok (`tiktok`)

**Settings:**
- `title` (optional): Video title (max 90 characters)
- `privacy_level` (required): Privacy level
  - `"PUBLIC_TO_EVERYONE"`
  - `"MUTUAL_FOLLOW_FRIENDS"`
  - `"FOLLOWER_OF_CREATOR"`
  - `"SELF_ONLY"`
- `duet` (boolean): Allow duets
- `stitch` (boolean): Allow stitch
- `comment` (boolean): Allow comments
- `autoAddMusic` (required): `"yes"` or `"no"`
- `brand_content_toggle` (boolean): Brand content toggle
- `brand_organic_toggle` (boolean): Brand organic toggle
- `video_made_with_ai` (optional): Boolean
- `content_posting_method` (required): `"DIRECT_POST"` or `"UPLOAD"`

**Example:**
```bash
postiz posts:create \
  -c "TikTok video description" \
  -m "video.mp4" \
  -p tiktok \
  --settings '{
    "title": "Check this out!",
    "privacy_level": "PUBLIC_TO_EVERYONE",
    "duet": true,
    "stitch": true,
    "comment": true,
    "autoAddMusic": "no",
    "brand_content_toggle": false,
    "brand_organic_toggle": false,
    "content_posting_method": "DIRECT_POST"
  }' \
  -i "tiktok-123"
```

### Facebook (`facebook`)

Settings available - check the DTO for specifics.

### Pinterest (`pinterest`)

Settings available - check the DTO for specifics.

### Discord (`discord`)

Settings available - check the DTO for specifics.

### Slack (`slack`)

Settings available - check the DTO for specifics.

### Medium (`medium`)

Settings available - check the DTO for specifics.

### Dev.to (`devto`)

Settings available - check the DTO for specifics.

### Hashnode (`hashnode`)

Settings available - check the DTO for specifics.

### WordPress (`wordpress`)

Settings available - check the DTO for specifics.

## Platforms Without Specific Settings

These platforms use the default `EmptySettings`:
- `threads`
- `mastodon`
- `bluesky`
- `telegram`
- `nostr`
- `vk`

For these, you don't need to specify settings or can use:
```bash
-p threads  # or any of the above
```

## Using JSON Files for Complex Settings

For complex settings, it's easier to use JSON files:

### Reddit Example

**reddit-post.json:**
```json
{
  "type": "now",
  "date": "2024-01-15T12:00:00Z",
  "shortLink": true,
  "tags": [],
  "posts": [{
    "integration": { "id": "reddit-123" },
    "value": [{
      "content": "Check out this cool project!",
      "image": []
    }],
    "settings": {
      "__type": "reddit",
      "subreddit": [{
        "value": {
          "subreddit": "programming",
          "title": "My Cool Project - Built with TypeScript",
          "type": "text",
          "url": "",
          "is_flair_required": true,
          "flair": {
            "id": "flair-123",
            "name": "Project"
          }
        }
      }]
    }
  }]
}
```

```bash
postiz posts:create --json reddit-post.json
```

### YouTube Example

**youtube-video.json:**
```json
{
  "type": "schedule",
  "date": "2024-12-25T12:00:00Z",
  "shortLink": true,
  "tags": [],
  "posts": [{
    "integration": { "id": "youtube-123" },
    "value": [{
      "content": "Full video description with timestamps...",
      "image": [{
        "id": "thumb1",
        "path": "https://cdn.example.com/thumbnail.jpg"
      }]
    }],
    "settings": {
      "__type": "youtube",
      "title": "How to Build a CLI Tool",
      "type": "public",
      "selfDeclaredMadeForKids": "no",
      "tags": [
        { "value": "programming", "label": "Programming" },
        { "value": "typescript", "label": "TypeScript" },
        { "value": "tutorial", "label": "Tutorial" }
      ]
    }
  }]
}
```

```bash
postiz posts:create --json youtube-video.json
```

### Multi-Platform with Different Settings

**multi-platform-campaign.json:**
```json
{
  "type": "now",
  "date": "2024-01-15T12:00:00Z",
  "shortLink": true,
  "tags": [],
  "posts": [
    {
      "integration": { "id": "reddit-123" },
      "value": [{ "content": "Reddit-specific content", "image": [] }],
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
    },
    {
      "integration": { "id": "twitter-123" },
      "value": [{ "content": "Twitter-specific content", "image": [] }],
      "settings": {
        "__type": "x",
        "who_can_reply_post": "everyone"
      }
    },
    {
      "integration": { "id": "linkedin-123" },
      "value": [
        {
          "content": "LinkedIn post",
          "image": [
            { "id": "1", "path": "img1.jpg" },
            { "id": "2", "path": "img2.jpg" }
          ]
        }
      ],
      "settings": {
        "__type": "linkedin",
        "post_as_images_carousel": true,
        "carousel_name": "Product Launch"
      }
    }
  ]
}
```

## Tips

1. **Use JSON files for complex settings** - Command-line JSON strings get messy fast
2. **Validate your settings** - The API will return errors if settings are invalid
3. **Check required fields** - Each platform has different required fields
4. **Platform-specific content** - Different platforms may need different content/media
5. **Test with drafts first** - Use `"type": "draft"` to test without posting

## Finding Your Provider Type

To find the correct provider type for your integration:

```bash
postiz integrations:list
```

This will show the `provider` field for each integration, which corresponds to the `__type` in settings.

## Common Errors

### Missing __type

```json
{
  "settings": {
    "title": "My Video"  // ❌ Missing __type
  }
}
```

**Fix:**
```json
{
  "settings": {
    "__type": "youtube",  // ✅ Add __type
    "title": "My Video"
  }
}
```

### Wrong Provider Type

```bash
# ❌ Wrong
-p twitter  # Should be "x"

# ✅ Correct
-p x
```

### Invalid Settings for Platform

Each platform validates its own settings. Check the error message and refer to the platform's required fields above.

## See Also

- **EXAMPLES.md** - General usage examples
- **COMMAND_LINE_GUIDE.md** - Command-line syntax
- **SKILL.md** - AI agent patterns
- Source DTOs in `libraries/nestjs-libraries/src/dtos/posts/providers-settings/`

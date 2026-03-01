# Provider-Specific Settings - Quick Reference

## ✅ What's Supported

The CLI now supports **platform-specific settings** for all 28+ integrations!

## Supported Platforms

### Platforms with Specific Settings

| Platform | Type | Key Settings |
|----------|------|--------------|
| **Reddit** | `reddit` | subreddit, title, type, url, flair |
| **YouTube** | `youtube` | title, type (public/private/unlisted), tags, thumbnail |
| **X (Twitter)** | `x` | who_can_reply_post, community |
| **LinkedIn** | `linkedin` | post_as_images_carousel, carousel_name |
| **Instagram** | `instagram` | post_type (post/story), collaborators |
| **TikTok** | `tiktok` | title, privacy_level, duet, stitch, comment, autoAddMusic |
| **Facebook** | `facebook` | Platform-specific settings |
| **Pinterest** | `pinterest` | Platform-specific settings |
| **Discord** | `discord` | Platform-specific settings |
| **Slack** | `slack` | Platform-specific settings |
| **Medium** | `medium` | Platform-specific settings |
| **Dev.to** | `devto` | Platform-specific settings |
| **Hashnode** | `hashnode` | Platform-specific settings |
| **WordPress** | `wordpress` | Platform-specific settings |
| And 15+ more... | | See PROVIDER_SETTINGS.md |

### Platforms with Default Settings

These use `EmptySettings` (no special configuration needed):
- Threads, Mastodon, Bluesky, Telegram, Nostr, VK

## Usage

### Method 1: Command Line

```bash
postiz posts:create \
  -c "Content" \
  -p <provider-type> \
  --settings '<json-settings>' \
  -i "integration-id"
```

### Method 2: JSON File

```json
{
  "posts": [{
    "integration": { "id": "integration-id" },
    "value": [...],
    "settings": {
      "__type": "provider-type",
      ...
    }
  }]
}
```

## Quick Examples

### Reddit Post

```bash
postiz posts:create \
  -c "Check out this project!" \
  -p reddit \
  --settings '{
    "subreddit": [{
      "value": {
        "subreddit": "programming",
        "title": "My Cool Project",
        "type": "text",
        "url": "",
        "is_flair_required": false
      }
    }]
  }' \
  -i "reddit-123"
```

### YouTube Video

```bash
postiz posts:create \
  -c "Full video description..." \
  -p youtube \
  --settings '{
    "title": "How to Build a CLI",
    "type": "public",
    "tags": [
      {"value": "tech", "label": "Tech"},
      {"value": "tutorial", "label": "Tutorial"}
    ]
  }' \
  -i "youtube-123"
```

### Twitter/X with Reply Controls

```bash
postiz posts:create \
  -c "Important announcement!" \
  -p x \
  --settings '{
    "who_can_reply_post": "verified"
  }' \
  -i "twitter-123"
```

### LinkedIn Carousel

```bash
postiz posts:create \
  -c "Product showcase" \
  -m "img1.jpg,img2.jpg,img3.jpg" \
  -p linkedin \
  --settings '{
    "post_as_images_carousel": true,
    "carousel_name": "Product Launch"
  }' \
  -i "linkedin-123"
```

### Instagram Story

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

### TikTok Video

```bash
postiz posts:create \
  -c "TikTok description #fyp" \
  -m "video.mp4" \
  -p tiktok \
  --settings '{
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

## JSON File Examples

We've created example JSON files for you:

- **`reddit-post.json`** - Reddit post with subreddit settings
- **`youtube-video.json`** - YouTube video with title, tags, thumbnail
- **`tiktok-video.json`** - TikTok video with full settings
- **`multi-platform-with-settings.json`** - Multi-platform campaign with different settings per platform

## Finding Provider Types

```bash
postiz integrations:list
```

Look at the `provider` field - this is your provider type!

## Common Provider Types

- `reddit` - Reddit
- `youtube` - YouTube
- `x` - X (Twitter)
- `linkedin` or `linkedin-page` - LinkedIn
- `instagram` or `instagram-standalone` - Instagram
- `tiktok` - TikTok
- `facebook` - Facebook
- `pinterest` - Pinterest
- `discord` - Discord
- `slack` - Slack
- `threads` - Threads (no specific settings)
- `bluesky` - Bluesky (no specific settings)
- `mastodon` - Mastodon (no specific settings)

## Documentation

📖 **[PROVIDER_SETTINGS.md](./PROVIDER_SETTINGS.md)** - Complete documentation with all platform settings

Includes:
- All available settings for each platform
- Required vs optional fields
- Validation rules
- More examples
- Common errors and solutions

## Tips

1. **Use JSON files for complex settings** - Easier to manage than command-line strings
2. **Different settings per platform** - Each platform in a multi-platform post can have different settings
3. **Validate before posting** - Use `"type": "draft"` to test
4. **Check examples** - See `examples/` directory for working templates
5. **Provider type matters** - Make sure `__type` matches your integration's provider

## Summary

✅ **28+ platforms supported**
✅ **Platform-specific settings for Reddit, YouTube, TikTok, X, LinkedIn, Instagram, and more**
✅ **Easy command-line interface**
✅ **JSON file support for complex configs**
✅ **Full type validation**
✅ **Comprehensive examples included**

**The CLI now supports the full power of each platform!** 🚀

# Postiz CLI - Feature Summary

## ✅ Complete Feature Set

### Posts with Comments and Media - FULLY SUPPORTED

The Postiz CLI **fully supports** the complete API structure including:

#### ✅ Posts with Comments
- Main post content
- Multiple comments/replies
- Each comment can have different content
- Configurable delays between comments

#### ✅ Multiple Media per Post/Comment
- Each post can have **multiple images** (array of MediaDto)
- Each comment can have **its own images** (separate MediaDto arrays)
- Support for various image formats (PNG, JPG, JPEG, GIF)
- Media can be URLs or uploaded files

#### ✅ Multi-Platform Posting
- Post to multiple platforms in one request
- Platform-specific content for each integration
- Different media for different platforms

#### ✅ Advanced Features
- Scheduled posting with precise timestamps
- URL shortening support
- Tags and metadata
- Delays between comments (in milliseconds)
- Draft mode for review before posting

## Usage Modes

### 1. Simple Mode (Command Line)

For quick, simple posts:

```bash
# Single post
postiz posts:create -c "Hello!" -i "twitter-123"

# With multiple images
postiz posts:create -c "Post" --image "img1.jpg,img2.jpg,img3.jpg" -i "twitter-123"

# With comments (no custom media per comment)
postiz posts:create -c "Main" --comments "Comment 1;Comment 2" -i "twitter-123"
```

**Limitations of Simple Mode:**
- Comments share the same media as the main post
- Cannot specify different images for each comment
- Cannot set custom delays between comments

### 2. Advanced Mode (JSON Files)

For complex posts with comments that have their own media:

```bash
postiz posts:create --json complex-post.json
```

**Capabilities:**
- ✅ Each comment can have different media
- ✅ Custom delays between comments
- ✅ Multiple posts to different platforms
- ✅ Platform-specific content and media
- ✅ Full control over all API features

## Real-World Examples

### Example 1: Product Launch with Follow-up Comments

**Main Post:** Product announcement with 3 product images
**Comment 1:** Feature highlight with 1 feature screenshot (posted 1 hour later)
**Comment 2:** Special offer with 1 promotional image (posted 2 hours later)

```json
{
  "type": "schedule",
  "date": "2024-03-15T09:00:00Z",
  "posts": [{
    "integration": { "id": "twitter-123" },
    "value": [
      {
        "content": "🚀 Launching our new product!",
        "image": [
          { "id": "p1", "path": "product-1.jpg" },
          { "id": "p2", "path": "product-2.jpg" },
          { "id": "p3", "path": "product-3.jpg" }
        ]
      },
      {
        "content": "⭐ Key features you'll love:",
        "image": [
          { "id": "f1", "path": "features-screenshot.jpg" }
        ],
        "delay": 3600000
      },
      {
        "content": "🎁 Limited time: 50% off!",
        "image": [
          { "id": "o1", "path": "special-offer.jpg" }
        ],
        "delay": 7200000
      }
    ]
  }]
}
```

### Example 2: Tutorial Thread

**Main Post:** Introduction with overview image
**Tweets 2-5:** Step-by-step with different screenshots for each step

```json
{
  "type": "now",
  "posts": [{
    "integration": { "id": "twitter-123" },
    "value": [
      {
        "content": "🧵 How to use our CLI (1/5)",
        "image": [{ "id": "1", "path": "overview.jpg" }]
      },
      {
        "content": "Step 1: Installation (2/5)",
        "image": [{ "id": "2", "path": "step1.jpg" }],
        "delay": 2000
      },
      {
        "content": "Step 2: Configuration (3/5)",
        "image": [{ "id": "3", "path": "step2.jpg" }],
        "delay": 2000
      },
      {
        "content": "Step 3: First post (4/5)",
        "image": [{ "id": "4", "path": "step3.jpg" }],
        "delay": 2000
      },
      {
        "content": "You're all set! 🎉 (5/5)",
        "image": [{ "id": "5", "path": "done.jpg" }],
        "delay": 2000
      }
    ]
  }]
}
```

### Example 3: Multi-Platform Campaign

**Same event, different content per platform:**

```json
{
  "type": "schedule",
  "date": "2024-12-25T12:00:00Z",
  "posts": [
    {
      "integration": { "id": "twitter-123" },
      "value": [
        {
          "content": "Short, catchy Twitter post 🐦",
          "image": [{ "id": "t1", "path": "twitter-square.jpg" }]
        },
        {
          "content": "Thread continuation with details",
          "image": [{ "id": "t2", "path": "twitter-details.jpg" }],
          "delay": 5000
        }
      ]
    },
    {
      "integration": { "id": "linkedin-456" },
      "value": [{
        "content": "Professional, detailed LinkedIn post with business context...",
        "image": [
          { "id": "l1", "path": "linkedin-wide.jpg" },
          { "id": "l2", "path": "linkedin-graph.jpg" }
        ]
      }]
    },
    {
      "integration": { "id": "facebook-789" },
      "value": [
        {
          "content": "Engaging Facebook post for family/friends audience",
          "image": [
            { "id": "f1", "path": "facebook-photo1.jpg" },
            { "id": "f2", "path": "facebook-photo2.jpg" },
            { "id": "f3", "path": "facebook-photo3.jpg" }
          ]
        },
        {
          "content": "More info in the comments!",
          "image": [{ "id": "f4", "path": "facebook-cta.jpg" }],
          "delay": 300000
        }
      ]
    }
  ]
}
```

## API Structure Reference

### Complete CreatePostDto

```typescript
{
  type: 'now' | 'schedule' | 'draft' | 'update',
  date: string,              // ISO 8601 date
  shortLink: boolean,
  tags: Array<{
    value: string,
    label: string
  }>,
  posts: Array<{
    integration: {
      id: string             // From integrations:list
    },
    value: Array<{           // Main post + comments
      content: string,
      image: Array<{         // Multiple images per post/comment
        id: string,
        path: string,
        alt?: string,
        thumbnail?: string
      }>,
      delay?: number,        // Milliseconds
      id?: string
    }>,
    settings: {
      __type: 'EmptySettings'
    }
  }>
}
```

## For AI Agents

### When to Use Simple Mode
- Quick single posts
- No need for comment-specific media
- Posting to 1-2 platforms
- Same content across platforms

### When to Use Advanced Mode (JSON)
- ✅ **Comments need their own media** ← YOUR USE CASE
- ✅ Multi-platform with different content
- ✅ Threads with step-by-step images
- ✅ Timed follow-up comments
- ✅ Complex campaigns

### AI Agent Tips

1. **Generate JSON programmatically** - Don't write JSON manually
2. **Validate structure** - Use TypeScript types or JSON schema
3. **Test with "draft" type** - Review before posting
4. **Use unique image IDs** - Generate with UUID or random strings
5. **Set appropriate delays** - Twitter: 2-5s, others: 30s-1min+

## Files and Documentation

- **examples/post-with-comments.json** - Post with comments, each having media
- **examples/multi-platform-post.json** - Multi-platform campaign
- **examples/thread-post.json** - Twitter thread example
- **examples/EXAMPLES.md** - Comprehensive guide with all patterns
- **SKILL.md** - Full AI agent usage guide
- **README.md** - Installation and basic usage

## Summary

### Question: Does it support posts with comments, each with media?

**Answer: YES! ✅**

- ✅ Posts can have multiple comments
- ✅ Each comment can have its own media (multiple images)
- ✅ Each post can have multiple images
- ✅ Use JSON files for full control
- ✅ See examples/ directory for working templates
- ✅ Fully compatible with the Postiz API structure

The CLI supports the **complete Postiz API** including all advanced features!

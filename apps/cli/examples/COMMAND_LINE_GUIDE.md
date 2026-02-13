# Postiz CLI - Command Line Guide

## New Syntax: Multiple `-c` and `-m` Flags

The CLI now supports a much more intuitive syntax for creating posts with comments that have their own media.

## Basic Syntax

```bash
postiz posts:create \
  -c "content" -m "media" \    # Can be repeated multiple times
  -c "content" -m "media" \    # Each pair = one post/comment
  -i "integration-id"
```

### How It Works

- **First `-c`**: Main post content
- **Subsequent `-c`**: Comments/replies
- **Each `-m`**: Media for the corresponding `-c`
- `-m` is optional (text-only posts/comments)
- Order matters: `-c` and `-m` are paired in order

## Examples

### 1. Simple Post

```bash
postiz posts:create \
  -c "Hello World!" \
  -i "twitter-123"
```

### 2. Post with Multiple Images

```bash
postiz posts:create \
  -c "Check out these photos!" \
  -m "photo1.jpg,photo2.jpg,photo3.jpg" \
  -i "twitter-123"
```

**Result:**
- Main post with 3 images

### 3. Post with Comments, Each Having Their Own Media

```bash
postiz posts:create \
  -c "Main post 🚀" \
  -m "main-image1.jpg,main-image2.jpg" \
  -c "First comment 📸" \
  -m "comment1-image.jpg" \
  -c "Second comment 🎨" \
  -m "comment2-img1.jpg,comment2-img2.jpg" \
  -i "twitter-123"
```

**Result:**
- Main post with 2 images
- First comment (posted 5s later) with 1 image
- Second comment (posted 10s later) with 2 images

### 4. Comments Can Contain Semicolons! 🎉

```bash
postiz posts:create \
  -c "Main post" \
  -c "First comment; with a semicolon!" \
  -c "Second comment; with multiple; semicolons; works fine!" \
  -i "twitter-123"
```

**No escaping needed!** Each `-c` is a separate argument, so special characters work perfectly.

### 5. Twitter Thread

```bash
postiz posts:create \
  -c "🧵 Thread about X (1/5)" \
  -m "thread1.jpg" \
  -c "Key point 1 (2/5)" \
  -m "thread2.jpg" \
  -c "Key point 2 (3/5)" \
  -m "thread3.jpg" \
  -c "Key point 3 (4/5)" \
  -m "thread4.jpg" \
  -c "Conclusion 🎉 (5/5)" \
  -m "thread5.jpg" \
  -d 2000 \
  -i "twitter-123"
```

**Result:** 5-part thread with 2-second delays between tweets

### 6. Mix: Some with Media, Some Without

```bash
postiz posts:create \
  -c "Amazing sunset! 🌅" \
  -m "sunset.jpg" \
  -c "Taken at 6:30 PM" \
  -c "Location: Santa Monica Beach" \
  -c "Camera: iPhone 15 Pro" \
  -i "twitter-123"
```

**Result:**
- Main post with 1 image
- 3 text-only comments

### 7. Multi-Platform with Same Content

```bash
postiz posts:create \
  -c "Big announcement! 🎉" \
  -m "announcement.jpg" \
  -c "More details coming soon..." \
  -i "twitter-123,linkedin-456,facebook-789"
```

**Result:** Same post + comment posted to all 3 platforms

### 8. Scheduled Post with Follow-ups

```bash
postiz posts:create \
  -c "Product launching today! 🚀" \
  -m "product-hero.jpg,product-features.jpg" \
  -c "Special launch offer: 50% off!" \
  -m "discount-banner.jpg" \
  -c "Limited to first 100 customers!" \
  -s "2024-12-25T09:00:00Z" \
  -i "twitter-123"
```

**Result:** Scheduled main post with 2 follow-up comments

### 9. Product Tutorial

```bash
postiz posts:create \
  -c "Tutorial: How to Use Feature X 📖" \
  -m "tutorial-intro.jpg" \
  -c "Step 1: Open the settings menu" \
  -m "step1-screenshot.jpg" \
  -c "Step 2: Toggle the feature on" \
  -m "step2-screenshot.jpg" \
  -c "Step 3: Customize your preferences" \
  -m "step3-screenshot.jpg" \
  -c "That's it! You're all set 🎉" \
  -d 3000 \
  -i "twitter-123"
```

## Options Reference

| Flag | Alias | Description | Multiple? |
|------|-------|-------------|-----------|
| `--content` | `-c` | Post/comment content | ✅ Yes |
| `--media` | `-m` | Comma-separated media URLs | ✅ Yes |
| `--integrations` | `-i` | Comma-separated integration IDs | ❌ No |
| `--schedule` | `-s` | ISO 8601 date (schedule post) | ❌ No |
| `--delay` | `-d` | Delay between comments (ms) | ❌ No |
| `--shortLink` | - | Use URL shortener | ❌ No |
| `--json` | `-j` | Load from JSON file | ❌ No |

## How `-c` and `-m` Pair Together

```bash
postiz posts:create \
  -c "First content"  -m "first-media.jpg" \     # Pair 1 → Main post
  -c "Second content" -m "second-media.jpg" \    # Pair 2 → Comment 1
  -c "Third content"  -m "third-media.jpg" \     # Pair 3 → Comment 2
  -i "twitter-123"
```

**Pairing logic:**
- 1st `-c` pairs with 1st `-m` (if provided)
- 2nd `-c` pairs with 2nd `-m` (if provided)
- 3rd `-c` pairs with 3rd `-m` (if provided)
- If no `-m` for a `-c`, it's text-only

## Delay Between Comments

Use `-d` or `--delay` to set the delay (in milliseconds) between comments:

```bash
postiz posts:create \
  -c "Main post" \
  -c "Comment 1" \
  -c "Comment 2" \
  -d 10000 \       # 10 seconds between each
  -i "twitter-123"
```

**Default:** 5000ms (5 seconds)

## Comparison: Old vs New Syntax

### ❌ Old Way (Limited)

```bash
# Could only do simple comments without custom media
postiz posts:create \
  -c "Main post" \
  --comments "Comment 1;Comment 2;Comment 3" \
  --image "main-image.jpg" \
  -i "twitter-123"
```

**Problems:**
- Comments couldn't have their own media
- Semicolons in content would break it
- Less intuitive

### ✅ New Way (Flexible)

```bash
postiz posts:create \
  -c "Main post" -m "main.jpg" \
  -c "Comment 1; with semicolon!" -m "comment1.jpg" \
  -c "Comment 2" -m "comment2.jpg" \
  -i "twitter-123"
```

**Benefits:**
- ✅ Each comment can have its own media
- ✅ Semicolons work fine
- ✅ More readable
- ✅ More flexible

## When to Use JSON vs Command Line

### Use Command Line (`-c` and `-m`) When:
- ✅ Same content for all integrations
- ✅ Simple, straightforward posts
- ✅ Quick one-off posts
- ✅ Scripting with dynamic content

### Use JSON (`--json`) When:
- ✅ Different content per platform
- ✅ Complex settings or metadata
- ✅ Reusable post templates
- ✅ Very long or formatted content

## Tips for AI Agents

### Generate Commands Programmatically

```javascript
function createThreadCommand(tweets, integrationId) {
  const parts = [
    'postiz posts:create'
  ];

  tweets.forEach(tweet => {
    parts.push(`-c "${tweet.content}"`);
    if (tweet.media && tweet.media.length > 0) {
      parts.push(`-m "${tweet.media.join(',')}"`);
    }
  });

  parts.push(`-i "${integrationId}"`);

  return parts.join(' \\\n  ');
}

const thread = [
  { content: "Tweet 1/3", media: ["img1.jpg"] },
  { content: "Tweet 2/3", media: ["img2.jpg"] },
  { content: "Tweet 3/3", media: ["img3.jpg"] }
];

const command = createThreadCommand(thread, "twitter-123");
console.log(command);
```

### Escape Special Characters

In bash, you may need to escape some characters:

```bash
# Single quotes prevent interpolation
postiz posts:create \
  -c 'Message with $variables and "quotes"' \
  -i "twitter-123"

# Or use backslashes
postiz posts:create \
  -c "Message with \$variables and \"quotes\"" \
  -i "twitter-123"
```

## Error Handling

### Missing Integration

```bash
postiz posts:create -c "Post" -m "img.jpg"
# ❌ Error: --integrations is required when not using --json
```

**Fix:** Add `-i` flag

### No Content

```bash
postiz posts:create -i "twitter-123"
# ❌ Error: Either --content or --json is required
```

**Fix:** Add at least one `-c` flag

### Mismatched Count (OK!)

```bash
# This is fine! Extra -m flags are ignored
postiz posts:create \
  -c "Post 1" -m "img1.jpg" \
  -c "Post 2" \
  -c "Post 3" -m "img3.jpg" \
  -i "twitter-123"

# Result:
# - Post 1 with img1.jpg
# - Post 2 with no media
# - Post 3 with img3.jpg
```

## Full Example: Product Launch

```bash
#!/bin/bash

export POSTIZ_API_KEY=your_key

postiz posts:create \
  -c "🚀 Launching ProductX today!" \
  -m "https://cdn.example.com/hero.jpg,https://cdn.example.com/features.jpg" \
  -c "🎯 Key Features:\n• AI-powered\n• Cloud-native\n• Open source" \
  -m "https://cdn.example.com/features-detail.jpg" \
  -c "💰 Special launch pricing: 50% off for early adopters!" \
  -m "https://cdn.example.com/pricing.jpg" \
  -c "🔗 Get started: https://example.com/productx" \
  -s "2024-12-25T09:00:00Z" \
  -d 3600000 \
  -i "twitter-123,linkedin-456,facebook-789"

echo "✅ Product launch scheduled!"
```

## See Also

- **EXAMPLES.md** - JSON file examples
- **SKILL.md** - AI agent patterns
- **README.md** - Full documentation
- **examples/*.json** - Template files

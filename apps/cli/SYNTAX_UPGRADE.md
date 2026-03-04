# Postiz CLI - Improved Syntax! 🎉

## What Changed

The CLI now supports a **much better** command-line syntax for creating posts with comments that have their own media.

## New Syntax: Multiple `-c` and `-m` Flags

Instead of using semicolon-separated strings (which break when you need semicolons in your content), you can now use multiple `-c` and `-m` flags:

```bash
postiz posts:create \
  -c "main post content" -m "media1.png,media2.png" \
  -c "first comment" -m "media3.png" \
  -c "second comment; with semicolon!" -m "media4.png,media5.png" \
  -i "twitter-123"
```

## The Problem We Solved

### ❌ Old Approach (Problematic)

```bash
postiz posts:create \
  -c "Main post" \
  --comments "Comment 1;Comment 2;Comment 3" \
  -i "twitter-123"
```

**Issues:**
1. ❌ Can't use semicolons in comment text
2. ❌ Comments can't have their own media
3. ❌ Less intuitive syntax
4. ❌ Limited flexibility

### ✅ New Approach (Better!)

```bash
postiz posts:create \
  -c "Main post" -m "main.jpg" \
  -c "Comment 1; with semicolon!" -m "comment1.jpg" \
  -c "Comment 2" -m "comment2.jpg" \
  -c "Comment 3" \
  -i "twitter-123"
```

**Benefits:**
1. ✅ Semicolons work fine in content
2. ✅ Each comment can have different media
3. ✅ More readable and intuitive
4. ✅ Fully flexible

## How It Works

### Pairing Logic

The CLI pairs `-c` and `-m` flags in order:

```bash
postiz posts:create \
  -c "Content 1" -m "media-for-content-1.jpg" \    # Pair 1
  -c "Content 2" -m "media-for-content-2.jpg" \    # Pair 2
  -c "Content 3" -m "media-for-content-3.jpg" \    # Pair 3
  -i "twitter-123"
```

- **1st `-c`** = Main post
- **2nd `-c`** = First comment (posted after delay)
- **3rd `-c`** = Second comment (posted after delay)
- Each `-m` is paired with the corresponding `-c` (in order)

### Media is Optional

```bash
postiz posts:create \
  -c "Post with media" -m "image.jpg" \
  -c "Comment without media" \
  -c "Another comment" \
  -i "twitter-123"
```

Result:
- Post with image
- Text-only comment
- Another text-only comment

### Multiple Media per Post/Comment

```bash
postiz posts:create \
  -c "Main post" -m "img1.jpg,img2.jpg,img3.jpg" \
  -c "Comment" -m "img4.jpg,img5.jpg" \
  -i "twitter-123"
```

Result:
- Main post with 3 images
- Comment with 2 images

## Real Examples

### Example 1: Product Launch

```bash
postiz posts:create \
  -c "🚀 Launching ProductX today!" \
  -m "hero.jpg,features.jpg" \
  -c "⭐ Key features you'll love..." \
  -m "features-detail.jpg" \
  -c "💰 Special offer: 50% off!" \
  -m "discount.jpg" \
  -i "twitter-123,linkedin-456"
```

### Example 2: Twitter Thread

```bash
postiz posts:create \
  -c "🧵 Thread: How to X (1/5)" -m "intro.jpg" \
  -c "Step 1: ... (2/5)" -m "step1.jpg" \
  -c "Step 2: ... (3/5)" -m "step2.jpg" \
  -c "Step 3: ... (4/5)" -m "step3.jpg" \
  -c "Conclusion (5/5)" -m "done.jpg" \
  -d 2000 \
  -i "twitter-123"
```

### Example 3: Tutorial with Screenshots

```bash
postiz posts:create \
  -c "Tutorial: Feature X 📖" \
  -m "tutorial-cover.jpg" \
  -c "1. Open settings" \
  -m "settings-screenshot.jpg" \
  -c "2. Enable feature X" \
  -m "enable-screenshot.jpg" \
  -c "3. You're done! 🎉" \
  -m "success-screenshot.jpg" \
  -i "twitter-123"
```

### Example 4: Content with Special Characters

```bash
postiz posts:create \
  -c "Main post about programming" \
  -c "First tip: Use const; avoid var" \
  -c "Second tip: Functions should do one thing; keep it simple" \
  -c "Third tip: Comments should explain 'why'; not 'what'" \
  -i "twitter-123"
```

**No escaping needed!** Semicolons work perfectly.

## Options Reference

| Option | Alias | Multiple? | Description |
|--------|-------|-----------|-------------|
| `--content` | `-c` | ✅ Yes | Post/comment content |
| `--media` | `-m` | ✅ Yes | Comma-separated media URLs |
| `--integrations` | `-i` | ❌ No | Integration IDs |
| `--schedule` | `-s` | ❌ No | ISO 8601 date |
| `--delay` | `-d` | ❌ No | Delay between comments (ms, default: 5000) |
| `--shortLink` | - | ❌ No | Use URL shortener (default: true) |
| `--json` | `-j` | ❌ No | Load from JSON file |

## Delay Between Comments

Use `-d` to control the delay between comments:

```bash
postiz posts:create \
  -c "Main" \
  -c "Comment 1" \
  -c "Comment 2" \
  -d 10000 \    # 10 seconds between each
  -i "twitter-123"
```

**Default:** 5000ms (5 seconds)

## Command Line vs JSON

### Use Command Line When:
- ✅ Quick posts
- ✅ Same content for all platforms
- ✅ Simple structure
- ✅ Dynamic/scripted content

### Use JSON When:
- ✅ Different content per platform
- ✅ Very complex structures
- ✅ Reusable templates
- ✅ Integration with other tools

## For AI Agents

### Generating Commands

```javascript
function buildPostCommand(posts, integrationId) {
  const parts = ['postiz posts:create'];

  posts.forEach(post => {
    parts.push(`-c "${post.content.replace(/"/g, '\\"')}"`);
    if (post.media && post.media.length > 0) {
      parts.push(`-m "${post.media.join(',')}"`);
    }
  });

  parts.push(`-i "${integrationId}"`);

  return parts.join(' \\\n  ');
}

// Usage
const posts = [
  { content: "Main post", media: ["img1.jpg", "img2.jpg"] },
  { content: "Comment; with semicolon!", media: ["img3.jpg"] },
  { content: "Another comment", media: [] }
];

const command = buildPostCommand(posts, "twitter-123");
console.log(command);
```

Output:
```bash
postiz posts:create \
  -c "Main post" \
  -m "img1.jpg,img2.jpg" \
  -c "Comment; with semicolon!" \
  -m "img3.jpg" \
  -c "Another comment" \
  -i "twitter-123"
```

## Migration Guide

If you have existing scripts using the old syntax:

### Before:
```bash
postiz posts:create \
  -c "Main post" \
  --comments "Comment 1;Comment 2" \
  --image "main-image.jpg" \
  -i "twitter-123"
```

### After:
```bash
postiz posts:create \
  -c "Main post" -m "main-image.jpg" \
  -c "Comment 1" \
  -c "Comment 2" \
  -i "twitter-123"
```

## Documentation

See these files for more details:

- **COMMAND_LINE_GUIDE.md** - Comprehensive command-line guide
- **command-line-examples.sh** - Executable examples
- **EXAMPLES.md** - Full usage patterns
- **SKILL.md** - AI agent integration
- **README.md** - General documentation

## Summary

### ✅ You Can Now:

1. **Use multiple `-c` flags** for main post + comments
2. **Use multiple `-m` flags** to pair media with each `-c`
3. **Use semicolons freely** in your content
4. **Create complex threads** easily from command line
5. **Each comment has its own media** array
6. **More intuitive syntax** overall

### 🎯 Perfect For:

- Twitter threads
- Product launches with follow-ups
- Tutorials with screenshots
- Event coverage
- Multi-step announcements
- Any post with comments that need their own media!

**The CLI is now much more powerful and user-friendly!** 🚀

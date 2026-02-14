# Integration Tools Workflow

Some integrations require additional data (like IDs, tags, playlists, etc.) before you can post. The CLI supports a complete workflow to discover and use these tools.

## The Complete Workflow

### Step 1: List Integrations

```bash
postiz integrations:list
```

Get your integration IDs.

### Step 2: Get Integration Settings

```bash
postiz integrations:settings <integration-id>
```

This returns:
- `maxLength` - Character limit
- `settings` - Required/optional fields
- **`tools`** - Callable methods to fetch additional data

### Step 3: Trigger Tools (If Needed)

If settings require IDs/data you don't have, use the tools:

```bash
postiz integrations:trigger <integration-id> <method-name> -d '{"key":"value"}'
```

### Step 4: Create Post with Complete Settings

Use the data from Step 3 in your post settings.

## Real-World Example: Reddit

### 1. Get Reddit Integration Settings

```bash
postiz integrations:settings reddit-abc123
```

**Output:**
```json
{
  "output": {
    "maxLength": 40000,
    "settings": {
      "properties": {
        "subreddit": {
          "type": "array",
          "items": {
            "properties": {
              "subreddit": { "type": "string" },
              "title": { "type": "string" },
              "flair": {
                "properties": {
                  "id": { "type": "string" }  // ← Need flair ID!
                }
              }
            }
          }
        }
      }
    },
    "tools": [
      {
        "methodName": "getFlairs",
        "description": "Get available flairs for a subreddit",
        "dataSchema": [
          {
            "key": "subreddit",
            "description": "The subreddit name",
            "type": "string"
          }
        ]
      },
      {
        "methodName": "searchSubreddits",
        "description": "Search for subreddits",
        "dataSchema": [
          {
            "key": "query",
            "description": "Search query",
            "type": "string"
          }
        ]
      }
    ]
  }
}
```

### 2. Get Flairs for the Subreddit

```bash
postiz integrations:trigger reddit-abc123 getFlairs -d '{"subreddit":"programming"}'
```

**Output:**
```json
{
  "output": [
    {
      "id": "flair-12345",
      "name": "Discussion"
    },
    {
      "id": "flair-67890",
      "name": "Tutorial"
    }
  ]
}
```

### 3. Create Post with Flair ID

```bash
postiz posts:create \
  -c "Check out my project!" \
  -p reddit \
  --settings '{
    "subreddit": [{
      "value": {
        "subreddit": "programming",
        "title": "My Cool Project",
        "type": "text",
        "url": "",
        "is_flair_required": true,
        "flair": {
          "id": "flair-12345",
          "name": "Discussion"
        }
      }
    }]
  }' \
  -i "reddit-abc123"
```

## Example: YouTube Playlists

### 1. Get YouTube Settings

```bash
postiz integrations:settings youtube-123
```

**Output includes tools:**
```json
{
  "tools": [
    {
      "methodName": "getPlaylists",
      "description": "Get your YouTube playlists",
      "dataSchema": []
    },
    {
      "methodName": "getCategories",
      "description": "Get available video categories",
      "dataSchema": []
    }
  ]
}
```

### 2. Get Playlists

```bash
postiz integrations:trigger youtube-123 getPlaylists
```

**Output:**
```json
{
  "output": [
    {
      "id": "PLxxxxxx",
      "title": "My Tutorials"
    },
    {
      "id": "PLyyyyyy",
      "title": "Product Demos"
    }
  ]
}
```

### 3. Post to Specific Playlist

```bash
postiz posts:create \
  -c "Video description" \
  -p youtube \
  --settings '{
    "title": "My Video",
    "type": "public",
    "playlistId": "PLxxxxxx"
  }' \
  -i "youtube-123"
```

## Example: LinkedIn Companies

### 1. Get LinkedIn Settings

```bash
postiz integrations:settings linkedin-123
```

**Output includes tools:**
```json
{
  "tools": [
    {
      "methodName": "getCompanies",
      "description": "Get companies you can post to",
      "dataSchema": []
    }
  ]
}
```

### 2. Get Companies

```bash
postiz integrations:trigger linkedin-123 getCompanies
```

**Output:**
```json
{
  "output": [
    {
      "id": "company-123",
      "name": "My Company"
    },
    {
      "id": "company-456",
      "name": "Other Company"
    }
  ]
}
```

### 3. Post as Company

```bash
postiz posts:create \
  -c "Company announcement" \
  -p linkedin \
  --settings '{
    "companyId": "company-123"
  }' \
  -i "linkedin-123"
```

## Understanding Tools

### Tool Structure

```json
{
  "methodName": "getFlairs",
  "description": "Get available flairs for a subreddit",
  "dataSchema": [
    {
      "key": "subreddit",
      "description": "The subreddit name",
      "type": "string"
    }
  ]
}
```

- **methodName** - Use this in `integrations:trigger`
- **description** - What the tool does
- **dataSchema** - Required input parameters

### Calling Tools

```bash
# No parameters
postiz integrations:trigger <integration-id> <methodName>

# With parameters
postiz integrations:trigger <integration-id> <methodName> -d '{"key":"value"}'
```

## Common Tool Methods

### Reddit
- `getFlairs` - Get flairs for a subreddit
- `searchSubreddits` - Search for subreddits
- `getSubreddits` - Get subscribed subreddits

### YouTube
- `getPlaylists` - Get your playlists
- `getCategories` - Get video categories
- `getChannels` - Get your channels

### LinkedIn
- `getCompanies` - Get companies you manage
- `getOrganizations` - Get organizations

### Twitter/X
- `getListsowned` - Get your Twitter lists
- `getCommunities` - Get communities you're in

### Pinterest
- `getBoards` - Get your Pinterest boards
- `getBoardSections` - Get sections in a board

## AI Agent Workflow

For AI agents, this enables dynamic discovery and usage:

```javascript
// 1. Get settings and tools
const settings = JSON.parse(
  execSync(`postiz integrations:settings ${integrationId}`)
);

// 2. Check if tools are needed
const tools = settings.output.tools || [];

// 3. Call tools to get required data
for (const tool of tools) {
  if (needsThisTool(tool)) {
    const data = buildDataForTool(tool.dataSchema);
    const result = JSON.parse(
      execSync(
        `postiz integrations:trigger ${integrationId} ${tool.methodName} -d '${JSON.stringify(data)}'`
      )
    );

    // Use result.output in your settings
    updateSettings(result.output);
  }
}

// 4. Create post with complete settings
execSync(`postiz posts:create -c "${content}" --settings '${JSON.stringify(settings)}' -i "${integrationId}"`);
```

## Error Handling

### Tool Not Found

```bash
postiz integrations:trigger reddit-123 invalidMethod
# ❌ Failed to trigger tool: Tool not found
```

### Missing Required Data

```bash
postiz integrations:trigger reddit-123 getFlairs
# ❌ Missing required parameter: subreddit
```

### Integration Not Found

```bash
postiz integrations:trigger invalid-id getFlairs
# ❌ Failed to trigger tool: Integration not found
```

## Tips

1. **Always check tools first** - Run `integrations:settings` to see available tools
2. **Read dataSchema** - Know what parameters each tool needs
3. **Parse JSON output** - Use `jq` or similar to extract data
4. **Cache results** - Tool results don't change often
5. **For AI agents** - Automate the entire workflow

## Complete Example Script

```bash
#!/bin/bash
export POSTIZ_API_KEY=your_key
INTEGRATION_ID="reddit-abc123"

# 1. Get settings
echo "📋 Getting settings..."
SETTINGS=$(postiz integrations:settings $INTEGRATION_ID)
echo $SETTINGS | jq '.output.tools'

# 2. Get flairs
echo ""
echo "🏷️  Getting flairs..."
FLAIRS=$(postiz integrations:trigger $INTEGRATION_ID getFlairs -d '{"subreddit":"programming"}')
FLAIR_ID=$(echo $FLAIRS | jq -r '.output[0].id')
FLAIR_NAME=$(echo $FLAIRS | jq -r '.output[0].name')

echo "Selected flair: $FLAIR_NAME ($FLAIR_ID)"

# 3. Create post
echo ""
echo "📝 Creating post..."
postiz posts:create \
  -c "My post content" \
  -p reddit \
  --settings "{
    \"subreddit\": [{
      \"value\": {
        \"subreddit\": \"programming\",
        \"title\": \"My Post Title\",
        \"type\": \"text\",
        \"url\": \"\",
        \"is_flair_required\": true,
        \"flair\": {
          \"id\": \"$FLAIR_ID\",
          \"name\": \"$FLAIR_NAME\"
        }
      }
    }]
  }" \
  -i "$INTEGRATION_ID"

echo "✅ Done!"
```

## Summary

✅ **Discover available tools** with `integrations:settings`
✅ **Call tools** to fetch required data with `integrations:trigger`
✅ **Use tool results** in post settings
✅ **Complete workflow** from discovery to posting
✅ **Perfect for AI agents** - fully automated
✅ **No guesswork** - know exactly what data you need

**The CLI now supports the complete integration tools workflow!** 🎉

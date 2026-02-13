# Postiz CLI - Project Structure

## Overview

The Postiz CLI is a complete command-line interface package for interacting with the Postiz social media scheduling API. It's designed for developers and AI agents to automate social media posting.

## Directory Structure

```
apps/cli/
├── src/                          # Source code
│   ├── index.ts                  # Main CLI entry point
│   ├── api.ts                    # API client for Postiz API
│   ├── config.ts                 # Configuration and environment handling
│   └── commands/                 # Command implementations
│       ├── posts.ts              # Posts management commands
│       ├── integrations.ts       # Integrations listing
│       └── upload.ts             # Media upload command
│
├── examples/                     # Usage examples
│   ├── basic-usage.sh            # Shell script example
│   └── ai-agent-example.js       # Node.js AI agent example
│
├── dist/                         # Build output (generated)
│   ├── index.js                  # Compiled CLI executable
│   └── index.js.map              # Source map
│
├── package.json                  # Package configuration
├── tsconfig.json                 # TypeScript configuration
├── tsup.config.ts                # Build configuration
│
├── README.md                     # Main documentation
├── SKILL.md                      # AI agent usage guide
├── QUICK_START.md                # Quick start guide
├── CHANGELOG.md                  # Version history
├── PROJECT_STRUCTURE.md          # This file
│
├── .gitignore                    # Git ignore rules
└── .npmignore                    # npm publish ignore rules
```

## File Descriptions

### Source Files

#### `src/index.ts`
- Main entry point for the CLI
- Uses `yargs` for command parsing
- Defines all available commands and their options
- Contains help text and usage examples

#### `src/api.ts`
- API client class `PostizAPI`
- Handles all HTTP requests to the Postiz API
- Methods for:
  - Creating posts
  - Listing posts
  - Deleting posts
  - Uploading files
  - Listing integrations
- Error handling and response parsing

#### `src/config.ts`
- Configuration management
- Environment variable handling
- Validates required settings (API key)
- Provides default values

#### `src/commands/posts.ts`
- Post management commands implementation
- `createPost()` - Create new social media posts
- `listPosts()` - List posts with filters
- `deletePost()` - Delete posts by ID

#### `src/commands/integrations.ts`
- Integration management
- `listIntegrations()` - Show connected accounts

#### `src/commands/upload.ts`
- Media upload functionality
- `uploadFile()` - Upload images to Postiz

### Configuration Files

#### `package.json`
- Package name: `postiz`
- Version: `1.0.0`
- Executable bin: `postiz` → `dist/index.js`
- Scripts: `dev`, `build`, `start`, `publish`
- Repository and metadata information

#### `tsconfig.json`
- Extends base config from monorepo
- Target: ES2017
- Module: CommonJS
- Enables decorators and source maps

#### `tsup.config.ts`
- Build tool configuration
- Entry point: `src/index.ts`
- Output format: CommonJS
- Adds shebang for Node.js execution
- Generates source maps

### Documentation Files

#### `README.md`
- Main package documentation
- Installation instructions
- Usage examples
- API reference
- Development guide

#### `SKILL.md`
- Comprehensive guide for AI agents
- Usage patterns and workflows
- Command examples
- Best practices
- Error handling

#### `QUICK_START.md`
- Fast onboarding guide
- Installation steps
- Basic commands
- Common workflows
- Troubleshooting

#### `CHANGELOG.md`
- Version history
- Release notes
- Feature additions
- Bug fixes

### Example Files

#### `examples/basic-usage.sh`
- Bash script example
- Demonstrates basic CLI workflow
- Shows integration listing, post creation, and deletion

#### `examples/ai-agent-example.js`
- Node.js script for AI agents
- Programmatic CLI usage
- Batch post creation
- JSON parsing examples

## Build Process

### Development Build

```bash
pnpm run dev
```

- Watches for file changes
- Rebuilds automatically
- Useful during development

### Production Build

```bash
pnpm run build
```

1. Cleans `dist/` directory
2. Compiles TypeScript → JavaScript
3. Bundles dependencies
4. Adds shebang for executable
5. Generates source maps
6. Makes output executable

### Output

- `dist/index.js` - Main executable (~490KB)
- `dist/index.js.map` - Source map (~920KB)

## Commands Architecture

### Command Flow

```
User Input
    ↓
index.ts (yargs parser)
    ↓
Command Handler (posts.ts, integrations.ts, upload.ts)
    ↓
config.ts (get API key)
    ↓
api.ts (make API request)
    ↓
Response / Error
    ↓
Output to console
```

### Available Commands

1. **posts:create**
   - Options: `--content`, `--integrations`, `--schedule`, `--image`
   - Handler: `commands/posts.ts::createPost()`

2. **posts:list**
   - Options: `--page`, `--limit`, `--search`
   - Handler: `commands/posts.ts::listPosts()`

3. **posts:delete**
   - Positional: `<id>`
   - Handler: `commands/posts.ts::deletePost()`

4. **integrations:list**
   - No options
   - Handler: `commands/integrations.ts::listIntegrations()`

5. **upload**
   - Positional: `<file>`
   - Handler: `commands/upload.ts::uploadFile()`

## Environment Variables

| Variable | Required | Default | Usage |
|----------|----------|---------|-------|
| `POSTIZ_API_KEY` | ✅ Yes | - | Authentication token |
| `POSTIZ_API_URL` | ❌ No | `https://api.postiz.com` | Custom API endpoint |

## Dependencies

### Runtime Dependencies (from root)
- `yargs` - CLI argument parsing
- `node-fetch` - HTTP requests
- Standard Node.js modules (`fs`, `path`)

### Dev Dependencies
- `tsup` - TypeScript bundler
- `typescript` - Type checking
- `@types/yargs` - TypeScript types

## Integration Points

### With Monorepo

1. **Build Scripts**
   - Added to root `package.json`
   - `pnpm run build:cli` - Build the CLI
   - `pnpm run publish-cli` - Publish to npm

2. **TypeScript Config**
   - Extends `tsconfig.base.json`
   - Shares common compiler options

3. **Dependencies**
   - Uses shared dependencies from root
   - No duplicate packages

### With Postiz API

1. **Endpoints Used**
   - `POST /public/v1/posts` - Create post
   - `GET /public/v1/posts` - List posts
   - `DELETE /public/v1/posts/:id` - Delete post
   - `GET /public/v1/integrations` - List integrations
   - `POST /public/v1/upload` - Upload media

2. **Authentication**
   - API key via `Authorization` header
   - Configured through environment variable

## Publishing

### To npm

```bash
pnpm run publish-cli
```

This will:
1. Build the package
2. Publish to npm with public access
3. Include only `dist/`, `README.md`, and `SKILL.md`

### Package Contents (via .npmignore)

**Included:**
- `dist/` - Compiled code
- `README.md` - Documentation

**Excluded:**
- `src/` - Source code
- `examples/` - Examples
- Config files
- Other markdown files

## Testing

### Manual Testing

```bash
# Test help
node dist/index.js --help

# Test without API key (should error)
node dist/index.js posts:list

# Test with API key (requires valid key)
POSTIZ_API_KEY=test node dist/index.js integrations:list
```

### Automated Testing (Future)

- Unit tests for API client
- Integration tests for commands
- E2E tests with mock API

## Future Enhancements

1. **More Commands**
   - Analytics retrieval
   - Team management
   - Settings configuration

2. **Features**
   - Interactive mode
   - Config file support (~/.postizrc)
   - Output formatting (JSON, table, CSV)
   - Verbose/debug mode
   - Batch operations from file

3. **Developer Experience**
   - TypeScript types export
   - Programmatic API
   - Plugin system
   - Custom integrations

## Support

- **Issues:** https://github.com/gitroomhq/postiz-app/issues
- **Docs:** See README.md, SKILL.md, QUICK_START.md
- **Website:** https://postiz.com

# Lime Manager NodeJS SDK

This is the NodeJS SDK for [Lime Manager](https://postiz.com).

You can start by installing the package:

```bash
npm install @postiz/node
```

## Usage
```typescript
import Lime Manager from '@postiz/node';
const postiz = new Lime Manager('your api key', 'your self-hosted instance (optional)');
```

The available methods are:
- `post(posts: CreatePostDto)` - Schedule a post to Lime Manager
- `postList(filters: GetPostsDto)` - Get a list of posts
- `upload(file: Buffer, extension: string)` - Upload a file to Lime Manager
- `integrations()` - Get a list of connected channels
- `deletePost(id: string)` - Delete a post by ID

Alternatively you can use the SDK with curl, check the [Lime Manager API documentation](https://docs.postiz.com/public-api) for more information.
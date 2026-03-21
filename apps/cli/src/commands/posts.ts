import { PostizAPI } from '../api';
import { getConfig } from '../config';
import { readFileSync, existsSync } from 'fs';

export async function createPost(args: any) {
  const config = getConfig();
  const api = new PostizAPI(config);

  // Support both simple and complex post creation
  let postData: any;

  if (args.json) {
    // Load from JSON file for complex posts with comments and media
    try {
      const jsonPath = args.json;
      if (!existsSync(jsonPath)) {
        console.error(`❌ JSON file not found: ${jsonPath}`);
        process.exit(1);
      }
      const jsonContent = readFileSync(jsonPath, 'utf-8');
      postData = JSON.parse(jsonContent);
    } catch (error: any) {
      console.error('❌ Failed to parse JSON file:', error.message);
      process.exit(1);
    }
  } else {
    const integrations = args.integrations
      ? args.integrations.split(',').map((id: string) => id.trim())
      : [];

    if (integrations.length === 0) {
      console.error('❌ At least one integration ID is required');
      console.error('Use -i or --integrations to specify integration IDs');
      console.error('Run "postiz integrations:list" to see available integrations');
      process.exit(1);
    }

    // Support multiple -c and -m flags
    // Normalize to arrays
    const contents = Array.isArray(args.content) ? args.content : [args.content];
    const medias = Array.isArray(args.media) ? args.media : (args.media ? [args.media] : []);

    if (!contents[0]) {
      console.error('❌ At least one -c/--content is required');
      process.exit(1);
    }

    // Build value array by pairing contents with their media
    const values = contents.map((content: string, index: number) => {
      const mediaForThisContent = medias[index];
      const images = mediaForThisContent
        ? mediaForThisContent.split(',').map((img: string) => ({
            id: Math.random().toString(36).substring(7),
            path: img.trim(),
          }))
        : [];

      return {
        content: content,
        image: images,
        // Add delay for all items except the first (main post)
        ...(index > 0 && { delay: args.delay || 5000 }),
      };
    });

    // Parse provider-specific settings if provided
    // Note: __type is automatically added by the backend based on integration ID
    let settings: any = undefined;

    if (args.settings) {
      try {
        settings = typeof args.settings === 'string'
          ? JSON.parse(args.settings)
          : args.settings;
      } catch (error: any) {
        console.error('❌ Failed to parse settings JSON:', error.message);
        process.exit(1);
      }
    }

    // Build the proper post structure
    postData = {
      type: args.type || 'schedule', // 'schedule' or 'draft'
      date: args.date, // Required date field
      shortLink: args.shortLink !== false,
      tags: [],
      posts: integrations.map((integrationId: string) => ({
        integration: { id: integrationId },
        value: values,
        settings: settings,
      })),
    };
  }

  try {
    const result = await api.createPost(postData);
    console.log('✅ Post created successfully!');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ Failed to create post:', error.message);
    process.exit(1);
  }
}

export async function listPosts(args: any) {
  const config = getConfig();
  const api = new PostizAPI(config);

  // Set default date range: last 30 days to 30 days in the future
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);

  const defaultEndDate = new Date();
  defaultEndDate.setDate(defaultEndDate.getDate() + 30);

  // Only send fields that are in GetPostsDto
  const filters: any = {
    startDate: args.startDate || defaultStartDate.toISOString(),
    endDate: args.endDate || defaultEndDate.toISOString(),
  };

  // customer is optional in the DTO
  if (args.customer) {
    filters.customer = args.customer;
  }

  try {
    const result = await api.listPosts(filters);
    console.log('📋 Posts:');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ Failed to list posts:', error.message);
    process.exit(1);
  }
}

export async function deletePost(args: any) {
  const config = getConfig();
  const api = new PostizAPI(config);

  if (!args.id) {
    console.error('❌ Post ID is required');
    process.exit(1);
  }

  try {
    await api.deletePost(args.id);
    console.log(`✅ Post ${args.id} deleted successfully!`);
  } catch (error: any) {
    console.error('❌ Failed to delete post:', error.message);
    process.exit(1);
  }
}

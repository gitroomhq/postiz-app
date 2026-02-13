import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createPost, listPosts, deletePost } from './commands/posts';
import { listIntegrations } from './commands/integrations';
import { uploadFile } from './commands/upload';
import type { Argv } from 'yargs';

yargs(hideBin(process.argv))
  .scriptName('postiz')
  .usage('$0 <command> [options]')
  .command(
    'posts:create',
    'Create a new post',
    (yargs: Argv) => {
      return yargs
        .option('content', {
          alias: 'c',
          describe: 'Post/comment content (can be used multiple times)',
          type: 'string',
        })
        .option('media', {
          alias: 'm',
          describe: 'Comma-separated media URLs for the corresponding -c (can be used multiple times)',
          type: 'string',
        })
        .option('integrations', {
          alias: 'i',
          describe: 'Comma-separated list of integration IDs',
          type: 'string',
        })
        .option('schedule', {
          alias: 's',
          describe: 'Schedule date (ISO 8601 format)',
          type: 'string',
        })
        .option('delay', {
          alias: 'd',
          describe: 'Delay in milliseconds between comments (default: 5000)',
          type: 'number',
          default: 5000,
        })
        .option('json', {
          alias: 'j',
          describe: 'Path to JSON file with full post structure',
          type: 'string',
        })
        .option('shortLink', {
          describe: 'Use short links',
          type: 'boolean',
          default: true,
        })
        .option('provider-type', {
          alias: 'p',
          describe: 'Provider type for settings (e.g., reddit, youtube, tiktok, x, linkedin, instagram)',
          type: 'string',
        })
        .option('settings', {
          describe: 'Provider-specific settings as JSON string',
          type: 'string',
        })
        .check((argv) => {
          if (!argv.json && !argv.content) {
            throw new Error('Either --content or --json is required');
          }
          if (!argv.json && !argv.integrations) {
            throw new Error('--integrations is required when not using --json');
          }
          return true;
        })
        .example(
          '$0 posts:create -c "Hello World!" -i "twitter-123"',
          'Simple post'
        )
        .example(
          '$0 posts:create -c "Main post" -m "img1.jpg,img2.jpg" -i "twitter-123"',
          'Post with multiple images'
        )
        .example(
          '$0 posts:create -c "Main post" -m "img1.jpg" -c "First comment" -m "img2.jpg" -c "Second comment" -m "img3.jpg,img4.jpg" -i "twitter-123"',
          'Post with comments, each having their own media'
        )
        .example(
          '$0 posts:create -c "Main" -c "Comment with semicolon; see?" -c "Another!" -i "twitter-123"',
          'Comments can contain semicolons'
        )
        .example(
          '$0 posts:create -c "Thread 1/3" -c "Thread 2/3" -c "Thread 3/3" -d 2000 -i "twitter-123"',
          'Twitter thread with 2s delay'
        )
        .example(
          '$0 posts:create --json ./post.json',
          'Complex post from JSON file'
        )
        .example(
          '$0 posts:create -c "Post to subreddit" -p reddit --settings \'{"subreddit":[{"value":{"subreddit":"programming","title":"My Title","type":"text","url":"","is_flair_required":false}}]}\' -i "reddit-123"',
          'Reddit post with specific subreddit settings'
        )
        .example(
          '$0 posts:create -c "Video description" -p youtube --settings \'{"title":"My Video","type":"public","tags":[{"value":"tech","label":"Tech"}]}\' -i "youtube-123"',
          'YouTube post with title and tags'
        )
        .example(
          '$0 posts:create -c "Tweet content" -p x --settings \'{"who_can_reply_post":"everyone"}\' -i "twitter-123"',
          'X (Twitter) post with reply settings'
        );
    },
    createPost as any
  )
  .command(
    'posts:list',
    'List all posts',
    (yargs: Argv) => {
      return yargs
        .option('page', {
          alias: 'p',
          describe: 'Page number',
          type: 'number',
          default: 1,
        })
        .option('limit', {
          alias: 'l',
          describe: 'Number of posts per page',
          type: 'number',
          default: 10,
        })
        .option('search', {
          alias: 's',
          describe: 'Search query',
          type: 'string',
        })
        .example('$0 posts:list', 'List all posts')
        .example('$0 posts:list -p 2 -l 20', 'List posts with pagination')
        .example('$0 posts:list -s "hello"', 'Search posts');
    },
    listPosts as any
  )
  .command(
    'posts:delete <id>',
    'Delete a post',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Post ID to delete',
          type: 'string',
        })
        .example('$0 posts:delete abc123', 'Delete post with ID abc123');
    },
    deletePost as any
  )
  .command(
    'integrations:list',
    'List all connected integrations',
    {},
    listIntegrations as any
  )
  .command(
    'upload <file>',
    'Upload a file',
    (yargs: Argv) => {
      return yargs
        .positional('file', {
          describe: 'File path to upload',
          type: 'string',
        })
        .example('$0 upload ./image.png', 'Upload an image');
    },
    uploadFile as any
  )
  .demandCommand(1, 'You need at least one command')
  .help()
  .alias('h', 'help')
  .version()
  .alias('v', 'version')
  .epilogue(
    'For more information, visit: https://postiz.com\n\nSet your API key: export POSTIZ_API_KEY=your_api_key'
  )
  .parse();

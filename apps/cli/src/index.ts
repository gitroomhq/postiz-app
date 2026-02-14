import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createPost, listPosts, deletePost } from './commands/posts';
import { listIntegrations, getIntegrationSettings, triggerIntegrationTool } from './commands/integrations';
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
        .option('date', {
          alias: 's',
          describe: 'Schedule date (ISO 8601 format) - REQUIRED',
          type: 'string',
        })
        .option('type', {
          alias: 't',
          describe: 'Post type: "schedule" or "draft"',
          type: 'string',
          choices: ['schedule', 'draft'],
          default: 'schedule',
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
        .option('settings', {
          describe: 'Platform-specific settings as JSON string',
          type: 'string',
        })
        .check((argv) => {
          if (!argv.json && !argv.content) {
            throw new Error('Either --content or --json is required');
          }
          if (!argv.json && !argv.integrations) {
            throw new Error('--integrations is required when not using --json');
          }
          if (!argv.json && !argv.date) {
            throw new Error('--date is required when not using --json');
          }
          return true;
        })
        .example(
          '$0 posts:create -c "Hello World!" -s "2024-12-31T12:00:00Z" -i "twitter-123"',
          'Simple scheduled post'
        )
        .example(
          '$0 posts:create -c "Draft post" -s "2024-12-31T12:00:00Z" -t draft -i "twitter-123"',
          'Create draft post'
        )
        .example(
          '$0 posts:create -c "Main post" -m "img1.jpg,img2.jpg" -s "2024-12-31T12:00:00Z" -i "twitter-123"',
          'Post with multiple images'
        )
        .example(
          '$0 posts:create -c "Main post" -m "img1.jpg" -c "First comment" -m "img2.jpg" -c "Second comment" -m "img3.jpg,img4.jpg" -s "2024-12-31T12:00:00Z" -i "twitter-123"',
          'Post with comments, each having their own media'
        )
        .example(
          '$0 posts:create -c "Main" -c "Comment with semicolon; see?" -c "Another!" -s "2024-12-31T12:00:00Z" -i "twitter-123"',
          'Comments can contain semicolons'
        )
        .example(
          '$0 posts:create -c "Thread 1/3" -c "Thread 2/3" -c "Thread 3/3" -d 2000 -s "2024-12-31T12:00:00Z" -i "twitter-123"',
          'Twitter thread with 2s delay'
        )
        .example(
          '$0 posts:create --json ./post.json',
          'Complex post from JSON file'
        )
        .example(
          '$0 posts:create -c "Post to subreddit" -s "2024-12-31T12:00:00Z" --settings \'{"subreddit":[{"value":{"subreddit":"programming","title":"My Title","type":"text","url":"","is_flair_required":false}}]}\' -i "reddit-123"',
          'Reddit post with specific subreddit settings'
        )
        .example(
          '$0 posts:create -c "Video description" -s "2024-12-31T12:00:00Z" --settings \'{"title":"My Video","type":"public","tags":[{"value":"tech","label":"Tech"}]}\' -i "youtube-123"',
          'YouTube post with title and tags'
        )
        .example(
          '$0 posts:create -c "Tweet content" -s "2024-12-31T12:00:00Z" --settings \'{"who_can_reply_post":"everyone"}\' -i "twitter-123"',
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
        .option('startDate', {
          describe: 'Start date (ISO 8601 format). Default: 30 days ago',
          type: 'string',
        })
        .option('endDate', {
          describe: 'End date (ISO 8601 format). Default: 30 days from now',
          type: 'string',
        })
        .option('customer', {
          describe: 'Customer ID (optional)',
          type: 'string',
        })
        .example('$0 posts:list', 'List all posts (last 30 days to next 30 days)')
        .example(
          '$0 posts:list --startDate "2024-01-01T00:00:00Z" --endDate "2024-12-31T23:59:59Z"',
          'List posts for a specific date range'
        )
        .example(
          '$0 posts:list --customer "customer-id"',
          'List posts for a specific customer'
        );
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
    'integrations:settings <id>',
    'Get settings schema for a specific integration',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Integration ID',
          type: 'string',
        })
        .example(
          '$0 integrations:settings reddit-123',
          'Get settings schema for Reddit integration'
        )
        .example(
          '$0 integrations:settings youtube-456',
          'Get settings schema for YouTube integration'
        );
    },
    getIntegrationSettings as any
  )
  .command(
    'integrations:trigger <id> <method>',
    'Trigger an integration tool to fetch additional data',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Integration ID',
          type: 'string',
        })
        .positional('method', {
          describe: 'Method name from the integration tools',
          type: 'string',
        })
        .option('data', {
          alias: 'd',
          describe: 'Data to pass to the tool as JSON string',
          type: 'string',
        })
        .example(
          '$0 integrations:trigger reddit-123 getSubreddits',
          'Get list of subreddits'
        )
        .example(
          '$0 integrations:trigger reddit-123 searchSubreddits -d \'{"query":"programming"}\'',
          'Search for subreddits'
        )
        .example(
          '$0 integrations:trigger youtube-123 getPlaylists',
          'Get YouTube playlists'
        );
    },
    triggerIntegrationTool as any
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

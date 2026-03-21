import { PostizConfig } from './api';

export function getConfig(): PostizConfig {
  const apiKey = process.env.POSTIZ_API_KEY;
  const apiUrl = process.env.POSTIZ_API_URL;

  if (!apiKey) {
    console.error('❌ Error: POSTIZ_API_KEY environment variable is required');
    console.error('Please set it using: export POSTIZ_API_KEY=your_api_key');
    process.exit(1);
  }

  return {
    apiKey,
    apiUrl,
  };
}

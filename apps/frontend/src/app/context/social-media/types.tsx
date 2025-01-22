// Define the structure for the configuration
export interface SocialMediaConfig {
  customerId: string;
  platform: string;
  platformKey: string;
  config: {
    key: string;
    value: string;
  }[]; // The config array now contains key-value pairs for each platform
}

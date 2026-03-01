import { PostizAPI } from '../api';
import { getConfig } from '../config';

export async function listIntegrations() {
  const config = getConfig();
  const api = new PostizAPI(config);

  try {
    const result = await api.listIntegrations();
    console.log('🔌 Connected Integrations:');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ Failed to list integrations:', error.message);
    process.exit(1);
  }
}

export async function getIntegrationSettings(args: any) {
  const config = getConfig();
  const api = new PostizAPI(config);

  if (!args.id) {
    console.error('❌ Integration ID is required');
    process.exit(1);
  }

  try {
    const result = await api.getIntegrationSettings(args.id);
    console.log(`⚙️  Settings for integration: ${args.id}`);
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ Failed to get integration settings:', error.message);
    process.exit(1);
  }
}

export async function triggerIntegrationTool(args: any) {
  const config = getConfig();
  const api = new PostizAPI(config);

  if (!args.id) {
    console.error('❌ Integration ID is required');
    process.exit(1);
  }

  if (!args.method) {
    console.error('❌ Method name is required');
    process.exit(1);
  }

  // Parse data from JSON string or use empty object
  let data: Record<string, string> = {};
  if (args.data) {
    try {
      data = JSON.parse(args.data);
    } catch (error: any) {
      console.error('❌ Failed to parse data JSON:', error.message);
      process.exit(1);
    }
  }

  try {
    const result = await api.triggerIntegrationTool(args.id, args.method, data);
    console.log(`🔧 Tool result for ${args.method}:`);
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ Failed to trigger tool:', error.message);
    process.exit(1);
  }
}

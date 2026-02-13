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

import { FC, useCallback } from 'react';
import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';

const GitHubPreview: FC = () => {
  const { value } = useIntegration();
  const settings = useSettings();

  return (
    <div>
      <h2>GitHub Integration Preview</h2>
      {/* <p>Connected Repository: {value?.content || 'No repository connected'}</p>
      <p>Scopes: {settings?.scopes?.join(', ') || 'Default Scopes'}</p> */}
    </div>
  );
};

const GitHubSettings: FC = () => {
  const form = useSettings();
  const { date } = useIntegration();
  const customFunc = useCustomProviderFunction();

  const getRepos = useCallback(async () => {
    try {
      const repos = await customFunc.get('repositories', {});
      console.log('Fetched Repositories:', repos);
    } catch (error) {
      console.error('Error fetching repositories:', error);
    }
  }, [customFunc]);

  return (
    <div>
      <h2>GitHub Integration Settings</h2>
      <button onClick={getRepos}>Fetch Repositories</button>
      {/* <p>Last Synced: {date || 'Not Synced'}</p> */}
    </div>
  );
};

export default withProvider(GitHubSettings, GitHubPreview, 'GitHubDTO');

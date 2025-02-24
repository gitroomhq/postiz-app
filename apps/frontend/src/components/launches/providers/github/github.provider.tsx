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
      {/* <p>Connected Repository: {value?.repo || 'No repository connected'}</p>
      <p>Scopes: {settings?.scopes?.join(', ') || 'Default Scopes'}</p> */}
    </div>
  );
};

const GitHubSettings: FC = () => {
  const form = useSettings();
  const { date } = useIntegration();
  const customFunc = useCustomProviderFunction();

  const getOrgs = useCallback(() => {
    customFunc.get('organizations', {
      anyKey: 'anyValue',
    });
  }, [customFunc]);

  return (
    <div>
      <h2>GitHub Integration Settings</h2>
      <button onClick={getOrgs}>Fetch Organizations</button>
      {/* <p>Last Synced: {date || 'Not Synced'}</p> */}
    </div>
  );
};

export default withProvider(GitHubSettings, GitHubPreview, 'GitHubDTO');

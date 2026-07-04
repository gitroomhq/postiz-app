import {
  ProviderToolMetadata,
  SocialEditor,
  SocialProviderCapabilities,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';

type ProviderCapabilitySource = {
  post?: (...args: any[]) => any;
  comment?: (...args: any[]) => any;
  mention?: (...args: any[]) => any;
  analytics?: (...args: any[]) => any;
  postAnalytics?: (...args: any[]) => any;
  missing?: (...args: any[]) => any;
  changeProfilePicture?: (...args: any[]) => any;
  changeNickname?: (...args: any[]) => any;
  customFields?: (...args: any[]) => any;
  externalUrl?: (...args: any[]) => any;
  stripLinks?: () => boolean;
  isWeb3?: boolean;
  isChromeExtension?: boolean;
  oneTimeToken?: boolean;
  refreshCron?: boolean;
  refreshWait?: boolean;
  convertToJPEG?: boolean;
  editor: SocialEditor;
  maxConcurrentJob: number;
};

export function buildProviderCapabilities(
  provider: ProviderCapabilitySource,
  tools: ProviderToolMetadata[] = []
): SocialProviderCapabilities {
  return {
    scheduling: typeof provider.post === 'function',
    comments: typeof provider.comment === 'function',
    mentions: typeof provider.mention === 'function',
    accountAnalytics: typeof provider.analytics === 'function',
    postAnalytics: typeof provider.postAnalytics === 'function',
    missingContent: typeof provider.missing === 'function',
    profilePicture: typeof provider.changeProfilePicture === 'function',
    nickname: typeof provider.changeNickname === 'function',
    customFields: typeof provider.customFields === 'function',
    externalUrl: typeof provider.externalUrl === 'function',
    web3: !!provider.isWeb3,
    chromeExtension: !!provider.isChromeExtension,
    oneTimeToken: !!provider.oneTimeToken,
    refreshCron: !!provider.refreshCron,
    refreshWait: !!provider.refreshWait,
    stripLinks: !!provider.stripLinks?.(),
    convertToJPEG: !!provider.convertToJPEG,
    editor: provider.editor,
    maxConcurrentJob: provider.maxConcurrentJob,
    tools: tools.map((tool) => tool.methodName),
  };
}

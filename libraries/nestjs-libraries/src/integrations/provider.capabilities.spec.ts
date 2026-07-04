import { buildProviderCapabilities } from './provider.capabilities';

describe('buildProviderCapabilities', () => {
  it('derives capabilities from provider methods, flags, and tools', () => {
    const capabilities = buildProviderCapabilities(
      {
        post: jest.fn(),
        comment: jest.fn(),
        mention: jest.fn(),
        postAnalytics: jest.fn(),
        customFields: jest.fn(),
        stripLinks: () => true,
        refreshWait: true,
        convertToJPEG: true,
        editor: 'markdown',
        maxConcurrentJob: 3,
      },
      [
        {
          description: 'Find channels',
          dataSchema: [],
          methodName: 'channels',
        },
      ]
    );

    expect(capabilities).toMatchObject({
      scheduling: true,
      comments: true,
      mentions: true,
      postAnalytics: true,
      customFields: true,
      stripLinks: true,
      refreshWait: true,
      convertToJPEG: true,
      editor: 'markdown',
      maxConcurrentJob: 3,
      tools: ['channels'],
    });
    expect(capabilities.accountAnalytics).toBe(false);
    expect(capabilities.missingContent).toBe(false);
  });
});

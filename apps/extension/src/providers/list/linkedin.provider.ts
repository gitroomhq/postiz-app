import { ProviderInterface } from '@gitroom/extension/providers/provider.interface';

export class LinkedinProvider implements ProviderInterface {
  identifier = 'linkedin';
  baseUrl = 'https://www.linkedin.com';
  element = `.share-box-feed-entry__closed-share-box`;
  attachTo = `[role="main"]`;
  style = 'light' as 'light';
  findIdentifier = (element: HTMLElement) => {
    return element.closest('[data-urn]').getAttribute('data-urn');
  };
}

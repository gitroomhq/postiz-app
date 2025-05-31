import { ProviderInterface } from '@gitroom/extension/providers/provider.interface';

export class XProvider implements ProviderInterface {
  identifier = 'x';
  baseUrl = 'https://x.com';
  element = `[data-testid="primaryColumn"]:has([data-testid="toolBar"]) [data-testid="tweetTextarea_0_label"], [data-testid="SideNav_NewTweet_Button"]`;
  attachTo = `#react-root`;
  style = 'dark' as 'dark';
  findIdentifier = (element: HTMLElement) => {
    return (
      Array.from(
        (
          element?.closest('article') ||
          element?.closest(`[aria-labelledby="modal-header"]`)
        )?.querySelectorAll('a') || []
      )
        ?.find((p) => {
          return p?.getAttribute('href')?.includes('/status/');
        })
        ?.getAttribute('href')
        ?.split('/status/')?.[1] || window.location.href.split('/status/')?.[1]
    );
  };
}

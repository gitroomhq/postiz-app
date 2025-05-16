import { ProviderInterface } from "@gitroom/extension/providers/provider.interface";

export class YoutubeProvider implements ProviderInterface {
  identifier = "youtube";
  baseUrl = "https://www.youtube.com";
  element = `ytd-topbar-menu-button-renderer button[aria-label^="Create"]`;
  attachTo = `#end`;
  style = "dark" as "dark";

  findIdentifier = (element: HTMLElement) => {
    const match = window.location.href.match(/v=([\w-]{11})/);
    return match ? match[1] : window.location.href;
  };
}

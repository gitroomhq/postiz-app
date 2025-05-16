import { ProviderInterface } from "@gitroom/extension/providers/provider.interface";

export class YoutubeProvider implements ProviderInterface {
  identifier = "youtube";
  baseUrl = "https://youtube.com";
  element = `tp-yt-paper-item[test-id="upload-beta"]`;
  attachTo = `#container.ytd-masthead`;
  style = "dark" as "dark";

  findIdentifier = (element: HTMLElement) => {
    // Extracts video ID from URL if available, else fallback to the full URL
    const match = window.location.href.match(/v=([\w-]{11})/);
    return match ? match[1] : window.location.href;
  };
}

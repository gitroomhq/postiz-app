import { ProviderInterface } from "@gitroom/extension/providers/provider.interface";

export class YoutubeProvider implements ProviderInterface {
  identifier = "youtube";
  baseUrl = "https://www.youtube.com";
  element = `#postiz-button`;
  attachTo = `#end`;
  style = "dark" as "dark";

  findIdentifier = (element: HTMLElement) => {
    const match = window.location.href.match(/v=([\w-]{11})/);
    return match ? match[1] : window.location.href;
  };

  onLoad = () => {
    const container = document.querySelector(this.attachTo);
    if (!container || document.querySelector("#postiz-button")) return;

    const button = document.createElement("button");
    button.id = "postiz-button";
    button.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      margin-left: 8px;
      display: flex;
      align-items: center;
    `;

    const img = document.createElement("img");
    img.src = "https://raw.githubusercontent.com/gitroomhq/postiz-app/main/assets/logo.svg";
    img.alt = "Postiz";
    img.style.cssText = "height: 24px; width: 24px;";

    button.appendChild(img);
    container.appendChild(button);

    button.addEventListener("click", () => {
      // Trigger Postiz UI
      // This should call the method that opens the Postiz interface
    });
  };
}

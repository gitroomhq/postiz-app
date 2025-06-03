import { useEffect } from 'react';
export const useClickOutside = (callback: () => Promise<void>) => {
  const handleClick = (event: MouseEvent) => {
    const selector = document.querySelector('#add-edit-modal');
    const copilotkit = document.querySelector('.copilotKitPopup');
    const emoji = document.querySelector('.EmojiPickerReact');
    if (
      !selector?.contains(event.target as HTMLElement) &&
      !copilotkit?.contains(event.target as HTMLElement) &&
      !emoji
    ) {
      callback();
    }
  };
  useEffect(() => {
    document
      .querySelector('.mantine-Modal-root')
      // @ts-ignore
      ?.addEventListener('click', handleClick);
    return () => {
      document
        .querySelector('.mantine-Modal-root')
        // @ts-ignore
        ?.removeEventListener('click', handleClick);
    };
  });
};

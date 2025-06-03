export const saveStorage = (key: string, value: any) => {
  return chrome.runtime.sendMessage({
    action: 'saveStorage',
    key,
    value,
  });
};

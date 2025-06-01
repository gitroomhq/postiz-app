export const fetchStorage = (key: string) => {
  return chrome.runtime.sendMessage({
    action: 'loadStorage',
    key,
  });
};

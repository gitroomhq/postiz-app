export const fetchCookie = (cookieName: string) => {
  return chrome.runtime.sendMessage({
    action: 'loadCookie',
    cookieName,
  });
};

export const getCookie = async (
  cookies: chrome.cookies.Cookie[],
  cookie: string
) => {
  // return cookies.find((c) => c.name === cookie).value;
};

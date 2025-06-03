const isDev = process.env.NODE_ENV === 'development';
export const sendRequest = (
  auth: string,
  url: string,
  method: 'GET' | 'POST',
  body?: string
) => {
  return chrome.runtime.sendMessage({
    action: 'makeHttpRequest',
    url,
    method,
    body,
    auth,
  });
};

export const fetchRequestUtil = async (request: any) => {
  return (
    await fetch(
      (import.meta.env?.FRONTEND_URL || process?.env?.FRONTEND_URL) +
        request.url,
      {
        method: request.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: request.auth,
          // Add any auth headers here if needed
        },
        ...(request.body ? { body: request.body } : {}),
      }
    )
  ).json();
};

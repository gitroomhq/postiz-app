export interface Params {
  baseUrl: string;
  beforeRequest?: (url: string, options: RequestInit) => Promise<RequestInit>;
  afterRequest?: (
    url: string,
    options: RequestInit,
    response: Response
  ) => Promise<void>;
}
export const customFetch = (params: Params, auth?: string) => {
  return async function newFetch(url: string, options: RequestInit = {}) {
    const newRequestObject = await params?.beforeRequest?.(url, options);
    const fetchRequest = await fetch(params.baseUrl + url, {
      credentials: 'include',
      ...(newRequestObject || options),
      headers: {
        ...(auth ? { auth } : {}),
        ...(options.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        Accept: 'application/json',
        ...options?.headers,
      },
    });
    await params?.afterRequest?.(url, options, fetchRequest);
    return fetchRequest;
  };
};

export const fetchBackend = customFetch({
  baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL!,
});

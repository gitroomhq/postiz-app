
export interface Params {
  baseUrl: string;
  beforeRequest?: (url: string, options: RequestInit) => Promise<RequestInit>;
  afterRequest?: (
    url: string,
    options: RequestInit,
    response: Response
  ) => Promise<boolean>;
}
export const customFetch = (
  params: Params,
  auth?: string,
  showorg?: string
) => {
  return async function newFetch(url: string, options: RequestInit = {}) {
    try {
      const newRequestObject = await params?.beforeRequest?.(url, options);

      const fetchRequest = await fetch(params.baseUrl + url, {
        credentials: 'include',
        ...(newRequestObject || options),
        headers: {
          ...(auth ? { auth } : {}),
          ...(showorg ? { showorg } : {}),
          ...(options.body instanceof FormData
            ? {}
            : { 'Content-Type': 'application/json' }),
          Accept: 'application/json',
          ...options?.headers,
        },
        // @ts-ignore
        ...(!options.next && options.cache !== 'force-cache'
          ? { cache: options.cache || 'no-store' }
          : {}),
      });

      if (
        !params?.afterRequest ||
        (await params?.afterRequest?.(url, options, fetchRequest))
      ) {
        return fetchRequest;
      }

      // @ts-ignore
      return new Promise((res) => {}) as Response;
    } catch (error) {
      console.error('Error occurred during fetch:', error);

      // Optionally, you can return a custom response or re-throw the error
      // throw error; // Uncomment this if you want the error to propagate
      return new Response(JSON.stringify({ error: 'Fetch failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }) as unknown as Response;
    }
  };
};


export const fetchBackend = customFetch({
  get baseUrl() {
    return process.env.BACKEND_URL!;
  },
});

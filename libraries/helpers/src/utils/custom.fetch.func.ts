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
  showorg?: string,
  secured: boolean = true
) => {
  return async function newFetch(url: string, options: RequestInit = {}) {
    const loggedAuth =
      typeof window === 'undefined'
        ? undefined
        : new URL(window.location.href).searchParams.get('loggedAuth');
    const newRequestObject = await params?.beforeRequest?.(url, options);
    const authNonSecuredCookie =
      typeof document === 'undefined'
        ? null
        : document.cookie
            .split(';')
            .find((p) => p.includes('auth='))
            ?.split('=')[1];

    const authNonSecuredOrg =
      typeof document === 'undefined'
        ? null
        : document.cookie
            .split(';')
            .find((p) => p.includes('showorg='))
            ?.split('=')[1];

    const authNonSecuredImpersonate =
      typeof document === 'undefined'
        ? null
        : document.cookie
            .split(';')
            .find((p) => p.includes('impersonate='))
            ?.split('=')[1];

    const fetchRequest = await fetch(params.baseUrl + url, {
      ...(secured ? { credentials: 'include' } : {}),
      ...(newRequestObject || options),
      headers: {
        ...(showorg
          ? { showorg }
          : authNonSecuredOrg
          ? { showorg: authNonSecuredOrg }
          : {}),
        ...(options.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        Accept: 'application/json',
        ...(loggedAuth ? { auth: loggedAuth } : {}),
        ...options?.headers,
        ...(auth
          ? { auth }
          : authNonSecuredCookie
          ? { auth: authNonSecuredCookie }
          : {}),
        ...(authNonSecuredImpersonate
          ? { impersonate: authNonSecuredImpersonate }
          : {}),
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

    // afterRequest returned false (e.g. user dismissed the 402/406 dialog).
    // Returning an unresolved Promise left every `await fetch(…)` hung forever
    // — Invite by link stayed on "Loading…" with no URL. Hand back a synthetic
    // error body so callers can clear loading and show a real failure state.
    return new Response(JSON.stringify({ err: true, cancelled: true }), {
      status: 499,
      headers: { 'Content-Type': 'application/json' },
    });
  };
};

export const fetchBackend = customFetch({
  get baseUrl() {
    return process.env.BACKEND_URL!;
  },
});

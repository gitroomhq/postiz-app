import { cookies } from 'next/headers';
import { customFetch } from '@gitroom/helpers/utils/custom.fetch.func';

export const internalFetch = async (url: string, options: RequestInit = {}) => {
  const cookieStore = await cookies();
  return customFetch(
    { baseUrl: process.env.BACKEND_INTERNAL_URL! },
    cookieStore?.get('auth')?.value!,
    cookieStore?.get('showorg')?.value!
  )(url, options);
};

import { axiosInstance } from '@clickvote/frontend/helper/axios';
import { IncomingMessage } from 'http';
import { NextApiRequestCookies } from 'next/dist/server/api-utils';
import { UserFromRequest } from '@clickvote/interfaces';
import axios, { AxiosInstance } from 'axios';

export const loadUser = async (
  req: IncomingMessage & {
    cookies: NextApiRequestCookies;
  },
  func: (axios: AxiosInstance, user: UserFromRequest) => Promise<any>
) => {
  const { data: user } = await axiosInstance.get('/users/self', {
    get headers() {
      return {
        ...req.headers,
      };
    },
  });

  const newInstance = axios.create({
    baseURL: axiosInstance.defaults.baseURL,
    headers: {
      ...req.headers
    }
  });

  const data = await func(newInstance, user);
  const props = data?.props || {};
  const other = data || {};
  return {
    ...other,
    props: {
      user,
      ...props,
    },
  };
};

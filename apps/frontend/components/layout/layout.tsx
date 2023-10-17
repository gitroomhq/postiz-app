import { FC, ReactNode } from 'react';
import LeftMenu from '@clickvote/frontend/components/layout/left.menu';
import { UserFromRequest } from '@clickvote/interfaces';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserContextProvider } from '@clickvote/frontend/helper/user.context';
import { Env } from '@clickvote/frontend/components/layout/env';
import Logo from '../common/Logo';

const queryClient = new QueryClient();

const Layout: FC<{ children: ReactNode; user: UserFromRequest }> = (props) => {
  const { children, user } = props;
  return (
    <UserContextProvider value={user}>
      <QueryClientProvider client={queryClient}>
        <div className="bg-[#05050B] flex min-h-[100vh] flex-col max-w-[1920px] w-full mx-auto">
          <div className="flex py-4 text-2xl p-4">
            <div className="flex-1 ml-3">
              <Logo responsive={false} />
            </div>
            <div className="text-sm flex items-center">
              <div className="flex items-center">
                <Env />
              </div>
              <div className="flex items-center">Welcome, {user.email}</div>
            </div>
          </div>
          <div className="flex-1 flex">
            <LeftMenu />
            <div className="p-4 bg-[#05050B] flex-1 border-r border-[#ffffff]/20 border-y">
              {children}
            </div>
          </div>
        </div>
      </QueryClientProvider>
    </UserContextProvider>
  );
};

export default Layout;

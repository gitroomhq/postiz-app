'use client';

import { useState, useCallback } from 'react';
import { useUser } from '../layout/user.context';
import { Button } from '@gitroom/react/form/button';
import copy from 'copy-to-clipboard';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useVariables } from '@gitroom/react/helpers/variable.context';

export const PublicComponent = () => {
  const user = useUser();
  const { backendUrl } = useVariables();
  const toaster = useToaster();
  const [reveal, setReveal] = useState(false);
  const [reveal2, setReveal2] = useState(false);

  const copyToClipboard = useCallback(() => {
    toaster.show('API Key copied to clipboard', 'success');
    copy(user?.publicApi!);
  }, [user]);

  const copyToClipboard2 = useCallback(() => {
    toaster.show('MCP copied to clipboard', 'success');
    copy(`${backendUrl}/mcp/` + user?.publicApi + '/sse');
  }, [user]);

  if (!user || !user.publicApi) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <h3 className="text-[20px]">Public API</h3>
      <div className="text-customColor18 mt-[4px]">
        Use Publica API to integrate with your tools.
        <br />
        <a
          className="underline hover:text-white"
          href="https://docs.publica.do/public-api"
          target="_blank"
        >
          Read how to use it over the documentation.
        </a>
      </div>
      <div className="my-[16px] mt-[16px] bg-sixth border-fifth items-center border rounded-[4px] p-[24px] flex gap-[24px]">
        <div className="flex items-center">
          {reveal ? (
            user.publicApi
          ) : (
            <>
              <div className="blur-sm">{user.publicApi.slice(0, -5)}</div>
              <div>{user.publicApi.slice(-5)}</div>
            </>
          )}
        </div>
        <div>
          {!reveal ? (
            <Button onClick={() => setReveal(true)}>Reveal</Button>
          ) : (
            <Button onClick={copyToClipboard}>Copy Key</Button>
          )}
        </div>
      </div>

      <h3 className="text-[20px]">MCP</h3>
      <div className="text-customColor18 mt-[4px]">
        Connect your MCP client to Postiz to schedule your posts faster!
      </div>
      <div className="my-[16px] mt-[16px] bg-sixth border-fifth items-center border rounded-[4px] p-[24px] flex gap-[24px]">
        <div className="flex items-center">
          {reveal2 ? (
            `${backendUrl}/mcp/` + user.publicApi + '/sse'
          ) : (
            <>
              <div className="blur-sm">
                {(`${backendUrl}/mcp/` + user.publicApi + '/sse').slice(0, -5)}
              </div>
              <div>
                {(`${backendUrl}/mcp/` + user.publicApi + '/sse').slice(-5)}
              </div>
            </>
          )}
        </div>
        <div>
          {!reveal2 ? (
            <Button onClick={() => setReveal2(true)}>Reveal</Button>
          ) : (
            <Button onClick={copyToClipboard2}>Copy Key</Button>
          )}
        </div>
      </div>
    </div>
  );
};

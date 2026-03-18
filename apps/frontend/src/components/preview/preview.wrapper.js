'use client';
import { __awaiter } from "tslib";
import useSWR from 'swr';
import { ContextWrapper } from "../layout/user.context";
import { useCallback } from 'react';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import { Toaster } from "../../../../../libraries/react-shared-libraries/src/toaster/toaster";
import { MantineWrapper } from "../../../../../libraries/react-shared-libraries/src/helpers/mantine.wrapper";
import { useVariables } from "../../../../../libraries/react-shared-libraries/src/helpers/variable.context";
import { CopilotKit } from '@copilotkit/react-core';
export const PreviewWrapper = ({ children }) => {
    const fetch = useFetch();
    const { backendUrl } = useVariables();
    const load = useCallback((path) => __awaiter(void 0, void 0, void 0, function* () {
        return yield (yield fetch(path)).json();
    }), []);
    const { data: user } = useSWR('/user/self', load, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        refreshWhenOffline: false,
        refreshWhenHidden: false,
    });
    return (<ContextWrapper user={user}>
      <CopilotKit credentials="include" runtimeUrl={backendUrl + '/copilot/chat'} showDevConsole={false}>
        <MantineWrapper>
          <Toaster />
          {children}
        </MantineWrapper>
      </CopilotKit>
    </ContextWrapper>);
};
//# sourceMappingURL=preview.wrapper.js.map
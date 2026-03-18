'use client';
import { Button } from "../../../../../libraries/react-shared-libraries/src/form/button";
import copy from 'copy-to-clipboard';
import { useCallback } from 'react';
import { useToaster } from "../../../../../libraries/react-shared-libraries/src/toaster/toaster";
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export const CopyClient = () => {
    const toast = useToaster();
    const t = useT();
    const copyToClipboard = useCallback(() => {
        var _a, _b, _c;
        toast.show(t('link_copied_to_clipboard', 'Link copied to clipboard'), 'success');
        copy((_c = (_b = (_a = window.location.href).split) === null || _b === void 0 ? void 0 : _b.call(_a, '?')) === null || _c === void 0 ? void 0 : _c.shift());
    }, []);
    return (<Button onClick={copyToClipboard}>
      {t('share_with_a_client', 'Share with a client')}
    </Button>);
};
//# sourceMappingURL=copy.client.js.map
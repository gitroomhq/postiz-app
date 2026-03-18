'use client';
import { __awaiter } from "tslib";
import { useCallback } from 'react';
import Image from 'next/image';
import { useFetch } from "../../../../../../libraries/helpers/src/utils/custom.fetch";
import { useVariables } from "../../../../../../libraries/react-shared-libraries/src/helpers/variable.context";
import { useT } from "../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export const OauthProvider = () => {
    const fetch = useFetch();
    const { oauthLogoUrl, oauthDisplayName } = useVariables();
    const t = useT();
    const gotoLogin = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const response = yield fetch('/auth/oauth/GENERIC');
            if (!response.ok) {
                throw new Error(`Login link request failed with status ${response.status}`);
            }
            const link = yield response.text();
            window.location.href = link;
        }
        catch (error) {
            console.error('Failed to get generic oauth login link:', error);
        }
    }), []);
    return (<div onClick={gotoLogin} className={`cursor-pointer flex-1 bg-white h-[44px] rounded-[4px] flex justify-center items-center text-customColor16 gap-[4px]`}>
      <div>
        <Image src={oauthLogoUrl || '/icons/generic-oauth.svg'} alt="genericOauth" width={40} height={40} className="-mt-[7px]"/>
      </div>
      <div>
        {t('sign_in_with', 'Sign in with')}&nbsp;
        {oauthDisplayName || 'OAuth'}
      </div>
    </div>);
};
//# sourceMappingURL=oauth.provider.js.map
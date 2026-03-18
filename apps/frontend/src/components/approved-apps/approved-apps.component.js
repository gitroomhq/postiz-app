'use client';
import { __awaiter } from "tslib";
import { useCallback } from 'react';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import useSWR from 'swr';
import { Button } from "../../../../../libraries/react-shared-libraries/src/form/button";
import { useToaster } from "../../../../../libraries/react-shared-libraries/src/toaster/toaster";
import { deleteDialog } from "../../../../../libraries/react-shared-libraries/src/helpers/delete.dialog";
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
const useApprovedApps = () => {
    const fetch = useFetch();
    const load = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        return (yield fetch('/user/approved-apps')).json();
    }), []);
    return useSWR('approved-apps', load, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
    });
};
export const ApprovedAppsComponent = () => {
    const fetch = useFetch();
    const toaster = useToaster();
    const t = useT();
    const { data: apps, mutate } = useApprovedApps();
    const revokeApp = useCallback((app) => () => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        if (yield deleteDialog(t('are_you_sure_revoke_access', `Are you sure you want to revoke access for ${(_a = app.oauthApp) === null || _a === void 0 ? void 0 : _a.name}?`, { name: (_b = app.oauthApp) === null || _b === void 0 ? void 0 : _b.name }))) {
            try {
                yield fetch(`/user/approved-apps/${app.id}`, {
                    method: 'DELETE',
                });
                toaster.show(t('access_revoked', 'Access revoked successfully'), 'success');
                mutate();
            }
            catch (_c) {
                toaster.show(t('failed_to_revoke', 'Failed to revoke access'), 'warning');
            }
        }
    }), []);
    if (apps === undefined) {
        return null;
    }
    return (<div className="flex flex-col gap-[20px]">
      <div className="flex flex-col">
        <h3 className="text-[20px]">
          {t('approved_apps', 'Approved Apps')}
        </h3>
        <div className="text-customColor18 mt-[4px]">
          {t('apps_you_have_authorized', 'Applications you have authorized to access your Postiz account.')}
        </div>
      </div>

      <div className="bg-sixth border-fifth border rounded-[4px] p-[24px]">
        {!(apps === null || apps === void 0 ? void 0 : apps.length) ? (<div className="text-customColor18">
            {t('no_approved_apps', 'No approved apps yet.')}
          </div>) : (<div className="flex flex-col gap-[16px]">
            {apps.map((app) => {
                var _a, _b, _c, _d, _e, _f, _g;
                return (<div key={app.id} className="flex items-center justify-between p-[12px] border border-fifth rounded-[4px]">
                <div className="flex items-center gap-[12px]">
                  {((_b = (_a = app.oauthApp) === null || _a === void 0 ? void 0 : _a.picture) === null || _b === void 0 ? void 0 : _b.path) ? (<img src={app.oauthApp.picture.path} alt={app.oauthApp.name} className="w-[40px] h-[40px] rounded-full object-cover"/>) : (<div className="w-[40px] h-[40px] rounded-full bg-fifth flex items-center justify-center text-customColor18">
                      {((_e = (_d = (_c = app.oauthApp) === null || _c === void 0 ? void 0 : _c.name) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.toUpperCase()) || '?'}
                    </div>)}
                  <div>
                    <div className="text-[14px] font-bold">
                      {(_f = app.oauthApp) === null || _f === void 0 ? void 0 : _f.name}
                    </div>
                    {((_g = app.oauthApp) === null || _g === void 0 ? void 0 : _g.description) && (<div className="text-customColor18 text-[12px]">
                        {app.oauthApp.description}
                      </div>)}
                    <div className="text-customColor18 text-[12px]">
                      {t('authorized_on', 'Authorized on')}{' '}
                      {new Date(app.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <Button onClick={revokeApp(app)}>
                  {t('revoke', 'Revoke')}
                </Button>
              </div>);
            })}
          </div>)}
      </div>
    </div>);
};
//# sourceMappingURL=approved-apps.component.js.map
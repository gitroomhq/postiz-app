'use client';
import { __awaiter } from "tslib";
import { useCallback } from 'react';
import { FetchWrapperComponent } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import { deleteDialog } from "../../../../../libraries/react-shared-libraries/src/helpers/delete.dialog";
import { useReturnUrl } from "../../app/(app)/auth/return.url.component";
import { useVariables } from "../../../../../libraries/react-shared-libraries/src/helpers/variable.context";
export default function LayoutContext(params) {
    if (params === null || params === void 0 ? void 0 : params.children) {
        // eslint-disable-next-line react/no-children-prop
        return <LayoutContextInner children={params.children}/>;
    }
    return <></>;
}
export function setCookie(cname, cvalue, exdays) {
    if (typeof document === 'undefined') {
        return;
    }
    const d = new Date();
    d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
    const expires = 'expires=' + d.toUTCString();
    document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
}
function LayoutContextInner(params) {
    const returnUrl = useReturnUrl();
    const { backendUrl, isGeneral, isSecured } = useVariables();
    const afterRequest = useCallback((url, options, response) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        if (typeof window !== 'undefined' &&
            window.location.href.includes('/p/')) {
            return true;
        }
        const headerAuth = ((_a = response === null || response === void 0 ? void 0 : response.headers) === null || _a === void 0 ? void 0 : _a.get('auth')) || ((_b = response === null || response === void 0 ? void 0 : response.headers) === null || _b === void 0 ? void 0 : _b.get('Auth'));
        const showOrg = ((_c = response === null || response === void 0 ? void 0 : response.headers) === null || _c === void 0 ? void 0 : _c.get('showorg')) || ((_d = response === null || response === void 0 ? void 0 : response.headers) === null || _d === void 0 ? void 0 : _d.get('Showorg'));
        const impersonate = ((_e = response === null || response === void 0 ? void 0 : response.headers) === null || _e === void 0 ? void 0 : _e.get('impersonate')) ||
            ((_f = response === null || response === void 0 ? void 0 : response.headers) === null || _f === void 0 ? void 0 : _f.get('Impersonate'));
        const logout = ((_g = response === null || response === void 0 ? void 0 : response.headers) === null || _g === void 0 ? void 0 : _g.get('logout')) || ((_h = response === null || response === void 0 ? void 0 : response.headers) === null || _h === void 0 ? void 0 : _h.get('Logout'));
        if (headerAuth) {
            setCookie('auth', headerAuth, 365);
        }
        if (showOrg) {
            setCookie('showorg', showOrg, 365);
        }
        if (impersonate) {
            setCookie('impersonate', impersonate, 365);
        }
        if (logout && !isSecured) {
            setCookie('auth', '', -10);
            setCookie('showorg', '', -10);
            setCookie('impersonate', '', -10);
            window.location.href = '/';
            return true;
        }
        const reloadOrOnboarding = ((_j = response === null || response === void 0 ? void 0 : response.headers) === null || _j === void 0 ? void 0 : _j.get('reload')) ||
            ((_k = response === null || response === void 0 ? void 0 : response.headers) === null || _k === void 0 ? void 0 : _k.get('onboarding'));
        if (reloadOrOnboarding) {
            const getAndClear = returnUrl.getAndClear();
            if (getAndClear) {
                window.location.href = getAndClear;
                return true;
            }
        }
        if ((_l = response === null || response === void 0 ? void 0 : response.headers) === null || _l === void 0 ? void 0 : _l.get('onboarding')) {
            window.location.href = isGeneral
                ? '/launches?onboarding=true'
                : '/analytics?onboarding=true';
            return true;
        }
        if ((_m = response === null || response === void 0 ? void 0 : response.headers) === null || _m === void 0 ? void 0 : _m.get('reload')) {
            window.location.reload();
            return true;
        }
        if (response.status === 401 || ((_o = response === null || response === void 0 ? void 0 : response.headers) === null || _o === void 0 ? void 0 : _o.get('logout'))) {
            if (!isSecured) {
                setCookie('auth', '', -10);
                setCookie('showorg', '', -10);
                setCookie('impersonate', '', -10);
            }
            window.location.href = '/';
        }
        if (response.status === 406) {
            if (yield deleteDialog('You are currently on trial, in order to use the feature you must finish the trial', 'Finish the trial, charge me now', 'Trial')) {
                window.open('/billing?finishTrial=true', '_blank');
                return false;
            }
            return false;
        }
        if (response.status === 402) {
            if (yield deleteDialog((yield response.json()).message, 'Move to billing', 'Payment Required')) {
                window.open('/billing', '_blank');
                return false;
            }
            return true;
        }
        return true;
    }), []);
    return (<FetchWrapperComponent baseUrl={backendUrl} afterRequest={afterRequest}>
      {(params === null || params === void 0 ? void 0 : params.children) || <></>}
    </FetchWrapperComponent>);
}
//# sourceMappingURL=layout.context.js.map
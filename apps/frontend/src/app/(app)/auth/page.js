import { __awaiter } from "tslib";
import { internalFetch } from "../../../../../../libraries/helpers/src/utils/internal.fetch";
export const dynamic = 'force-dynamic';
import { Register } from "../../../components/auth/register";
import { isGeneralServerSide } from "../../../../../../libraries/helpers/src/utils/is.general.server.side";
import Link from 'next/link';
import { getT } from "../../../../../../libraries/react-shared-libraries/src/translation/get.translation.service.backend";
import { LoginWithOidc } from "../../../components/auth/login.with.oidc";
export const metadata = {
    title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Register`,
    description: '',
};
export default function Auth(params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const t = yield getT();
        if (process.env.DISABLE_REGISTRATION === 'true') {
            const canRegister = (yield (yield internalFetch('/auth/can-register')).json()).register;
            if (!canRegister && !((_a = params === null || params === void 0 ? void 0 : params.searchParams) === null || _a === void 0 ? void 0 : _a.provider)) {
                return (<>
          <LoginWithOidc />
          <div className="text-center">
            {t('registration_is_disabled', 'Registration is disabled')}
            <br />
            <Link className="underline hover:font-bold" href="/auth/login">
              {t('login_instead', 'Login instead')}
            </Link>
          </div>
        </>);
            }
        }
        return <Register />;
    });
}
//# sourceMappingURL=page.js.map
import { __awaiter } from "tslib";
export const dynamic = 'force-dynamic';
import { ForgotReturn } from "../../../../../components/auth/forgot-return";
import { isGeneralServerSide } from "../../../../../../../../libraries/helpers/src/utils/is.general.server.side";
export const metadata = {
    title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Forgot Password`,
    description: '',
};
export default function Auth(params) {
    return __awaiter(this, void 0, void 0, function* () {
        return <ForgotReturn token={params.params.token}/>;
    });
}
//# sourceMappingURL=page.js.map
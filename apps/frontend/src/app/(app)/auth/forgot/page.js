import { __awaiter } from "tslib";
export const dynamic = 'force-dynamic';
import { Forgot } from "../../../../components/auth/forgot";
import { isGeneralServerSide } from "../../../../../../../libraries/helpers/src/utils/is.general.server.side";
export const metadata = {
    title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Forgot Password`,
    description: '',
};
export default function Auth() {
    return __awaiter(this, void 0, void 0, function* () {
        return <Forgot />;
    });
}
//# sourceMappingURL=page.js.map
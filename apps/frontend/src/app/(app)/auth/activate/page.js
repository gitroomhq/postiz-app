import { __awaiter } from "tslib";
export const dynamic = 'force-dynamic';
import { Activate } from "../../../../components/auth/activate";
import { isGeneralServerSide } from "../../../../../../../libraries/helpers/src/utils/is.general.server.side";
export const metadata = {
    title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} - Activate your account`,
    description: '',
};
export default function Auth() {
    return __awaiter(this, void 0, void 0, function* () {
        return <Activate />;
    });
}
//# sourceMappingURL=page.js.map
import { __awaiter } from "tslib";
export const dynamic = 'force-dynamic';
import { Login } from "../../../../components/auth/login";
import { isGeneralServerSide } from "../../../../../../../libraries/helpers/src/utils/is.general.server.side";
export const metadata = {
    title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Login`,
    description: '',
};
export default function Auth() {
    return __awaiter(this, void 0, void 0, function* () {
        return <Login />;
    });
}
//# sourceMappingURL=page.js.map
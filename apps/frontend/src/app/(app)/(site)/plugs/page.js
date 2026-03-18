import { __awaiter } from "tslib";
import { Plugs } from "../../../../components/plugs/plugs";
export const dynamic = 'force-dynamic';
import { isGeneralServerSide } from "../../../../../../../libraries/helpers/src/utils/is.general.server.side";
export const metadata = {
    title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Plugs`,
    description: '',
};
export default function Index() {
    return __awaiter(this, void 0, void 0, function* () {
        return <Plugs />;
    });
}
//# sourceMappingURL=page.js.map
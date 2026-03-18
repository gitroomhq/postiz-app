import { __awaiter } from "tslib";
import { ThirdPartyComponent } from "../../../../components/third-parties/third-party.component";
export const dynamic = 'force-dynamic';
import { isGeneralServerSide } from "../../../../../../../libraries/helpers/src/utils/is.general.server.side";
export const metadata = {
    title: `${isGeneralServerSide() ? 'Postiz Integrations' : 'Gitroom Integrations'}`,
    description: '',
};
export default function Index() {
    return __awaiter(this, void 0, void 0, function* () {
        return <ThirdPartyComponent />;
    });
}
//# sourceMappingURL=page.js.map
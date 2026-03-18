import { __awaiter } from "tslib";
import { SettingsPopup } from "../../../../components/layout/settings.component";
export const dynamic = 'force-dynamic';
import { isGeneralServerSide } from "../../../../../../../libraries/helpers/src/utils/is.general.server.side";
export const metadata = {
    title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Settings`,
    description: '',
};
export default function Index(_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchParams, }) {
        return <SettingsPopup />;
    });
}
//# sourceMappingURL=page.js.map
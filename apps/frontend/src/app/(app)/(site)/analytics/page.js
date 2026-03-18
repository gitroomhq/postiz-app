import { __awaiter } from "tslib";
export const dynamic = 'force-dynamic';
import { PlatformAnalytics } from "../../../../components/platform-analytics/platform.analytics";
import { isGeneralServerSide } from "../../../../../../../libraries/helpers/src/utils/is.general.server.side";
export const metadata = {
    title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Analytics`,
    description: '',
};
export default function Index() {
    return __awaiter(this, void 0, void 0, function* () {
        return <PlatformAnalytics />;
    });
}
//# sourceMappingURL=page.js.map
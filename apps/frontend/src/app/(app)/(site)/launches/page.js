import { __awaiter } from "tslib";
export const dynamic = 'force-dynamic';
import { LaunchesComponent } from "../../../../components/launches/launches.component";
import { isGeneralServerSide } from "../../../../../../../libraries/helpers/src/utils/is.general.server.side";
export const metadata = {
    title: `${isGeneralServerSide() ? 'Postiz Calendar' : 'Gitroom Launches'}`,
    description: '',
};
export default function Index() {
    return __awaiter(this, void 0, void 0, function* () {
        return <LaunchesComponent />;
    });
}
//# sourceMappingURL=page.js.map
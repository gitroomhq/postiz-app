import { __awaiter } from "tslib";
import { MediaLayoutComponent } from "../../../../components/new-layout/layout.media.component";
import { isGeneralServerSide } from "../../../../../../../libraries/helpers/src/utils/is.general.server.side";
export const metadata = {
    title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Media`,
    description: '',
};
export default function Page() {
    return __awaiter(this, void 0, void 0, function* () {
        return <MediaLayoutComponent />;
    });
}
//# sourceMappingURL=page.js.map
import { __awaiter } from "tslib";
import { LifetimeDeal } from "../../../../../components/billing/lifetime.deal";
export const dynamic = 'force-dynamic';
import { isGeneralServerSide } from "../../../../../../../../libraries/helpers/src/utils/is.general.server.side";
export const metadata = {
    title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Lifetime deal`,
    description: '',
};
export default function Page() {
    return __awaiter(this, void 0, void 0, function* () {
        return <LifetimeDeal />;
    });
}
//# sourceMappingURL=page.js.map
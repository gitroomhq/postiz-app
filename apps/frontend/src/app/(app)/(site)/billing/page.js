import { __awaiter } from "tslib";
export const dynamic = 'force-dynamic';
import { BillingComponent } from "../../../../components/billing/billing.component";
import { isGeneralServerSide } from "../../../../../../../libraries/helpers/src/utils/is.general.server.side";
export const metadata = {
    title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Billing`,
    description: '',
};
export default function Page() {
    return __awaiter(this, void 0, void 0, function* () {
        return (<div className="bg-newBgColorInner flex-1 flex-col flex p-[20px] gap-[12px]">
      <BillingComponent />
    </div>);
    });
}
//# sourceMappingURL=page.js.map
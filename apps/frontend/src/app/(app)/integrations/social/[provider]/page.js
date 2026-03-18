import { __awaiter } from "tslib";
import { ContinueIntegration } from "../../../../../components/launches/continue.integration";
import { cookies } from 'next/headers';
export const dynamic = 'force-dynamic';
export default function Page(_a) {
    return __awaiter(this, arguments, void 0, function* ({ params: { provider }, searchParams, }) {
        const get = cookies().get('auth');
        return <ContinueIntegration searchParams={searchParams} provider={provider} logged={!!(get === null || get === void 0 ? void 0 : get.name)}/>;
    });
}
//# sourceMappingURL=page.js.map
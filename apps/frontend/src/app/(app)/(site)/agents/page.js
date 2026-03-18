import { __awaiter } from "tslib";
import { redirect } from 'next/navigation';
export const metadata = {
    title: 'Postiz - Agent',
    description: '',
};
export default function Page() {
    return __awaiter(this, void 0, void 0, function* () {
        return redirect('/agents/new');
    });
}
//# sourceMappingURL=page.js.map
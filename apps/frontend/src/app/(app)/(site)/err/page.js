import { __awaiter } from "tslib";
import { getT } from "../../../../../../../libraries/react-shared-libraries/src/translation/get.translation.service.backend";
export const metadata = {
    title: 'Error',
    description: '',
};
export default function Page() {
    return __awaiter(this, void 0, void 0, function* () {
        const t = yield getT();
        return (<div>
      {t('we_are_experiencing_some_difficulty_try_to_refresh_the_page', 'We are experiencing some difficulty, try to refresh the page')}
    </div>);
    });
}
//# sourceMappingURL=page.js.map
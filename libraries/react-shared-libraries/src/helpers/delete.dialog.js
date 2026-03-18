import { __awaiter } from "tslib";
import i18next from "../translation/i18next";
import { areYouSure } from "../../../../apps/frontend/src/components/layout/new-modal";
export const deleteDialog = (message, confirmButton, title, cancelButton) => __awaiter(void 0, void 0, void 0, function* () {
    return areYouSure({
        title: title || i18next.t('are_you_sure', 'Are you sure?'),
        description: message,
        approveLabel: confirmButton || i18next.t('yes_delete_it', 'Yes, delete it!'),
        cancelLabel: cancelButton || i18next.t('no_cancel', 'No, cancel!'),
    });
});
//# sourceMappingURL=delete.dialog.js.map
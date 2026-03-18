import { __awaiter } from "tslib";
import { Button } from "../../../../../libraries/react-shared-libraries/src/form/button";
import { deleteDialog } from "../../../../../libraries/react-shared-libraries/src/helpers/delete.dialog";
import { useCallback } from 'react';
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export const MergePost = (props) => {
    const { merge } = props;
    const t = useT();
    const notReversible = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        if (yield deleteDialog('Are you sure you want to merge all comments into one post? This action is not reversible.', 'Yes')) {
            merge();
        }
    }), [merge]);
    return (<Button className="!h-[30px] !text-sm !bg-red-800" onClick={notReversible}>
      {t('merge_comments_into_one_post', 'Merge comments into one post')}
    </Button>);
};
//# sourceMappingURL=merge.post.js.map
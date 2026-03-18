import { __awaiter } from "tslib";
import { Button } from "../../../../../libraries/react-shared-libraries/src/form/button";
import { deleteDialog } from "../../../../../libraries/react-shared-libraries/src/helpers/delete.dialog";
import { useCallback } from 'react';
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
export const SeparatePost = (props) => {
    const { len, posts } = props;
    const t = useT();
    const fetch = useFetch();
    const notReversible = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        if (yield deleteDialog('Are you sure you want to separate all posts? This action is not reversible.', 'Yes')) {
            props.changeLoading(true);
            const merge = props.posts.join('\n');
            const { posts } = yield (yield fetch('/posts/separate-posts', {
                method: 'POST',
                body: JSON.stringify({
                    content: merge,
                    len: props.len,
                }),
            })).json();
            props.merge(posts);
            props.changeLoading(false);
        }
    }), [len, posts]);
    return (<Button className="!h-[30px] !text-sm !bg-red-800" onClick={notReversible}>
      {t('separate_post', 'Separate post to multiple posts')}
    </Button>);
};
//# sourceMappingURL=separate.post.js.map
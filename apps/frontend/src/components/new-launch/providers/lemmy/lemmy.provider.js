'use client';
import { __awaiter } from "tslib";
import { useCallback } from 'react';
import { PostComment, withProvider, } from "../high.order.provider";
import { useSettings } from "../../../launches/helpers/use.values";
import { useFieldArray } from 'react-hook-form';
import { Button } from "../../../../../../../libraries/react-shared-libraries/src/form/button";
import { deleteDialog } from "../../../../../../../libraries/react-shared-libraries/src/helpers/delete.dialog";
import { Subreddit } from './subreddit';
import { LemmySettingsDto } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/lemmy.dto";
import { useT } from "../../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
const LemmySettings = () => {
    const { register, control } = useSettings();
    const { fields, append, remove } = useFieldArray({
        control,
        // control props comes from useForm (optional: if you are using FormContext)
        name: 'subreddit', // unique name for your Field Array
    });
    const t = useT();
    const addField = useCallback(() => {
        append({});
    }, [fields, append]);
    const deleteField = useCallback((index) => () => __awaiter(void 0, void 0, void 0, function* () {
        if (!(yield deleteDialog(t('are_you_sure_you_want_to_delete_this_subreddit', 'Are you sure you want to delete this Subreddit?'))))
            return;
        remove(index);
    }), [fields, remove]);
    return (<>
      <div className="flex flex-col gap-[20px] mb-[20px]">
        {fields.map((field, index) => (<div key={field.id} className="flex flex-col relative">
            <div onClick={deleteField(index)} className="absolute -start-[10px] justify-center items-center flex -top-[10px] w-[20px] h-[20px] bg-red-600 rounded-full text-textColor">
              x
            </div>
            <Subreddit {...register(`subreddit.${index}.value`)}/>
          </div>))}
      </div>
      <Button onClick={addField}>{t('add_community', 'Add Community')}</Button>
      {fields.length === 0 && (<div className="text-red-500 text-[12px] mt-[10px]">
          {t('please_add_at_least_one_subreddit', 'Please add at least one Subreddit')}
        </div>)}
    </>);
};
export default withProvider({
    postComment: PostComment.COMMENT,
    minimumCharacters: [],
    SettingsComponent: LemmySettings,
    CustomPreviewComponent: undefined,
    dto: LemmySettingsDto,
    checkValidity: (items) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
        const [firstItems] = items !== null && items !== void 0 ? items : [];
        if ((firstItems === null || firstItems === void 0 ? void 0 : firstItems.length) &&
            ((_d = (_c = (_b = (_a = firstItems === null || firstItems === void 0 ? void 0 : firstItems[0]) === null || _a === void 0 ? void 0 : _a.path) === null || _b === void 0 ? void 0 : _b.indexOf) === null || _c === void 0 ? void 0 : _c.call(_b, 'png')) !== null && _d !== void 0 ? _d : -1) === -1 &&
            ((_h = (_g = (_f = (_e = firstItems === null || firstItems === void 0 ? void 0 : firstItems[0]) === null || _e === void 0 ? void 0 : _e.path) === null || _f === void 0 ? void 0 : _f.indexOf) === null || _g === void 0 ? void 0 : _g.call(_f, 'jpg')) !== null && _h !== void 0 ? _h : -1) === -1 &&
            ((_m = (_l = (_k = (_j = firstItems === null || firstItems === void 0 ? void 0 : firstItems[0]) === null || _j === void 0 ? void 0 : _j.path) === null || _k === void 0 ? void 0 : _k.indexOf) === null || _l === void 0 ? void 0 : _l.call(_k, 'jpef')) !== null && _m !== void 0 ? _m : -1) === -1 &&
            ((_r = (_q = (_p = (_o = firstItems === null || firstItems === void 0 ? void 0 : firstItems[0]) === null || _o === void 0 ? void 0 : _o.path) === null || _p === void 0 ? void 0 : _p.indexOf) === null || _q === void 0 ? void 0 : _q.call(_p, 'gif')) !== null && _r !== void 0 ? _r : -1) === -1) {
            return 'You can set only one picture for a cover';
        }
        return true;
    }),
    maximumCharacters: 10000,
});
//# sourceMappingURL=lemmy.provider.js.map
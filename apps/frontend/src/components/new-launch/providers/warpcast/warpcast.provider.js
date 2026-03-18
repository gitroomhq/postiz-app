'use client';
import { __awaiter } from "tslib";
import { PostComment, withProvider, } from "../high.order.provider";
import { useCallback } from 'react';
import { useSettings } from "../../../launches/helpers/use.values";
import { useFieldArray } from 'react-hook-form';
import { deleteDialog } from "../../../../../../../libraries/react-shared-libraries/src/helpers/delete.dialog";
import { Button } from "../../../../../../../libraries/react-shared-libraries/src/form/button";
import { Subreddit } from './subreddit';
import { useT } from "../../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
const WrapcastProvider = () => {
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
      <Button onClick={addField}>{t('add_channel', 'Add Channel')}</Button>
    </>);
};
export default withProvider({
    postComment: PostComment.POST,
    minimumCharacters: [],
    SettingsComponent: WrapcastProvider,
    CustomPreviewComponent: undefined,
    dto: undefined,
    checkValidity: (list) => __awaiter(void 0, void 0, void 0, function* () {
        if (list === null || list === void 0 ? void 0 : list.some((item) => item === null || item === void 0 ? void 0 : item.some((field) => { var _a, _b, _c; return ((_c = (_b = (_a = field === null || field === void 0 ? void 0 : field.path) === null || _a === void 0 ? void 0 : _a.indexOf) === null || _b === void 0 ? void 0 : _b.call(_a, 'mp4')) !== null && _c !== void 0 ? _c : -1) > -1; }))) {
            return 'Can only accept images';
        }
        return true;
    }),
    maximumCharacters: 800,
});
//# sourceMappingURL=warpcast.provider.js.map
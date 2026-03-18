'use client';
import { __awaiter } from "tslib";
import { useCallback } from 'react';
import { PostComment, withProvider, } from "../high.order.provider";
import { useIntegration } from "../../../launches/helpers/use.integration";
import { Subreddit } from "./subreddit";
import { useSettings } from "../../../launches/helpers/use.values";
import { useFieldArray, useWatch } from 'react-hook-form';
import { Button } from "../../../../../../../libraries/react-shared-libraries/src/form/button";
import { RedditSettingsDto, } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/reddit.dto";
import clsx from 'clsx';
import { useMediaDirectory } from "../../../../../../../libraries/react-shared-libraries/src/helpers/use.media.directory";
import { deleteDialog } from "../../../../../../../libraries/react-shared-libraries/src/helpers/delete.dialog";
import Image from 'next/image';
import { useT } from "../../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import { useFormatting } from "../../../launches/helpers/use.formatting";
const RenderRedditComponent = (props) => {
    const { value: topValue } = useIntegration();
    const showMedia = useMediaDirectory();
    const t = useT();
    const { type, images } = props;
    const [firstPost] = topValue;
    switch (type) {
        case 'self':
            return (<div dangerouslySetInnerHTML={{ __html: firstPost === null || firstPost === void 0 ? void 0 : firstPost.content }} style={{
                    whiteSpace: 'pre-wrap',
                    fontSize: '14px',
                }}/>);
        case 'link':
            return (<div className="h-[375px] bg-primary rounded-[16px] flex justify-center items-center">
          {t('link', 'Link')}
        </div>);
        case 'media':
            return (<div className="h-[375px] bg-primary rounded-[16px] flex justify-center items-center">
          {!!(images === null || images === void 0 ? void 0 : images.length) &&
                    images.map((image, index) => (<a key={`image_${index}`} href={showMedia.set(image.path)} className="flex-1 h-full" target="_blank">
                <img className="w-full h-full object-cover" src={showMedia.set(image.path)}/>
              </a>))}
        </div>);
    }
    return <></>;
};
const RedditPreview = (props) => {
    const { value: topValue, integration } = useIntegration();
    const settings = useWatch({
        name: 'subreddit',
    });
    const [, ...restOfPosts] = useFormatting(topValue, {
        removeMarkdown: true,
        saveBreaklines: true,
        specialFunc: (text) => {
            return text.slice(0, 280);
        },
    });
    if (!settings || !settings.length) {
        return <>Please add at least one Subreddit from the settings</>;
    }
    return (<div className="flex flex-col gap-[40px] w-full">
      {settings
            .filter(({ value }) => value === null || value === void 0 ? void 0 : value.subreddit)
            .map(({ value }, index) => (<div key={index} className={clsx(`bg-customColor37 w-full p-[10px] flex flex-col border-tableBorder border`)}>
            <div className="flex flex-col">
              <div className="flex flex-row gap-[8px]">
                <div className="w-[40px] h-[40px] bg-white rounded-full"/>
                <div className="flex flex-col">
                  <div className="text-[12px] font-[700]">
                    {value.subreddit}
                  </div>
                  <div className="text-[12px]">{integration === null || integration === void 0 ? void 0 : integration.name}</div>
                </div>
              </div>
              <div className="font-[600] text-[24px] mb-[16px]">
                {value.title}
              </div>
              <div className={clsx(restOfPosts.length && 'mt-[40px] flex flex-col gap-[20px]')}>
                {restOfPosts.map((p, index) => (<div className="flex gap-[8px]" key={index}>
                    <div className="w-[32px] h-[32px] relative">
                      <Image width={48} height={48} src={integration === null || integration === void 0 ? void 0 : integration.picture} alt="x" className="rounded-full w-full h-full relative z-[2]"/>
                      <Image width={24} height={24} src={`/icons/platforms/${integration === null || integration === void 0 ? void 0 : integration.identifier}.png`} alt="x" className="rounded-full absolute -end-[5px] -bottom-[5px] z-[2]"/>
                    </div>
                    <div className="flex-1 flex flex-col leading-[16px] w-full pe-[64px] pb-[8px] rounded-[8px]">
                      <div className="text-[14px] font-[600]">
                        {integration === null || integration === void 0 ? void 0 : integration.name}
                      </div>
                      <div dangerouslySetInnerHTML={{ __html: p.text }} style={{
                    whiteSpace: 'pre-wrap',
                }}/>
                    </div>
                  </div>))}
              </div>
            </div>
          </div>))}
    </div>);
};
const RedditSettings = () => {
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
      <Button onClick={addField}>{t('add_subreddit', 'Add Subreddit')}</Button>
      {fields.length === 0 && (<div className="text-red-500 text-[12px] mt-[10px]">
          {t('please_add_at_least_one_subreddit', 'Please add at least one Subreddit')}
        </div>)}
    </>);
};
export default withProvider({
    postComment: PostComment.POST,
    minimumCharacters: [],
    SettingsComponent: RedditSettings,
    CustomPreviewComponent: undefined,
    dto: RedditSettingsDto,
    checkValidity: (posts, settings) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        if ((_a = settings === null || settings === void 0 ? void 0 : settings.subreddit) === null || _a === void 0 ? void 0 : _a.some((p, index) => { var _a, _b; return ((_a = p === null || p === void 0 ? void 0 : p.value) === null || _a === void 0 ? void 0 : _a.type) === 'media' && ((_b = posts === null || posts === void 0 ? void 0 : posts[0]) === null || _b === void 0 ? void 0 : _b.length) !== 1; })) {
            return 'When posting a media post, you must attached exactly one media file.';
        }
        if (posts === null || posts === void 0 ? void 0 : posts.some((p) => p === null || p === void 0 ? void 0 : p.some((a) => { var _a, _b, _c; return !(a === null || a === void 0 ? void 0 : a.thumbnail) && ((_c = (_b = (_a = a === null || a === void 0 ? void 0 : a.path) === null || _a === void 0 ? void 0 : _a.indexOf) === null || _b === void 0 ? void 0 : _b.call(_a, 'mp4')) !== null && _c !== void 0 ? _c : -1) > -1; }))) {
            return 'You must attach a thumbnail to your video post.';
        }
        return true;
    }),
    maximumCharacters: 10000,
});
//# sourceMappingURL=reddit.provider.js.map
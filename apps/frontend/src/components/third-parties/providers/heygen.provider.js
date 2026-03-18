import { __awaiter } from "tslib";
import { thirdPartyWrapper } from "../third-party.wrapper";
import { useThirdPartyFunction, useThirdPartyFunctionSWR, useThirdPartySubmit, } from "../third-party.function";
import { useThirdParty } from "../third-party.media";
import { useForm, FormProvider } from 'react-hook-form';
import { Textarea } from "../../../../../../libraries/react-shared-libraries/src/form/textarea";
import { Button } from "../../../../../../libraries/react-shared-libraries/src/form/button";
import { useCallback, useState } from 'react';
import { deleteDialog } from "../../../../../../libraries/react-shared-libraries/src/helpers/delete.dialog";
import clsx from 'clsx';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string } from 'zod';
import { Select } from "../../../../../../libraries/react-shared-libraries/src/form/select";
import { LoadingComponent } from "../../layout/loading";
const aspectRatio = [
    { key: 'portrait', value: 'Portrait' },
    { key: 'story', value: 'Story' },
];
const generateCaptions = [
    { key: 'yes', value: 'Yes' },
    { key: 'no', value: 'No' },
];
const SelectAvatarComponent = (props) => {
    const [current, setCurrent] = useState({});
    const { avatarList, onChange } = props;
    return (<div className="grid grid-cols-4 gap-[10px] justify-items-center justify-center">
      {avatarList === null || avatarList === void 0 ? void 0 : avatarList.map((p) => (<div onClick={() => {
                setCurrent(p.avatar_id === (current === null || current === void 0 ? void 0 : current.avatar_id) ? undefined : p);
                onChange(p.avatar_id === (current === null || current === void 0 ? void 0 : current.avatar_id) ? {} : p.avatar_id);
            }} key={p.avatar_id} className={clsx('w-full h-full p-[20px] min-h-[100px] text-[14px] hover:bg-input transition-all text-textColor relative flex flex-col gap-[15px] cursor-pointer', (current === null || current === void 0 ? void 0 : current.avatar_id) === p.avatar_id
                ? 'bg-input border border-red-500'
                : 'bg-third')}>
          <div>
            <img src={p.preview_image_url} className="w-full h-full object-cover"/>
          </div>
          <div>{p.avatar_name}</div>
        </div>))}
    </div>);
};
const SelectVoiceComponent = (props) => {
    const [current, setCurrent] = useState({});
    const { voiceList, onChange } = props;
    return (<div className="grid grid-cols-6 gap-[10px] justify-items-center justify-center">
      {voiceList === null || voiceList === void 0 ? void 0 : voiceList.map((p) => (<div onClick={() => {
                setCurrent(p.voice_id === (current === null || current === void 0 ? void 0 : current.voice_id) ? undefined : p);
                onChange(p.voice_id === (current === null || current === void 0 ? void 0 : current.voice_id) ? {} : p.voice_id);
            }} key={p.avatar_id} className={clsx('w-full h-full p-[20px] min-h-[100px] text-[14px] hover:bg-input transition-all text-textColor relative flex flex-col gap-[15px] cursor-pointer', (current === null || current === void 0 ? void 0 : current.voice_id) === p.voice_id
                ? 'bg-input border border-red-500'
                : 'bg-third')}>
          <div className="text-[14px] text-balance whitespace-pre-line">
            {p.name}
          </div>
          <div className="text-[12px]">{p.language}</div>
        </div>))}
    </div>);
};
const HeygenProviderComponent = () => {
    var _a, _b, _c, _d, _e, _f;
    const thirdParty = useThirdParty();
    const load = useThirdPartyFunction('EVERYTIME');
    const { data } = useThirdPartyFunctionSWR('LOAD_ONCE', 'avatars');
    const { data: voices } = useThirdPartyFunctionSWR('LOAD_ONCE', 'voices');
    const send = useThirdPartySubmit();
    const [hideVoiceGenerator, setHideVoiceGenerator] = useState(false);
    const [voiceLoading, setVoiceLoading] = useState(false);
    const form = useForm({
        values: {
            voice: '',
            avatar: '',
            aspect_ratio: '',
            captions: '',
            selectedVoice: '',
            type: '',
        },
        mode: 'all',
        resolver: zodResolver(object({
            voice: string().min(20, 'Voice must be at least 20 characters long'),
            avatar: string().min(1, 'Avatar is required'),
            selectedVoice: string().min(1, 'Voice is required'),
            aspect_ratio: string().min(1, 'Aspect ratio is required'),
            captions: string().min(1, 'Captions is required'),
        })),
    });
    const generateVoice = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        if (!(yield deleteDialog('Are you sure? it will delete the current text'))) {
            return;
        }
        setVoiceLoading(true);
        form.setValue('voice', (yield load('generateVoice', {
            text: thirdParty.data.map((p) => p.content).join('\n'),
        })).voice);
        setVoiceLoading(false);
        setHideVoiceGenerator(true);
    }), [thirdParty]);
    const submit = useCallback((params) => __awaiter(void 0, void 0, void 0, function* () {
        thirdParty.onChange(yield send(params));
        thirdParty.close();
    }), []);
    return (<div>
      {form.formState.isSubmitting && (<div className="fixed left-0 top-0 w-full leading-[50px] pt-[200px] h-screen bg-black/90 z-50 flex flex-col justify-center items-center text-center text-3xl">
          Grab a coffee and relax, this may take a while...
          <br />
          You can also track the progress directly in HeyGen Dashboard.
          <br />
          DO NOT CLOSE THIS WINDOW!
          <br />
          <LoadingComponent width={200} height={200}/>
        </div>)}

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="w-full flex flex-col">
          <Select label="Aspect Ratio" {...form.register('aspect_ratio')}>
            <option value="">--SELECT--</option>
            {aspectRatio.map((p) => (<option key={p.key} value={p.key}>
                {p.value}
              </option>))}
          </Select>

          <Select label="Generate Captions" {...form.register('captions')}>
            <option value="">--SELECT--</option>
            {generateCaptions.map((p) => (<option key={p.key} value={p.key}>
                {p.value}
              </option>))}
          </Select>

          <div className="text-lg mb-3">Voice to generate</div>
          {!hideVoiceGenerator && (<Button onClick={generateVoice} loading={voiceLoading}>
              Generate Voice From My Post Text
            </Button>)}
          <Textarea label="" {...form.register('voice')}/>
          {!!(data === null || data === void 0 ? void 0 : data.length) && (<>
              <div className="text-lg my-3">Select Avatar</div>
              <SelectAvatarComponent avatarList={data.map((p) => ({
                avatar_id: p.avatar_id || p.id,
                avatar_name: p.avatar_name || p.name,
                preview_image_url: p.preview_image_url || p.image_url,
            }))} onChange={(id) => {
                var _a;
                form.setValue('avatar', id);
                form.setValue('type', ((_a = data === null || data === void 0 ? void 0 : data.find((p) => p.id === id || p.avatar_id === id)) === null || _a === void 0 ? void 0 : _a.id)
                    ? 'talking_photo'
                    : 'avatar');
            }}/>
              <div className="text-red-400 text-[12px] mb-3">
                {((_c = (_b = (_a = form === null || form === void 0 ? void 0 : form.formState) === null || _a === void 0 ? void 0 : _a.errors) === null || _b === void 0 ? void 0 : _b.avatar) === null || _c === void 0 ? void 0 : _c.message) || ''}
              </div>
            </>)}

          {!!(voices === null || voices === void 0 ? void 0 : voices.length) && (<>
              <div className="text-lg my-3">Select Voice</div>
              <SelectVoiceComponent voiceList={voices} onChange={(id) => form.setValue('selectedVoice', id)}/>
              <div className="text-red-400 text-[12px] mb-3">
                {((_f = (_e = (_d = form === null || form === void 0 ? void 0 : form.formState) === null || _d === void 0 ? void 0 : _d.errors) === null || _e === void 0 ? void 0 : _e.selectedVoice) === null || _f === void 0 ? void 0 : _f.message) || ''}
              </div>
            </>)}

          <Button type="submit">Generate Video</Button>
        </form>
      </FormProvider>
    </div>);
};
export default thirdPartyWrapper('heygen', HeygenProviderComponent);
//# sourceMappingURL=heygen.provider.js.map
import { videoWrapper } from "../video.wrapper";
import { useFormContext } from 'react-hook-form';
import { useVideo } from "../video.context.wrapper";
import { Textarea } from "../../../../../../libraries/react-shared-libraries/src/form/textarea";
import { MultiMediaComponent } from "../../media/media.component";
const VEO3Settings = () => {
    var _a, _b, _c, _d;
    const { register, watch, setValue, formState } = useFormContext();
    const { value } = useVideo();
    const media = register('media', {
        value: [],
    });
    const mediaValue = watch('media');
    return (<div>
      <Textarea label="Prompt" name="prompt" {...register('prompt', {
        required: true,
        minLength: 5,
        value,
    })} error={(_b = (_a = formState === null || formState === void 0 ? void 0 : formState.errors) === null || _a === void 0 ? void 0 : _a.prompt) === null || _b === void 0 ? void 0 : _b.message}/>
      <div className="mb-[6px]">Images (max 3)</div>
      <MultiMediaComponent allData={[]} dummy={true} text="Images" description="Images" name="images" label="Media" value={mediaValue} onChange={(val) => setValue('images', val.target.value
            .filter((f) => f.path.indexOf('mp4') === -1)
            .slice(0, 3))} error={(_d = (_c = formState === null || formState === void 0 ? void 0 : formState.errors) === null || _c === void 0 ? void 0 : _c.media) === null || _d === void 0 ? void 0 : _d.message}/>
    </div>);
};
const VeoComponent = () => {
    return <VEO3Settings />;
};
videoWrapper('veo3', VeoComponent);
//# sourceMappingURL=veo3.provider.js.map
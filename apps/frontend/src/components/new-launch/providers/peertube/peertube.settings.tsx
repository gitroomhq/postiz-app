import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { MediaComponent } from '@gitroom/frontend/components/media/media.component';
import { Input } from '@gitroom/react/form/input';
import { FC } from 'react';
import { useFormContext } from 'react-hook-form';

export const PeertubeSettings: FC = () => {
    const { integration } = useIntegration();
    const { register } = useFormContext();

    const settings = JSON.parse(integration.additionalSettings);

    //minimum 1 channels will be there
    const channels: Array<{ id: number, name: string }> = JSON.parse(settings[0].value);

    return (
        <div className="flex flex-col gap-[12px]">
            <Input label="Title" name="title" type="text" />
            <div className="flex flex-col gap-[4px]">
                <label className="text-[14px]">Channel</label>
                    <select
                        {...register('channelId', { valueAsNumber: true })}
                        className="bg-newTableHeader text-textColor rounded-[8px] p-[8px] border border-tableBorder"
                    >
                        {channels.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                <div className="flex flex-col gap-[4px]">
                    <label className="text-[14px]">Privacy</label>
                    <select
                        {...register('privacy')}
                        className="bg-newTableHeader text-textColor rounded-[8px] p-[8px] border border-tableBorder"
                    >
                        <option value="1">Public</option>
                        <option value="2">Unlisted</option>
                        <option value="3">Private</option>
                    </select>
                </div>
                <Input label="Tags (comma separated)" name="tags" type="text" />

                <label className="flex items-center gap-[8px] text-[14px]">
                    <input type="checkbox" {...register('nsfw')} />
                    NSFW content
                </label>
                <div className="mt-[20px]">
                    <MediaComponent
                        type="image"
                        width={1280}
                        height={720}
                        label="Thumbnail"
                        description="Thumbnail picture (optional)"
                        {...register('thumbnail')}
                    />
                </div>
            </div>
        </div>
    )
};
import {FC} from "react";
import {withProvider} from "@gitroom/frontend/components/launches/providers/high.order.provider";
import {DevToSettingsDto} from "@gitroom/nestjs-libraries/dtos/posts/providers-settings/dev.to.settings.dto";
import {useSettings} from "@gitroom/frontend/components/launches/helpers/use.values";
import {Input} from "@gitroom/react/form/input";
import {MediaComponent} from "@gitroom/frontend/components/media/media.component";
import {SelectOrganization} from "@gitroom/frontend/components/launches/providers/devto/select.organization";
import {DevtoTags} from "@gitroom/frontend/components/launches/providers/devto/devto.tags";

const DevtoPreview: FC = () => {
    return <div>asd</div>
};

const DevtoSettings: FC = () => {
    const form = useSettings();
    return (
        <>
            <Input label="Title" {...form.register('title')} />
            <Input label="Canonical Link" {...form.register('canonical')} />
            <MediaComponent label="Cover picture" description="Add a cover picture" {...form.register('main_image')} />
            <div className="mt-[20px]">
                <SelectOrganization {...form.register('organization') } />
            </div>
            <div>
                <DevtoTags label="Tags (Maximum 4)" {...form.register('tags')} />
            </div>
        </>
    )
};

export default withProvider(DevtoSettings, DevtoPreview, DevToSettingsDto);
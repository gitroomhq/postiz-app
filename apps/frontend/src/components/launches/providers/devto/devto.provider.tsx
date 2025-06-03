import { FC } from 'react';
import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';
import { DevToSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/dev.to.settings.dto';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { Input } from '@gitroom/react/form/input';
import { MediaComponent } from '@gitroom/frontend/components/media/media.component';
import { SelectOrganization } from '@gitroom/frontend/components/launches/providers/devto/select.organization';
import { DevtoTags } from '@gitroom/frontend/components/launches/providers/devto/devto.tags';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import clsx from 'clsx';
import localFont from 'next/font/local';
import MDEditor from '@uiw/react-md-editor';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { Canonical } from '@gitroom/react/form/canonical';
const font = localFont({
  src: [
    {
      path: './fonts/SFNS.woff2',
    },
  ],
});
const DevtoPreview: FC = () => {
  const { value } = useIntegration();
  const settings = useSettings();
  const image = useMediaDirectory();
  const [coverPicture, title, tags] = settings.watch([
    'main_image',
    'title',
    'tags',
  ]);
  return (
    <div
      className={clsx(
        font.className,
        'font-[800] flex h-[1000px] w-[699.8px] rounded-[10px] bg-customColor32 overflow-hidden overflow-y-auto flex-col gap-[32px]'
      )}
    >
      {!!coverPicture?.path && (
        <div className="h-[338.672px]">
          <img
            className="object-cover w-full h-full"
            src={image.set(coverPicture.path)}
            alt="cover_picture"
          />
        </div>
      )}
      <div className="px-[60px]">
        <div className="text-[48px] leading-[60px] mb-[8px]">{title}</div>
        <div className="flex gap-[16px]">
          {tags?.map((p: any) => (
            <div key={p.label}>#{p.label}</div>
          ))}
        </div>
      </div>
      <div className="px-[60px]">
        <MDEditor.Markdown
          style={{
            whiteSpace: 'pre-wrap',
          }}
          className={font.className}
          skipHtml={true}
          source={value.map((p) => p.content).join('\n')}
        />
      </div>
    </div>
  );
};
const DevtoSettings: FC = () => {
  const form = useSettings();
  const { date } = useIntegration();
  return (
    <>
      <Input label="Title" {...form.register('title')} />
      <Canonical
        date={date}
        label="Canonical Link"
        {...form.register('canonical')}
      />
      <MediaComponent
        label="Cover picture"
        description="Add a cover picture"
        {...form.register('main_image')}
      />
      <div className="mt-[20px]">
        <SelectOrganization {...form.register('organization')} />
      </div>
      <div>
        <DevtoTags label="Tags (Maximum 4)" {...form.register('tags')} />
      </div>
    </>
  );
};
export default withProvider(DevtoSettings, DevtoPreview, DevToSettingsDto);

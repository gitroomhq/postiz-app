import { FC } from 'react';
import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { Input } from '@gitroom/react/form/input';
import { DribbbleTeams } from '@gitroom/frontend/components/launches/providers/dribbble/dribbble.teams';
import { DribbbleDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/dribbble.dto';

const DribbbleSettings: FC = () => {
  const { register, control } = useSettings();
  return (
    <div className="flex flex-col">
      <Input label={'Title'} {...register('title')} />
      <DribbbleTeams {...register('team')} />
    </div>
  );
};

export default withProvider(
  DribbbleSettings,
  undefined,
  DribbbleDto,
  async ([firstItem, ...otherItems]) => {
    const isMp4 = firstItem?.find((item) => item.path.indexOf('mp4') > -1);

    if (firstItem.length !== 1) {
      return 'Dribbble requires one item';
    }

    if (isMp4) {
      return 'Dribbble does not support mp4 files';
    }

    const details = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const url = new Image();
        url.onload = function () {
          // @ts-ignore
          resolve({ width: this.width, height: this.height });
        };
        url.src = firstItem[0].path;
      }
    );

    if (
      (details?.width === 400 && details?.height === 300) ||
      (details?.width === 800 && details?.height === 600)
    ) {
      return true;
    }

    return 'Invalid image size. Dribbble requires 400x300 or 800x600 px images.';
  }
);

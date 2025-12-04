'use client';

import { FC, useCallback, useState } from 'react';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { SkoolSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/skool.settings.dto';
import { Input } from '@gitroom/react/form/input';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { SelectLabel } from '@gitroom/frontend/components/new-launch/providers/skool/select.label';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { Checkbox } from '@gitroom/react/form/checkbox';

const SkoolSettings: FC = () => {
  const form = useSettings();
  const { get } = useCustomProviderFunction();
  const [notifyStatus, setNotifyStatus] = useState<{ 
    can_notify: boolean; 
    readable_wait_time?: string; 
    next_available_time?: string;
  } | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleNotifyChange = useCallback(async (event: { target: { name?: string; value: boolean } }) => {
    const isChecked = event.target.value;
    
    // Update form value
    form.setValue('notify', isChecked);
    
    if (isChecked) {
      // Only call API when checkbox is checked
      setIsChecking(true);
      setNotifyStatus(null);
      try {
        const data = await get('checkNotify');
        setNotifyStatus(data);
      } catch (err) {
        setNotifyStatus({ can_notify: false, readable_wait_time: 'Error checking status' });
      } finally {
        setIsChecking(false);
      }
    } else {
      // Clear status when unchecked
      setNotifyStatus(null);
    }
  }, [form, get]);

  const notifyValue = form.watch('notify');

  return (
    <>
      <Input label="Title" {...form.register('title')} />
      <div className="mb-4">
        <SelectLabel {...form.register('label')} />
      </div>
      <Input label="Label ID (Overrides dropdown selection)" {...form.register('labelId')} />
      <div className="mb-4">
        <Checkbox 
          label="Notify all users" 
          name="notify"
          checked={notifyValue}
          onChange={handleNotifyChange}
          disableForm
        />
        {isChecking && (
          <div className="text-yellow-500 text-sm mt-1">
            Checking notify availability...
          </div>
        )}
        {notifyValue && notifyStatus && (
          notifyStatus.can_notify ? (
            <div className="text-green-500 text-sm mt-1">
              ✓ You can notify all users with this post
            </div>
          ) : (
            <div className="text-red-500 text-sm mt-1">
              ✗ Notify limit reached. Next available: {notifyStatus.next_available_time} (in {notifyStatus.readable_wait_time}). Please schedule your post accordingly.
            </div>
          )
        )}
      </div>
    </>
  );
};

export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: SkoolSettings,
  CustomPreviewComponent: undefined,
  dto: SkoolSettingsDto,
  checkValidity: undefined,
  maximumCharacters: 100000,
});

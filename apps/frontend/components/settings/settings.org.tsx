import { FC } from "react";
import { FormProvider, useForm } from 'react-hook-form';
import { Title } from '@tremor/react';
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { axiosInstance } from "@clickvote/frontend/helper/axios";
import { useUserContext } from '@clickvote/frontend/helper/user.context';
import { Button } from '@clickvote/frontend/components/form/button';
import { Input } from '@clickvote/frontend/components/form/input';

type SettingsUpdateOrgFormValues = {
  orgName: string;
}

export const SettingsOrg: FC = () => {
  const {user, updateUserOrgName} = useUserContext();

  const methods = useForm<SettingsUpdateOrgFormValues>({
    mode: 'all',
    defaultValues: { orgName: user?.currentOrg.name ?? '' },
  });
  const { mutate } = useMutation(
    async (orgName: string) =>
      (await axiosInstance.put('/org/update', { name: orgName })).data
  );

  const updateOrgName = ({ orgName }: SettingsUpdateOrgFormValues ) => {
    mutate(orgName, {
      onSuccess: () => {
        toast.success('Organization Name Updated!');
        methods.reset({ orgName: orgName });
        updateUserOrgName(orgName);
      },
      onError: (err) => {
        console.error('Error updating organization name', err);
        toast.error('Ops, something went wrong!');
      },
    });
  }

  return (
    <div className="mb-10">
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(updateOrgName)}>
          <Input
            label="Organization Name"
            name="orgName"
            labelClassName="mt-7"
          />
          <Button type="submit">
            Update
          </Button>
        </form>
      </FormProvider>
    </div>
  );
}

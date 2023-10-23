import { FC } from 'react';
import { SettingsInterface } from '@clickvote/interfaces';
import { FormProvider, useForm } from 'react-hook-form';
import { Input } from '@clickvote/frontend/components/form/input';
import { useUserContext } from '@clickvote/frontend/helper/user.context';
import { Button } from '@clickvote/frontend/components/form/button';
import { useMutation } from "@tanstack/react-query";
import { axiosInstance } from "@clickvote/frontend/helper/axios";
import { toast } from "react-toastify";
import { Prettify } from "@clickvote/frontend/helper/types";

type FormValues = Prettify<SettingsInterface & {
  orgName: string;
}>;

export const OrgForm: FC = () => {
  const { user, updateUserOrgName } = useUserContext();

  const methods = useForm<FormValues>({
    mode: 'all',
    defaultValues: { orgName: user?.currentOrg.name ?? '' },
  });

  const { mutate } = useMutation(
    async (orgName: string) => {
      const { data } = await axiosInstance.put('/org/update', { name: orgName });
      return data;
    }
  );

  const updateOrgName = ({ orgName }: FormValues) => {
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
  );
};

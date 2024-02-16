import {useEffect, useMemo} from 'react';
import { useForm } from 'react-hook-form';
import { UseFormProps } from 'react-hook-form/dist/types';
import {allProvidersSettings} from "@gitroom/nestjs-libraries/dtos/posts/providers-settings/all.providers.settings";
import {classValidatorResolver} from "@hookform/resolvers/class-validator";

const finalInformation = {} as {
  [key: string]: { posts: string[]; settings: () => object; isValid: boolean };
};
export const useValues = (identifier: string, integration: string, value: string[]) => {
  const resolver = useMemo(() => {
    const findValidator = allProvidersSettings.find((provider) => provider.identifier === identifier)!;
    return classValidatorResolver(findValidator?.validator);
  }, [integration]);

  const form = useForm({
    resolver
  });

  const getValues = useMemo(() => {
    return form.getValues;
  }, [form]);

  finalInformation[integration]= finalInformation[integration] || {};
  finalInformation[integration].posts = value;
  finalInformation[integration].isValid = form.formState.isValid;
  finalInformation[integration].settings = getValues;

  useEffect(() => {
    return () => {
      delete finalInformation[integration];
    };
  }, []);

  return form;
};

export const useSettings = (formProps?: Omit<UseFormProps, 'mode'>) => {
  // const { integration } = useIntegration();
  // const form = useForm({
  //   ...formProps,
  //   mode: 'onChange',
  // });
  //
  // finalInformation[integration?.identifier!].settings = {
  //   __type: integration?.identifier!,
  //   ...form.getValues(),
  // };
  // return form;
};

export const getValues = () => finalInformation;
export const resetValues = () => {
  Object.keys(finalInformation).forEach((key) => {
    delete finalInformation[key];
  });
};

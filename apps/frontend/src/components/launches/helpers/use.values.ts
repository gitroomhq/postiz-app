import {useEffect, useMemo} from 'react';
import {useForm, useFormContext} from 'react-hook-form';
import {classValidatorResolver} from "@hookform/resolvers/class-validator";

const finalInformation = {} as {
  [key: string]: { posts: Array<{id?: string, content: string, media?: Array<string>}>; settings: () => object; trigger: () => Promise<boolean>; isValid: boolean };
};
export const useValues = (initialValues: object, integration: string, identifier: string, value: Array<{id?: string, content: string, media?: Array<string>}>, dto: any) => {
  const resolver = useMemo(() => {
    return classValidatorResolver(dto);
  }, [integration]);

  const form = useForm({
    resolver,
    values: initialValues,
    mode: 'onChange',
    criteriaMode: 'all',
  });

  const getValues = useMemo(() => {
    return () => ({...form.getValues(), __type: identifier});
  }, [form, integration]);

  finalInformation[integration]= finalInformation[integration] || {};
  finalInformation[integration].posts = value;
  finalInformation[integration].isValid = form.formState.isValid;
  finalInformation[integration].settings = getValues;
  finalInformation[integration].trigger = form.trigger;

  useEffect(() => {
    return () => {
      delete finalInformation[integration];
    };
  }, []);

  return form;
};

export const useSettings = () => useFormContext();
export const getValues = () => finalInformation;
export const resetValues = () => {
  Object.keys(finalInformation).forEach((key) => {
    delete finalInformation[key];
  });
};

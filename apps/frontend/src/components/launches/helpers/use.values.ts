import { useEffect, useMemo } from 'react';
import { useForm, useFormContext } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { IsOptional } from 'class-validator';

class Empty {
  @IsOptional()
  empty: string;
}

const finalInformation = {} as {
  [key: string]: {
    posts: Array<{
      id?: string;
      content: string;
      media?: Array<string>;
    }>;
    settings: () => object;
    trigger: () => Promise<boolean>;
    isValid: boolean;
    checkValidity?: (
      value: Array<
        Array<{
          path: string;
        }>
      >,
      settings: any,
      additionalSettings: any,
    ) => Promise<string | true>;
    maximumCharacters?: number;
  };
};
export const useValues = (
  initialValues: object,
  integration: string,
  identifier: string,
  value: Array<{
    id?: string;
    content: string;
    media?: Array<string>;
  }>,
  dto: any,
  checkValidity?: (
    value: Array<
      Array<{
        path: string;
      }>
    >,
    settings: any,
    additionalSettings: any,
  ) => Promise<string | true>,
  maximumCharacters?: number
) => {

  const form = useForm({
    resolver: classValidatorResolver(dto || Empty),
    values: initialValues,
    mode: 'onChange',
    criteriaMode: 'all',
  });

  const getValues = useMemo(() => {
    return () => ({
      ...form.getValues(),
      __type: identifier,
    });
  }, [form, integration]);

  // @ts-ignore
  finalInformation[integration] = finalInformation[integration] || {};
  finalInformation[integration].posts = value;
  finalInformation[integration].isValid = form.formState.isValid;
  finalInformation[integration].settings = getValues;
  finalInformation[integration].trigger = form.trigger;
  if (checkValidity) {
    finalInformation[integration].checkValidity = checkValidity;
  }
  if (maximumCharacters) {
    finalInformation[integration].maximumCharacters = maximumCharacters;
  }
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

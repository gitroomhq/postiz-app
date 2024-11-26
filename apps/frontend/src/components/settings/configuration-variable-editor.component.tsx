'use client';

import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useMemo } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { SaveConfigurationVariableDto, SaveConfigurationVariablesDto } from '@gitroom/nestjs-libraries/dtos/settings/configuration-variables.dto.ts';

const cvars = [
  {
    key: 'USER_REGISTRATION_ENABLED',
    description: 'Enable user registration',
    datatype: 'bool',
    default: 'true',
    val: 'true',
    section: ['Functionality'],
  },
  {
    key: 'MARKETPLACE_ENABLED',
    description: 'Enable marketplace',
    datatype: 'bool',
    default: 'true',
    val: 'true',
    section: ['Functionality'],
  },
  {
    key: 'DISCORD_CLIENT_ID',
    description: 'Discord client ID',
    datatype: 'string',
    default: null,
    value: null,
    section: ['Providers', 'Discord'],
  },
  {
    key: 'DISCORD_CLIENT_SECRET',
    description: 'Discord client secret',
    datatype: 'string',
    default: null,
    value: null,
    section: ['Providers', 'Discord'],
  },
]

export const ConfigurationVariableEditorComponent = () => {
  const resolver = useMemo(() => classValidatorResolver(SaveConfigurationVariableDto), []);

  const form = useForm({ resolver, values: { message: '' } });

  const { data, mutate } = useFetch(`/configuration-variables/all`);

  const submit: SubmitHandler<SaveConfigurationVariableDto> = async (data) => {
    await fetch(`/configuration-variables/${params.id}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    mutate();
    form.reset();
  }

  return (
    <div>
      <h2 className = "text-[22px] mb-[6px]">Configuration Variable Editor</h2>
      <p className = "mb-[12px]">This screen is only accessible and editable by super admins, it includes configuration that effects the entire app. </p>

      <form onSubmit={form.handleSubmit(submit)}>
        <FormProvider {...form}>

        {cvars.map((cvar) => (
          <div className = "grid grid-cols-2 p-1" key={cvar.key}>
            <div>
              <label className = "">
                <strong className = "font-bold">{cvar.key}</strong>
              </label>
              <p className = "text-customColor18">{cvar.description}</p>
            </div>
            <div className="">
              {cvar.datatype === 'bool' ? ( 
                <input type = "checkbox" name = "" value = "1"></input>
              ) : (
                <input className="bg-input border border-fifth rounded-[4px] text-inputText flex-grow p-1" name="{...form.register(cvar.key)}" value="?" autocomplete="off"></input>
              )}
            </div>
          </div>
        ))}

        </FormProvider>
      </form>
    </div>
  )
}

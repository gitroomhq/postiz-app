'use client';

// import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
// import { useMemo } from 'react';
// import { classValidatorResolver } from '@hookform/resolvers/class-validator';
// import { SaveConfigurationVariableDto, SaveConfigurationVariablesDto } from '@gitroom/nestjs-libraries/dtos/settings/configuration-variables.dto.ts';
import { Button } from '@gitroom/react/form/button'
import { useCallback, useState } from 'react'
import useSWR from 'swr'
import { useFetch } from '@gitroom/helpers/utils/custom.fetch'

export const ConfigurationVariableEditorComponent = () => {
  // const resolver = useMemo(() => classValidatorResolver(SaveConfigurationVariableDto), []);

  const fetch = useFetch();

  // const form = useForm({ resolver, values: { message: '' } });

  const [state, setState] = useState(true);

  const fetchCvars = useCallback(async () => {
    const cvars = await (
      await fetch('/settings/cvars/all', {
        method: 'GET',
      })
    ).json();

    setState(cvars);
    return cvars;
  }, [])

  const { data, error, isLoading } = useSWR('/settings/cvars/all', fetchCvars)

  /*
  const submit: SubmitHandler<SaveConfigurationVariableDto> = async (data) => {
    await fetch(`/settings/cvars/${params.id}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    mutate();
    form.reset();
  }
 */

  if (isLoading) return <div>Loading...</div>
  if (error) return <div className = "text-red-700">Error loading data</div>

  return (
    <div>
      <h3 className = "text-[20px] mb-[6px]">Configuration Variable Editor</h3>
      <p className = "mb-[12px]">This screen is only accessible and editable by super admins, it includes configuration that effects the entire app. </p>

        {data.configurationVariables.map((cvar) => (
          <div className = "grid grid-cols-2 p-1" key={cvar.description}>
            <div>
              <label className = "">
                <strong className = "font-bold"><abbr title = {cvar.key}>{cvar.title}</abbr></strong>
              </label>
              <p className = "text-customColor18">{cvar.description}</p>

              {cvar.docs && (
                <a href = {cvar.docs} target = "_blank" className = "text-customColor4">More docs...</a>
              )}
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

        <Button className = "rounded-[4px]">Save</Button>

    </div>
  )
}

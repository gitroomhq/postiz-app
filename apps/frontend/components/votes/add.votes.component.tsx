import { ChangeEvent, FC, useCallback } from 'react';
import { Input } from '@clickvote/frontend/components/form/input';
import { FormProvider, Resolver, useForm } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { VotesValidation } from '@clickvote/validations';
import { Select } from '@clickvote/frontend/components/form/select';
import { FormContextRender } from '@clickvote/frontend/components/form/form.context.render';
import { useMutation } from '@tanstack/react-query';
import { axiosInstance } from '@clickvote/frontend/helper/axios';
import { useRouter } from 'next/router';
import { Button } from '@clickvote/frontend/components/form/button';
import { toast } from 'react-toastify';
import { RenderComponent } from '@clickvote/frontend/components/votes/render.component';
import { useState } from 'react';

export type VoteValues = {
  _id?: string;
  name: string;
  type: string;
  start: number;
  end: number;
};

const resolver: Resolver<VoteValues> = classValidatorResolver(VotesValidation);

export const AddVotesComponent: FC<{ initialValues?: VoteValues }> = (
  props
) => {
  const router = useRouter();
  const { initialValues } = props;
  const { mutate } = useMutation(
    async (values: VoteValues) =>
      (
        await axiosInstance[initialValues ? 'put' : 'post'](
          `/votes${initialValues ? `/${initialValues._id}` : ``}`,
          {
            name: values.name,
            type: values.type,
            start: values.start,
            end: values.end,
          }
        )
      ).data
  );

  const [err, setErr] = useState('');

  const methods = useForm<VoteValues>({
    mode: 'all',
    values: initialValues || {
      name: '',
      type: '',
      start: 1,
      end: 5,
    },
    resolver,
  });

  const changeEvent = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    event.target.value = event.target.value
      .toLowerCase()
      .replace(/ /g, 'veryverybigspace')
      .replace(/-{2,}/g, '-')
      .replace(/-/g, 'veryverybigspace')
      .replace(/[^A-Za-z']/g, '')
      .replace(/veryverybigspace/g, '-');
  }, []);

  const handleSubmit = methods.handleSubmit((values) => {
    mutate(values, {
      onSuccess: ({ _id }) => {
        toast.success(!initialValues ? 'Vote Created!' : 'Vote Updated!');
        !!_id && router.push(`/votes/${_id}`);
      },
      onError: (err) => {
        setErr('Vote name already exists');
      },
    });
  });

  return (
    <>
      <div className="flex">
        <div className="flex-1">
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit}>
              <Input
                name="name"
                label="Name"
                onChange={changeEvent}
                disabled={!!initialValues}
              />
              <div className="mt-3 mb-3 text-red-500">{err}</div>
              <Select name="type" label="Type" disabled={!!initialValues}>
                <option value="">--Select--</option>
                <option value="single">Single</option>
                <option value="range">Range</option>
              </Select>
              <FormContextRender variablesToWatch={['type']}>
                {({ type }) =>
                  type === 'range' && (
                    <div className="flex space-x-10">
                      <div className="flex-1">
                        <Input
                          name="start"
                          type="number"
                          label="Range From"
                          disabled={!!initialValues}
                          postChange={() => methods.trigger('end')}
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          name="end"
                          type="number"
                          label="Range To"
                          disabled={!!initialValues}
                          postChange={() => methods.trigger('start')}
                        />
                      </div>
                    </div>
                  )
                }
              </FormContextRender>
              {!initialValues && <Button type="submit">Save!</Button>}
            </form>
          </FormProvider>
        </div>
        {!!initialValues && <RenderComponent {...initialValues} />}
      </div>
    </>
  );
};

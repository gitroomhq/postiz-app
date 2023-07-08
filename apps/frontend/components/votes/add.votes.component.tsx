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
        !!_id && router.push(`/votes/${_id}`);
      },
    });
  });

  return (
    <>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit}>
          <Input name="name" label="Name" onChange={changeEvent} />
          <Select name="type" label="Type">
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
                      postChange={() => methods.trigger('end')}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      name="end"
                      type="number"
                      label="Range To"
                      postChange={() => methods.trigger('start')}
                    />
                  </div>
                </div>
              )
            }
          </FormContextRender>
          <input type="submit" value="Submit" className="bg-blue-500 p-5" />
        </form>
      </FormProvider>
    </>
  );
};

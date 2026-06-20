'use client';

import { createContext, useContext } from 'react';
export interface PlugSettings {
  providerId: string;
  name: string;
  identifier: string;
}
export interface PlugInterface extends PlugSettings {
  plugs: PlugsInterface[];
}
export interface FieldsInterface {
  name: string;
  type: string;
  validation: string;
  placeholder: string;
  description: string;
}
export interface PlugsInterface {
  title: string;
  description: string;
  runEveryMilliseconds: number;
  methodName: string;
  fields: FieldsInterface[];
}
export const PlugsContext = createContext<PlugInterface>({
  providerId: '',
  name: '',
  identifier: '',
  plugs: [
    {
      title: '',
      description: '',
      runEveryMilliseconds: 0,
      methodName: '',
      fields: [
        {
          name: '',
          type: '',
          placeholder: '',
          description: '',
          validation: '',
        },
      ],
    },
  ],
});
export const usePlugs = () => useContext(PlugsContext);

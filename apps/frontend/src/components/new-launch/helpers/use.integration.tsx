'use client';

import { createContext, useContext } from 'react';
import dayjs from 'dayjs';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';

const IntegrationContext = createContext<{
  date: dayjs.Dayjs;
  integration: Integrations | undefined;
  allIntegrations: Integrations[];
  value: Array<{
    content: string;
    id?: string;
    image?: Array<{
      path: string;
      id: string;
    }>;
  }>;
}>({
  integration: undefined,
  value: [],
  date: dayjs(),
  allIntegrations: [],
});

const useIntegration = () => useContext(IntegrationContext);
export {IntegrationContext, useIntegration};
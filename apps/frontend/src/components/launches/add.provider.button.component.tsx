'use client';

import { useModals } from '@mantine/modals';
import React, { FC, useCallback, useMemo } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { ApiKeyDto } from '@gitroom/nestjs-libraries/dtos/integrations/api.key.dto';
import { useRouter } from 'next/navigation';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useAddProvider } from "@gitroom/frontend/components/launches/use-add-provider";
import ApiModal from "@gitroom/frontend/components/launches/modal/api-modal";
import UrlModal from "@gitroom/frontend/components/launches/modal/url-modal";
import CloseIcon from "@gitroom/frontend/components/icons/close";
import CustomVariables from "@gitroom/frontend/components/launches/custom-variables";
const resolver = classValidatorResolver(ApiKeyDto);


export const AddProviderButton: FC<{ update?: () => void }> = (props) => {
    const { update } = props;
    const add = useAddProvider(update);
    return (
        <button className="text-white p-[8px] rounded-md bg-forth" onClick={add}>
            Add Channel
        </button>
    );
};

'use client';

import React, {FC} from 'react';
import {classValidatorResolver} from '@hookform/resolvers/class-validator';
import {ApiKeyDto} from '@gitroom/nestjs-libraries/dtos/integrations/api.key.dto';

const resolver = classValidatorResolver(ApiKeyDto);

const renderImage = (identifier: string) => {
    if (identifier === 'youtube') {
        return <img src={`/icons/platforms/youtube.svg`}/>;
    }
    return <img className="w-[32px] h-[32px] rounded-full" src={`/icons/platforms/${identifier}.png`}/>;
};

const SocialLinkItem: FC<{
    identifier: string;
    isExternal: boolean;
    customFields?: Array<{
        key: string;
        label: string;
        validation: string;
        defaultValue?: string;
        type: 'text' | 'password';
    }>;
    name: string;
    onClick: () => void;
}> = ({identifier, isExternal, customFields, name, onClick}) => (
    <div
        key={identifier}
        onClick={onClick}
        className={
            'w-[120px] h-[100px] bg-input text-textColor justify-center items-center flex flex-col gap-[10px] cursor-pointer'
        }
    >
        <div>{renderImage(identifier)}</div>
        <div>{name}</div>
    </div>
);

export default SocialLinkItem;
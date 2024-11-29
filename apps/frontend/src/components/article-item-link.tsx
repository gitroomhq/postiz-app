'use client';

import React, {FC, useCallback} from 'react';

const ArticleItem: FC<{
    identifier: string;
    name: string;
    onClick: () => void;
}> = ({ identifier, name, onClick }) => (
    <div
        key={identifier}
        onClick={onClick}
        className="w-[120px] h-[100px] bg-input text-textColor justify-center items-center flex flex-col gap-[10px] cursor-pointer"
    >
        <div>
            <img
                className="w-[32px] h-[32px] rounded-full"
                src={`/icons/platforms/${identifier}.png`}
            />
        </div>
        <div>{name}</div>
    </div>
);

export default ArticleItem;
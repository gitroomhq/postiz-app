import { FC } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { SetSelectionModalProps } from '../types';

export const SetSelectionModal: FC<SetSelectionModalProps> = ({
    sets,
    onSelect,
    onContinueWithoutSet
}) => {
    const t = useT();

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="text-lg font-medium">
                {t('choose_set_or_continue', 'Choose a set or continue without one')}
            </div>

            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {sets.map((set) => (
                    <div
                        key={set.id}
                        onClick={() => onSelect(set)}
                        className="p-3 border border-tableBorder rounded-lg cursor-pointer hover:bg-customColor31 transition-colors"
                    >
                        <div className="font-medium">{set.name}</div>
                        {set.description && (
                            <div className="text-sm text-gray-400 mt-1">
                                {set.description}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-tableBorder">
                <button
                    onClick={onContinueWithoutSet}
                    className="flex-1 px-4 py-2 bg-customColor31 text-textColor rounded-lg hover:bg-customColor23 transition-colors"
                >
                    {t('continue_without_set', 'Continue without set')}
                </button>
            </div>
        </div>
    );
};

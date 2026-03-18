'use client';
import { __awaiter } from "tslib";
import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import { Button } from "../../../../../../../libraries/react-shared-libraries/src/form/button";
import { useT } from "../../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import { useCustomProviderFunction } from "../../../launches/helpers/use.custom.provider.function";
const SWR_OPTIONS = {
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    revalidateOnFocus: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    revalidateOnReconnect: false,
    refreshInterval: 0,
};
export function withContinueProvider(config) {
    const { endpoint, swrKey, titleKey, titleDefault, emptyStateMessages, getSelectionValue, transformSaveData, renderItem, isSelected, getItemId, } = config;
    return function ContinueProviderComponent(props) {
        const { onSave, existingId, initialData, isSaving } = props;
        const call = useCustomProviderFunction();
        const t = useT();
        const [selection, setSelection] = useState(null);
        const loadData = useCallback(() => __awaiter(this, void 0, void 0, function* () {
            // Skip fetch if initial data was provided
            if (initialData) {
                return initialData;
            }
            try {
                return yield call.get(endpoint);
            }
            catch (e) {
                // Handle error silently
            }
        }), [initialData]);
        const { data, isLoading } = useSWR(initialData ? null : swrKey, loadData, SWR_OPTIONS);
        const resolvedData = initialData || data;
        const handleSelect = useCallback((item) => () => {
            setSelection(getSelectionValue(item));
        }, []);
        const handleSave = useCallback(() => __awaiter(this, void 0, void 0, function* () {
            if (selection) {
                yield onSave(transformSaveData(selection));
            }
        }), [onSave, selection]);
        const filteredData = useMemo(() => {
            return ((resolvedData === null || resolvedData === void 0 ? void 0 : resolvedData.filter((item) => !existingId.includes(getItemId(item)))) || []);
        }, [resolvedData, existingId]);
        if (!isLoading && !(resolvedData === null || resolvedData === void 0 ? void 0 : resolvedData.length)) {
            return (<div className="text-center flex flex-col justify-center items-center text-[18px] leading-[26px] h-[300px]">
          {emptyStateMessages.map((msg, index) => (<span key={msg.key}>
              {t(msg.key, msg.text)}
              {index < emptyStateMessages.length - 1 && (<>
                  <br />
                  <br />
                </>)}
            </span>))}
        </div>);
        }
        return (<div className="flex flex-col gap-[20px]">
        <div>{t(titleKey, titleDefault)}</div>
        <div className="grid grid-cols-3 justify-items-center select-none cursor-pointer gap-[10px]">
          {filteredData.map((item) => (<div key={getItemId(item)} className={clsx('flex flex-col w-full text-center gap-[10px] border border-input p-[10px] hover:bg-seventh rounded-[8px]', isSelected(item, selection) && 'bg-seventh border-primary')} onClick={handleSelect(item)}>
              {renderItem(item, isSelected(item, selection))}
            </div>))}
        </div>
        <div>
          <Button disabled={!selection || isSaving} loading={isSaving} onClick={handleSave}>
            {t('save', 'Save')}
          </Button>
        </div>
      </div>);
    };
}
//# sourceMappingURL=with-continue-provider.js.map
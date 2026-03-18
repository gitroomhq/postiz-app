'use client';
import { __awaiter } from "tslib";
import { useCallback, useState } from 'react';
import { useCustomProviderFunction } from "../../../launches/helpers/use.custom.provider.function";
import { Input } from "../../../../../../../libraries/react-shared-libraries/src/form/input";
import { useDebouncedCallback } from 'use-debounce';
import { useWatch } from 'react-hook-form';
import { useSettings } from "../../../launches/helpers/use.values";
export const Subreddit = (props) => {
    var _a, _b, _c, _d, _e;
    const { onChange, name } = props;
    const state = useSettings();
    const split = name.split('.');
    const [loading, setLoading] = useState(false);
    // @ts-ignore
    const errors = (_d = (_c = (_b = (_a = state === null || state === void 0 ? void 0 : state.formState) === null || _a === void 0 ? void 0 : _a.errors) === null || _b === void 0 ? void 0 : _b[split === null || split === void 0 ? void 0 : split[0]]) === null || _c === void 0 ? void 0 : _c[split === null || split === void 0 ? void 0 : split[1]]) === null || _d === void 0 ? void 0 : _d.value;
    const [results, setResults] = useState([]);
    const func = useCustomProviderFunction();
    const value = useWatch({
        name,
    });
    const [searchValue, setSearchValue] = useState('');
    const setResult = (result) => () => __awaiter(void 0, void 0, void 0, function* () {
        setLoading(true);
        setSearchValue('');
        onChange({
            target: {
                name,
                value: {
                    id: String(result.id),
                    subreddit: result.name,
                    title: '',
                    name: '',
                    url: '',
                    body: '',
                    media: [],
                },
            },
        });
        setLoading(false);
    });
    const setTitle = useCallback((e) => {
        onChange({
            target: {
                name,
                value: Object.assign(Object.assign({}, value), { title: e.target.value }),
            },
        });
    }, [value]);
    const setURL = useCallback((e) => {
        onChange({
            target: {
                name,
                value: Object.assign(Object.assign({}, value), { url: e.target.value }),
            },
        });
    }, [value]);
    const search = useDebouncedCallback(useCallback((e) => __awaiter(void 0, void 0, void 0, function* () {
        // @ts-ignore
        setResults([]);
        // @ts-ignore
        if (!e.target.value) {
            return;
        }
        // @ts-ignore
        const results = yield func.get('subreddits', { word: e.target.value });
        // @ts-ignore
        setResults(results);
    }), []), 500);
    return (<div className="bg-primary p-[20px]">
      {(value === null || value === void 0 ? void 0 : value.subreddit) ? (<>
          <Input error={(_e = errors === null || errors === void 0 ? void 0 : errors.subreddit) === null || _e === void 0 ? void 0 : _e.message} disableForm={true} value={value.subreddit} readOnly={true} label="Channel" name="subreddit"/>
        </>) : (<div className="relative">
          <Input placeholder="Channel" name="search" label="Search Channel" readOnly={loading} value={searchValue} error={errors === null || errors === void 0 ? void 0 : errors.message} disableForm={true} onInput={(e) => __awaiter(void 0, void 0, void 0, function* () {
                // @ts-ignore
                setSearchValue(e.target.value);
                yield search(e);
            })}/>
          {!!results.length && !loading && (<div className="z-[400] w-full absolute bg-input -mt-[20px] outline-none border-fifth border cursor-pointer">
              {results.map((r) => (<div onClick={setResult(r)} key={r.id} className="px-[16px] py-[5px] hover:bg-secondary">
                  {r.name}
                </div>))}
            </div>)}
        </div>)}
    </div>);
};
//# sourceMappingURL=subreddit.js.map
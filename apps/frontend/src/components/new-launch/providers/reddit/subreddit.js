'use client';
import { __awaiter } from "tslib";
import { useCallback, useMemo, useState } from 'react';
import { useCustomProviderFunction } from "../../../launches/helpers/use.custom.provider.function";
import { Input } from "../../../../../../../libraries/react-shared-libraries/src/form/input";
import { useDebouncedCallback } from 'use-debounce';
import { Button } from "../../../../../../../libraries/react-shared-libraries/src/form/button";
import clsx from 'clsx';
import { useWatch } from 'react-hook-form';
import { Select } from "../../../../../../../libraries/react-shared-libraries/src/form/select";
import { useSettings } from "../../../launches/helpers/use.values";
import { Canonical } from "../../../../../../../libraries/react-shared-libraries/src/form/canonical";
import { useIntegration } from "../../../launches/helpers/use.integration";
import { useT } from "../../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import { useLaunchStore } from "../../store";
export const RenderOptions = (props) => {
    const { options, onClick, value } = props;
    const mapValues = useMemo(() => {
        return (options === null || options === void 0 ? void 0 : options.map((p) => ({
            children: (<>
          {p === 'self'
                    ? 'Post'
                    : p === 'link'
                        ? 'Link'
                        : p === 'media'
                            ? 'Media'
                            : ''}
        </>),
            id: p,
            onClick: () => onClick(p),
        }))) || [];
    }, [options]);
    return (<div className="flex">
      {mapValues.map((p) => (<Button className={clsx('flex-1', p.id !== value && 'bg-secondary')} key={p.id} {...p}/>))}
    </div>);
};
export const Subreddit = (props) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const { onChange, name } = props;
    const state = useSettings();
    const t = useT();
    const { date } = useIntegration();
    const dummy = useLaunchStore((state) => state.dummy);
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
        const restrictions = yield func.get('restrictions', {
            subreddit: result.name,
        });
        onChange({
            target: {
                name,
                value: Object.assign(Object.assign({}, restrictions), { type: restrictions.allow[0], media: [] }),
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
    const setType = useCallback((e) => {
        onChange({
            target: {
                name,
                value: Object.assign(Object.assign({}, value), { type: e }),
            },
        });
    }, [value]);
    const setMedia = useCallback((e) => {
        onChange({
            target: {
                name,
                value: Object.assign(Object.assign({}, value), { media: e.target.value.map((p) => p) }),
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
    const setFlair = useCallback((e) => {
        onChange({
            target: {
                name,
                value: Object.assign(Object.assign({}, value), { flair: value.flairs.find((p) => p.id === e.target.value) }),
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
          <Input error={(_e = errors === null || errors === void 0 ? void 0 : errors.subreddit) === null || _e === void 0 ? void 0 : _e.message} disableForm={true} value={value.subreddit} readOnly={true} label="Subreddit" name="subreddit"/>
          <div className="mb-[12px]">
            <RenderOptions value={value.type} options={value.allow} onClick={setType}/>
          </div>
          <Input error={(_f = errors === null || errors === void 0 ? void 0 : errors.title) === null || _f === void 0 ? void 0 : _f.message} value={value.title} disableForm={true} label="Title" name="title" onChange={setTitle}/>
          <Select error={(_g = errors === null || errors === void 0 ? void 0 : errors.flair) === null || _g === void 0 ? void 0 : _g.message} onChange={setFlair} value={(_h = value === null || value === void 0 ? void 0 : value.flair) === null || _h === void 0 ? void 0 : _h.id} disableForm={true} label="Flair" name="flair">
            <option value="">{t('select_flair', '--Select Flair--')}</option>
            {(_j = value === null || value === void 0 ? void 0 : value.flairs) === null || _j === void 0 ? void 0 : _j.map((f) => (<option key={f.name} value={f.id}>
                {f.name}
              </option>))}
          </Select>
          {value.type === 'link' && (<Canonical date={date} error={(_k = errors === null || errors === void 0 ? void 0 : errors.url) === null || _k === void 0 ? void 0 : _k.message} value={value.url} label="URL" name="url" disableForm={true} onChange={setURL}/>)}
        </>) : (<div className="relative">
          <Input placeholder="/r/selfhosted" name="search" label="Search Subreddit" readOnly={loading} value={searchValue} error={errors === null || errors === void 0 ? void 0 : errors.message} disableForm={true} onInput={(e) => __awaiter(void 0, void 0, void 0, function* () {
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
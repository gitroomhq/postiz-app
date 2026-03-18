'use client';
import { __rest } from "tslib";
import { forwardRef, useMemo, } from 'react';
import { clsx } from 'clsx';
import { useFormContext } from 'react-hook-form';
import { TranslatedLabel } from '../translation/translated-label';
export const Select = forwardRef((props, ref) => {
    var _a, _b, _c;
    const { label, className, hideErrors, disableForm, error, extraForm, translationKey, translationParams } = props, rest = __rest(props, ["label", "className", "hideErrors", "disableForm", "error", "extraForm", "translationKey", "translationParams"]);
    const form = useFormContext();
    const err = useMemo(() => {
        var _a, _b, _c;
        if (error)
            return error;
        if (!form || !form.formState.errors[props === null || props === void 0 ? void 0 : props.name])
            return;
        return (_c = (_b = (_a = form === null || form === void 0 ? void 0 : form.formState) === null || _a === void 0 ? void 0 : _a.errors) === null || _b === void 0 ? void 0 : _b[props === null || props === void 0 ? void 0 : props.name]) === null || _c === void 0 ? void 0 : _c.message;
    }, [(_c = (_b = (_a = form === null || form === void 0 ? void 0 : form.formState) === null || _a === void 0 ? void 0 : _a.errors) === null || _b === void 0 ? void 0 : _b[props === null || props === void 0 ? void 0 : props.name]) === null || _c === void 0 ? void 0 : _c.message, error]);
    return (<div className={clsx('flex flex-col', label ? 'gap-[6px]' : '')}>
      <div className={`text-[14px]`}>
        <TranslatedLabel label={label} translationKey={translationKey} translationParams={translationParams}/>
      </div>
      <select ref={ref} {...(disableForm ? {} : form.register(props.name, extraForm))} className={clsx('h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px]', className)} {...rest}/>
      {!hideErrors && (<div className="text-red-400 text-[12px]">{err || <>&nbsp;</>}</div>)}
    </div>);
});
//# sourceMappingURL=select.js.map
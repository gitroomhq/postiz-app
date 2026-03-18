'use client';
import { __rest } from "tslib";
import { useMemo } from 'react';
import clsx from 'clsx';
import { useFormContext } from 'react-hook-form';
import { TranslatedLabel } from '../translation/translated-label';
export const Textarea = (props) => {
    var _a, _b, _c;
    const { label, className, disableForm, error, translationKey, translationParams } = props, rest = __rest(props, ["label", "className", "disableForm", "error", "translationKey", "translationParams"]);
    const form = useFormContext();
    const err = useMemo(() => {
        var _a, _b, _c;
        if (error)
            return error;
        if (!form || !form.formState.errors[props === null || props === void 0 ? void 0 : props.name])
            return;
        return (_c = (_b = (_a = form === null || form === void 0 ? void 0 : form.formState) === null || _a === void 0 ? void 0 : _a.errors) === null || _b === void 0 ? void 0 : _b[props === null || props === void 0 ? void 0 : props.name]) === null || _c === void 0 ? void 0 : _c.message;
    }, [(_c = (_b = (_a = form === null || form === void 0 ? void 0 : form.formState) === null || _a === void 0 ? void 0 : _a.errors) === null || _b === void 0 ? void 0 : _b[props === null || props === void 0 ? void 0 : props.name]) === null || _c === void 0 ? void 0 : _c.message, error]);
    return (<div className={clsx('flex flex-col gap-[6px]', props.disabled && 'opacity-50')}>
      <div className={`text-[14px]`}>
        <TranslatedLabel label={label} translationKey={translationKey} translationParams={translationParams}/>
      </div>
      <textarea {...(disableForm ? {} : form.register(props.name))} className={clsx('bg-input min-h-[150px] p-[16px] outline-none border-fifth border rounded-[4px] text-inputText placeholder-inputText', className)} {...rest}/>
      <div className="text-red-400 text-[12px]">{err || <>&nbsp;</>}</div>
    </div>);
};
//# sourceMappingURL=textarea.js.map
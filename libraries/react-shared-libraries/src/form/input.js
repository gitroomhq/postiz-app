'use client';
import { __rest } from "tslib";
import { useEffect, useMemo, } from 'react';
import { clsx } from 'clsx';
import { useFormContext } from 'react-hook-form';
import { TranslatedLabel } from '../translation/translated-label';
export const Input = (props) => {
    var _a, _b, _c;
    const { label, icon, removeError, customUpdate, className, disableForm, error, translationKey, translationParams } = props, rest = __rest(props, ["label", "icon", "removeError", "customUpdate", "className", "disableForm", "error", "translationKey", "translationParams"]);
    const form = useFormContext();
    const err = useMemo(() => {
        var _a, _b, _c;
        if (error)
            return error;
        if (!form || !form.formState.errors[props === null || props === void 0 ? void 0 : props.name])
            return;
        return (_c = (_b = (_a = form === null || form === void 0 ? void 0 : form.formState) === null || _a === void 0 ? void 0 : _a.errors) === null || _b === void 0 ? void 0 : _b[props === null || props === void 0 ? void 0 : props.name]) === null || _c === void 0 ? void 0 : _c.message;
    }, [(_c = (_b = (_a = form === null || form === void 0 ? void 0 : form.formState) === null || _a === void 0 ? void 0 : _a.errors) === null || _b === void 0 ? void 0 : _b[props === null || props === void 0 ? void 0 : props.name]) === null || _c === void 0 ? void 0 : _c.message, error]);
    const watch = customUpdate ? form === null || form === void 0 ? void 0 : form.watch(props.name) : null;
    useEffect(() => {
        if (customUpdate) {
            customUpdate();
        }
    }, [watch]);
    return (<div className="flex flex-col gap-[6px]">
      {!!label && (<div className={`text-[14px]`}>
          <TranslatedLabel label={label} translationKey={translationKey} translationParams={translationParams}/>
        </div>)}
      <div className={clsx('bg-newBgColorInner h-[42px] border-newTableBorder border rounded-[8px] text-textColor placeholder-textColor flex items-center justify-center', className)}>
        {icon && <div className="ps-[16px]">{icon}</div>}
        <input className={clsx('h-full bg-transparent outline-none flex-1 text-[14px] text-textColor', icon ? 'pl-[8px] pe-[16px]' : 'px-[16px]')} {...(disableForm ? {} : form.register(props.name))} {...rest}/>
      </div>
      {!removeError && (<div className="text-red-400 text-[12px]">{err || <>&nbsp;</>}</div>)}
    </div>);
};
//# sourceMappingURL=input.js.map
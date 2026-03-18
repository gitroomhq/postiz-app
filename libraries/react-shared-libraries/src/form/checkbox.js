'use client';
import { forwardRef, useCallback } from 'react';
import clsx from 'clsx';
import { useFormContext } from 'react-hook-form';
export const Checkbox = forwardRef((props, ref) => {
    const { checked, className, label, disableForm, variant } = props;
    const form = useFormContext();
    const register = disableForm ? {} : form.register(props.name);
    const watch = disableForm ? false : form.watch(props.name);
    const val = watch || checked;
    const changeStatus = useCallback(() => {
        var _a, _b;
        (_a = props === null || props === void 0 ? void 0 : props.onChange) === null || _a === void 0 ? void 0 : _a.call(props, {
            target: {
                name: props.name,
                value: !val,
            },
        });
        if (!disableForm) {
            // @ts-ignore
            (_b = register === null || register === void 0 ? void 0 : register.onChange) === null || _b === void 0 ? void 0 : _b.call(register, {
                target: {
                    name: props.name,
                    value: !val,
                },
            });
        }
    }, [val]);
    return (<div className="flex gap-[10px]">
      <div ref={ref} {...disableForm ? {} : form.register(props.name)} onClick={changeStatus} className={clsx('cursor-pointer rounded-[4px] select-none w-[24px] h-[24px] justify-center items-center flex text-white', variant === 'default' || !variant
            ? 'bg-forth'
            : 'border-customColor1 border-2 bg-customColor2', className)}>
        {val && (<div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>)}
      </div>
      {!!label && <div>{label}</div>}
    </div>);
});
//# sourceMappingURL=checkbox.js.map
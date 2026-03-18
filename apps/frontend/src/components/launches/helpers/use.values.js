import { __decorate, __metadata } from "tslib";
import { useEffect, useMemo } from 'react';
import { useForm, useFormContext } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { IsOptional } from 'class-validator';
class Empty {
}
__decorate([
    IsOptional(),
    __metadata("design:type", String)
], Empty.prototype, "empty", void 0);
const finalInformation = {};
export const useValues = (initialValues, integration, identifier, value, dto, checkValidity, maximumCharacters) => {
    const form = useForm({
        resolver: classValidatorResolver(dto || Empty),
        values: initialValues,
        mode: 'onChange',
        criteriaMode: 'all',
    });
    const getValues = useMemo(() => {
        return () => (Object.assign(Object.assign({}, form.getValues()), { __type: identifier }));
    }, [form, integration]);
    // @ts-ignore
    finalInformation[integration] = finalInformation[integration] || {};
    finalInformation[integration].posts = value;
    finalInformation[integration].isValid = form.formState.isValid;
    finalInformation[integration].settings = getValues;
    finalInformation[integration].trigger = form.trigger;
    if (checkValidity) {
        finalInformation[integration].checkValidity = checkValidity;
    }
    if (maximumCharacters) {
        finalInformation[integration].maximumCharacters = maximumCharacters;
    }
    useEffect(() => {
        return () => {
            delete finalInformation[integration];
        };
    }, []);
    return form;
};
export const useSettings = () => useFormContext();
export const getValues = () => finalInformation;
export const resetValues = () => {
    Object.keys(finalInformation).forEach((key) => {
        delete finalInformation[key];
    });
};
//# sourceMappingURL=use.values.js.map
'use client';
import { __awaiter, __decorate, __metadata } from "tslib";
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { IsOptional } from 'class-validator';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { useLaunchStore } from "../store";
import { useShallow } from 'zustand/react/shallow';
import { GeneralPreviewComponent } from "../../launches/general.preview.component";
import { IntegrationContext } from "../../launches/helpers/use.integration";
import { useT } from "../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import { useFetch } from "../../../../../../libraries/helpers/src/utils/custom.fetch";
import useSWR from 'swr';
import { InternalChannels } from "../../launches/internal.channels";
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import Image from 'next/image';
class Empty {
}
__decorate([
    IsOptional(),
    __metadata("design:type", String)
], Empty.prototype, "empty", void 0);
export var PostComment;
(function (PostComment) {
    PostComment[PostComment["ALL"] = 0] = "ALL";
    PostComment[PostComment["POST"] = 1] = "POST";
    PostComment[PostComment["COMMENT"] = 2] = "COMMENT";
})(PostComment || (PostComment = {}));
export const withProvider = function (params) {
    const { postComment, SettingsComponent, CustomPreviewComponent, dto, checkValidity, maximumCharacters, } = params;
    return forwardRef((props, ref) => {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const t = useT();
        const fetch = useFetch();
        const { current, selectedIntegration, setCurrent, internal, global, date, isGlobal, tab, setTotalChars, justCurrent, allIntegrations, setPostComment, setEditor, dummy, setChars, setComments, setHide, } = useLaunchStore(useShallow((state) => ({
            date: state.date,
            tab: state.tab,
            global: state.global,
            dummy: state.dummy,
            internal: state.internal.find((p) => p.integration.id === props.id),
            integrations: state.selectedIntegrations,
            setHide: state.setHide,
            allIntegrations: state.integrations,
            justCurrent: state.current,
            current: state.current === props.id,
            isGlobal: state.current === 'global',
            setCurrent: state.setCurrent,
            setComments: state.setComments,
            setTotalChars: state.setTotalChars,
            setPostComment: state.setPostComment,
            setEditor: state.setEditor,
            setChars: state.setChars,
            selectedIntegration: state.selectedIntegrations.find((p) => p.integration.id === props.id),
        })));
        useEffect(() => {
            if (!setTotalChars) {
                return;
            }
            setChars(props.id, typeof maximumCharacters === 'number'
                ? maximumCharacters
                : maximumCharacters(JSON.parse(selectedIntegration.integration.additionalSettings || '[]')));
            if (isGlobal) {
                setComments(true);
                setPostComment(PostComment.ALL);
                setTotalChars(0);
                setEditor('normal');
            }
            if (current) {
                setComments(typeof params.comments === 'undefined' ? true : params.comments);
                setEditor(selectedIntegration === null || selectedIntegration === void 0 ? void 0 : selectedIntegration.integration.editor);
                setPostComment(postComment);
                setTotalChars(typeof maximumCharacters === 'number'
                    ? maximumCharacters
                    : maximumCharacters(JSON.parse(selectedIntegration.integration.additionalSettings || '[]')));
            }
        }, [justCurrent, current, isGlobal, setTotalChars]);
        const getInternalPlugs = useCallback(() => __awaiter(this, void 0, void 0, function* () {
            return (yield fetch(`/integrations/${selectedIntegration.integration.identifier}/internal-plugs`)).json();
        }), [selectedIntegration.integration.identifier]);
        const { data, isLoading } = useSWR(`internal-${selectedIntegration.integration.identifier}`, getInternalPlugs, {
            revalidateOnReconnect: true,
        });
        const value = useMemo(() => {
            var _a;
            if ((_a = internal === null || internal === void 0 ? void 0 : internal.integrationValue) === null || _a === void 0 ? void 0 : _a.length) {
                return internal.integrationValue;
            }
            return global;
        }, [internal, global, isGlobal]);
        const form = useForm(Object.assign(Object.assign({ resolver: classValidatorResolver(dto || Empty) }, (Object.keys(selectedIntegration.settings).length > 0
            ? { values: Object.assign({}, selectedIntegration.settings) }
            : {})), { mode: 'all', criteriaMode: 'all', reValidateMode: 'onChange' }));
        useImperativeHandle(ref, () => ({
            isValid: () => __awaiter(this, void 0, void 0, function* () {
                const settings = form.getValues();
                return {
                    id: props.id,
                    identifier: selectedIntegration.integration.identifier,
                    integration: selectedIntegration.integration,
                    valid: yield form.trigger(),
                    err: form.formState.errors,
                    errors: checkValidity
                        ? yield checkValidity(value.map((p) => p.media || []), settings, JSON.parse(selectedIntegration.integration.additionalSettings || '[]'))
                        : true,
                    settings,
                    values: value,
                    maximumCharacters: typeof maximumCharacters === 'number'
                        ? maximumCharacters
                        : maximumCharacters(JSON.parse(selectedIntegration.integration.additionalSettings || '[]')),
                    fix: () => {
                        setCurrent(props.id);
                        setHide(true);
                    },
                    preview: () => {
                        setCurrent(props.id);
                        setHide(true);
                    },
                };
            }),
            getValues: () => {
                return {
                    id: props.id,
                    identifier: selectedIntegration.integration.identifier,
                    values: value,
                    settings: form.getValues(),
                };
            },
            trigger: () => {
                return form.trigger();
            },
        }), [value]);
        return (<IntegrationContext.Provider value={{
                date,
                integration: selectedIntegration.integration,
                allIntegrations,
                value: value.map((p) => ({
                    id: p.id,
                    content: p.content,
                    image: p.media,
                })),
            }}>
        <FormProvider {...form}>
          <div className={clsx('border border-borderPreview rounded-[12px] shadow-previewShadow', !current && 'hidden')}>
            {current &&
                (tab === 0 ||
                    (!SettingsComponent && !((_a = data === null || data === void 0 ? void 0 : data.internalPlugs) === null || _a === void 0 ? void 0 : _a.length))) &&
                !((_c = (_b = value === null || value === void 0 ? void 0 : value[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.length) && (<div>
                  {t('start_writing_your_post', 'Start writing your post for a preview')}
                </div>)}
            {current &&
                (tab === 0 ||
                    (!SettingsComponent && !((_d = data === null || data === void 0 ? void 0 : data.internalPlugs) === null || _d === void 0 ? void 0 : _d.length))) &&
                !!((_f = (_e = value === null || value === void 0 ? void 0 : value[0]) === null || _e === void 0 ? void 0 : _e.content) === null || _f === void 0 ? void 0 : _f.length) &&
                (CustomPreviewComponent ? (<CustomPreviewComponent maximumCharacters={typeof maximumCharacters === 'number'
                        ? maximumCharacters
                        : maximumCharacters(JSON.parse(selectedIntegration.integration
                            .additionalSettings || '[]'))}/>) : (<GeneralPreviewComponent maximumCharacters={typeof maximumCharacters === 'number'
                        ? maximumCharacters
                        : maximumCharacters(JSON.parse(selectedIntegration.integration
                            .additionalSettings || '[]'))}/>))}
            {(SettingsComponent || !!((_g = data === null || data === void 0 ? void 0 : data.internalPlugs) === null || _g === void 0 ? void 0 : _g.length)) &&
                createPortal(<div data-id={props.id} className={isGlobal ? 'bg-newSettings pb-[12px] px-[12px]' : 'hidden bg-newSettings px-[12px] pb-[12px]'}>
                  {isGlobal && (<style>{`#wrapper-settings {display: flex !important} #social-empty {display: block !important;}`}</style>)}
                  {isGlobal && (<div className="flex py-[20px] items-center gap-[15px]">
                      <div className="relative">
                        <Image alt={selectedIntegration === null || selectedIntegration === void 0 ? void 0 : selectedIntegration.integration.name} width={42} height={42} className="min-w-[42px] min-h-[42px] w-[42px] h-[42px] rounded-full" src={selectedIntegration === null || selectedIntegration === void 0 ? void 0 : selectedIntegration.integration.picture}/>
                        <Image alt={selectedIntegration === null || selectedIntegration === void 0 ? void 0 : selectedIntegration.integration.identifier} width={16} height={16} className="rounded-[16px] min-w-[16px] min-h-[16px] w-[16px] h-[16px] absolute bottom-0 end-0" src={`/icons/platforms/${selectedIntegration === null || selectedIntegration === void 0 ? void 0 : selectedIntegration.integration.identifier}.png`}/>
                      </div>
                      <div className="text-[20px]">{selectedIntegration === null || selectedIntegration === void 0 ? void 0 : selectedIntegration.integration.name}</div>
                    </div>)}
                  <SettingsComponent />
                  {!!((_h = data === null || data === void 0 ? void 0 : data.internalPlugs) === null || _h === void 0 ? void 0 : _h.length) && !dummy && (<InternalChannels plugs={data === null || data === void 0 ? void 0 : data.internalPlugs}/>)}
                </div>, document.querySelector('#social-settings') ||
                    document.createElement('div'))}
            {current &&
                !SettingsComponent &&
                createPortal(<style>{`#wrapper-settings {display: none !important;} #social-empty {display: block !important;}`}</style>, document.querySelector('#social-settings') ||
                    document.createElement('div'))}
          </div>
        </FormProvider>
      </IntegrationContext.Provider>);
    });
};
//# sourceMappingURL=high.order.provider.js.map
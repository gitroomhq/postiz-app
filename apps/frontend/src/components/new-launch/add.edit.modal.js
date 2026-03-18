'use client';
import 'reflect-metadata';
import { useLaunchStore } from "./store";
import { useEffect } from 'react';
import { makeId } from "../../../../../libraries/nestjs-libraries/src/services/make.is";
import { ManageModal } from "./manage.modal";
import { useShallow } from 'zustand/react/shallow';
import { useExistingData } from "../launches/helpers/use.existing.data";
import { newDayjs } from "../layout/set.timezone";
export const AddEditModal = (props) => {
    const { setAllIntegrations, setDate, setIsCreateSet, setDummy } = useLaunchStore(useShallow((state) => ({
        setAllIntegrations: state.setAllIntegrations,
        setDate: state.setDate,
        setIsCreateSet: state.setIsCreateSet,
        setDummy: state.setDummy,
    })));
    const integrations = useLaunchStore((state) => state.integrations);
    useEffect(() => {
        setDummy(!!props.dummy);
        setDate(props.date || newDayjs());
        setAllIntegrations(props.allIntegrations || []);
        setIsCreateSet(!!props.addEditSets);
    }, []);
    if (!integrations.length) {
        return null;
    }
    return <AddEditModalInner {...props}/>;
};
export const AddEditModalInner = (props) => {
    const existingData = useExistingData();
    const { addOrRemoveSelectedIntegration, selectedIntegrations, integrations } = useLaunchStore(useShallow((state) => ({
        integrations: state.integrations,
        selectedIntegrations: state.selectedIntegrations,
        addOrRemoveSelectedIntegration: state.addOrRemoveSelectedIntegration,
    })));
    useEffect(() => {
        var _a, _b, _c, _d;
        if ((_b = (_a = props === null || props === void 0 ? void 0 : props.set) === null || _a === void 0 ? void 0 : _a.posts) === null || _b === void 0 ? void 0 : _b.length) {
            for (const post of (_c = props === null || props === void 0 ? void 0 : props.set) === null || _c === void 0 ? void 0 : _c.posts) {
                if (post.integration) {
                    const integration = integrations.find((i) => i.id === post.integration.id);
                    addOrRemoveSelectedIntegration(integration, post.settings);
                }
            }
        }
        if (existingData.integration) {
            const integration = integrations.find((i) => i.id === existingData.integration);
            addOrRemoveSelectedIntegration(integration, existingData.settings);
        }
        if ((_d = props === null || props === void 0 ? void 0 : props.selectedChannels) === null || _d === void 0 ? void 0 : _d.length) {
            for (const channel of props.selectedChannels) {
                const integration = integrations.find((i) => i.id === channel);
                if (integration) {
                    addOrRemoveSelectedIntegration(integration, {});
                }
            }
        }
    }, []);
    if (existingData.integration && selectedIntegrations.length === 0) {
        return null;
    }
    return <AddEditModalInnerInner {...props}/>;
};
export const AddEditModalInnerInner = (props) => {
    const existingData = useExistingData();
    const { reset, addGlobalValue, addInternalValue, global, setCurrent, internal, setTags, setEditor, setRepeater, } = useLaunchStore(useShallow((state) => ({
        reset: state.reset,
        addGlobalValue: state.addGlobalValue,
        addInternalValue: state.addInternalValue,
        setCurrent: state.setCurrent,
        global: state.global,
        internal: state.internal,
        setTags: state.setTags,
        setEditor: state.setEditor,
        setRepeater: state.setRepeater,
    })));
    useEffect(() => {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (existingData.integration) {
            if ((_b = (_a = existingData === null || existingData === void 0 ? void 0 : existingData.posts) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.intervalInDays) {
                setRepeater(existingData.posts[0].intervalInDays);
            }
            setTags(
            // @ts-ignore
            ((_e = (_d = (_c = existingData === null || existingData === void 0 ? void 0 : existingData.posts) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.tags) === null || _e === void 0 ? void 0 : _e.map((p) => ({
                label: p.tag.name,
                value: p.tag.name,
            }))) || []);
            addInternalValue(0, existingData.integration, existingData.posts.map((post) => ({
                delay: post.delay,
                content: post.content.indexOf('<p>') > -1
                    ? post.content
                    : post.content
                        .split('\n')
                        .map((line) => `<p>${line}</p>`)
                        .join(''),
                id: post.id,
                // @ts-ignore
                media: post.image,
            })));
            setCurrent(existingData.integration);
        }
        else {
            setEditor('normal');
        }
        if (props.focusedChannel) {
            setCurrent(props.focusedChannel);
        }
        addGlobalValue(0, ((_f = props.onlyValues) === null || _f === void 0 ? void 0 : _f.length)
            ? props.onlyValues.map((p) => ({
                content: p.content.indexOf('<p>') > -1
                    ? p.content
                    : p.content
                        .split('\n')
                        .map((line) => `<p>${line}</p>`)
                        .join(''),
                id: makeId(10),
                media: p.image || [],
            }))
            : ((_h = (_g = props.set) === null || _g === void 0 ? void 0 : _g.posts) === null || _h === void 0 ? void 0 : _h.length)
                ? props.set.posts[0].value.map((p) => ({
                    id: makeId(10),
                    content: p.content.indexOf('<p>') > -1
                        ? p.content
                        : p.content
                            .split('\n')
                            .map((line) => `<p>${line}</p>`)
                            .join(''),
                    // @ts-ignore
                    media: p.media,
                }))
                : [
                    {
                        content: '',
                        id: makeId(10),
                        media: [],
                    },
                ]);
        return () => {
            reset();
        };
    }, []);
    if (!global.length && !internal.length) {
        return null;
    }
    return (<>
      <style>
        {`#support-discord {display: none !important;}`}
      </style>
      <ManageModal {...props}/>
    </>);
};
//# sourceMappingURL=add.edit.modal.js.map
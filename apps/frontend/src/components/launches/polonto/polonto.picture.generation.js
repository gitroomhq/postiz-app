'use client';
import { __awaiter } from "tslib";
import React, { useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { InputGroup } from '@blueprintjs/core';
import { Clean } from '@blueprintjs/icons';
import { SectionTab } from 'polotno/side-panel';
import { getImageSize } from 'polotno/utils/image';
import { ImagesGrid } from 'polotno/side-panel/images-grid';
import { useFetch } from "../../../../../../libraries/helpers/src/utils/custom.fetch";
import useSWR from 'swr';
import { Button } from "../../../../../../libraries/react-shared-libraries/src/form/button";
import { useToaster } from "../../../../../../libraries/react-shared-libraries/src/toaster/toaster";
import { useVariables } from "../../../../../../libraries/react-shared-libraries/src/helpers/variable.context";
import { useT } from "../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
const GenerateTab = observer(({ store }) => {
    const inputRef = React.useRef(null);
    const [image, setImage] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const { billingEnabled } = useVariables();
    const fetch = useFetch();
    const toast = useToaster();
    const loadCredits = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        if (!billingEnabled) {
            return {
                credits: 1000,
            };
        }
        return (yield fetch(`/copilot/credits`, {
            method: 'GET',
        })).json();
    }), []);
    const { data, mutate } = useSWR('copilot-credits', loadCredits);
    const t = useT();
    const handleGenerate = () => __awaiter(void 0, void 0, void 0, function* () {
        if ((data === null || data === void 0 ? void 0 : data.credits) <= 0) {
            window.open('/billing', '_blank');
            return;
        }
        if (!inputRef.current.value) {
            toast.show('Please type your prompt', 'warning');
            return;
        }
        setLoading(true);
        setImage(null);
        const req = yield fetch(`/media/generate-image`, {
            method: 'POST',
            body: JSON.stringify({
                prompt: inputRef.current.value,
            }),
        });
        setLoading(false);
        if (!req.ok) {
            alert('Something went wrong, please try again later...');
            return;
        }
        mutate();
        const newData = yield req.json();
        setImage(newData.output);
    });
    return (<>
      <div style={{
            height: '40px',
            paddingTop: '5px',
        }}>
        {t('generate_image_with_ai', 'Generate image with AI')}
        {(data === null || data === void 0 ? void 0 : data.credits) ? `(${data === null || data === void 0 ? void 0 : data.credits} left)` : ``}
      </div>
      <InputGroup placeholder="Type your image generation prompt here..." onKeyDown={(e) => {
            if (e.key === 'Enter') {
                handleGenerate();
            }
        }} style={{
            marginBottom: '20px',
        }} inputRef={inputRef}/>
      <Button onClick={handleGenerate} loading={loading} innerClassName="invert" style={{
            marginBottom: '40px',
        }}>
        {(data === null || data === void 0 ? void 0 : data.credits) <= 0 ? 'Click to purchase more credits' : 'Generate'}
      </Button>
      {image && (<ImagesGrid shadowEnabled={false} images={image ? [image] : []} getPreview={(item) => item} isLoading={loading} onSelect={(item, pos, element) => __awaiter(void 0, void 0, void 0, function* () {
                var _a;
                const src = item;
                if (element && element.type === 'svg' && element.contentEditable) {
                    element.set({
                        maskSrc: src,
                    });
                    return;
                }
                if (element &&
                    element.type === 'image' &&
                    element.contentEditable) {
                    element.set({
                        src: src,
                    });
                    return;
                }
                const { width, height } = yield getImageSize(src);
                const x = ((pos === null || pos === void 0 ? void 0 : pos.x) || store.width / 2) - width / 2;
                const y = ((pos === null || pos === void 0 ? void 0 : pos.y) || store.height / 2) - height / 2;
                (_a = store.activePage) === null || _a === void 0 ? void 0 : _a.addElement({
                    type: 'image',
                    src: src,
                    width,
                    height,
                    x,
                    y,
                });
            })} rowsNumber={1}/>)}
    </>);
});
const PictureGeneratorPanel = observer(({ store }) => {
    return (<div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
        }}>
      <GenerateTab store={store}/>
    </div>);
});
// define the new custom section
export const PictureGeneratorSection = {
    name: 'picture-generator-ai',
    Tab: (props) => (<SectionTab name="AI Img" {...props}>
      <Clean />
    </SectionTab>),
    // we need observer to update component automatically on any store changes
    Panel: PictureGeneratorPanel,
};
//# sourceMappingURL=polonto.picture.generation.js.map
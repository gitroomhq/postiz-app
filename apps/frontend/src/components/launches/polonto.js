'use client';
import { __awaiter } from "tslib";
import { createContext, useContext, useEffect, useMemo, useState, } from 'react';
import { createStore } from 'polotno/model/store';
import Workspace from 'polotno/canvas/workspace';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { SidePanel, DEFAULT_SECTIONS } from 'polotno/side-panel';
import Toolbar from 'polotno/toolbar/toolbar';
import ZoomButtons from 'polotno/toolbar/zoom-buttons';
import { Button } from "../../../../../libraries/react-shared-libraries/src/form/button";
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import { PictureGeneratorSection } from "./polonto/polonto.picture.generation";
import { useUser } from "../layout/user.context";
import { loadVars } from "../../../../../libraries/react-shared-libraries/src/helpers/variable.context";
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import { useLaunchStore } from "../new-launch/store";
const store = createStore({
    get key() {
        return loadVars().plontoKey;
    },
    showCredit: false,
});
// @ts-ignore
const CloseContext = createContext({
    close: {},
    setMedia: {},
});
const ActionControls = ({ store }) => {
    const t = useT();
    const close = useContext(CloseContext);
    const [load, setLoad] = useState(false);
    const fetch = useFetch();
    return (<div>
      <Button loading={load} className="outline-none" innerClassName="invert outline-none text-black" onClick={() => __awaiter(void 0, void 0, void 0, function* () {
            setLoad(true);
            const blob = yield store.toBlob();
            const formData = new FormData();
            formData.append('file', blob, 'media.png');
            const data = yield (yield fetch('/media/upload-simple', {
                method: 'POST',
                body: formData,
            })).json();
            close.setMedia([
                {
                    id: data.id,
                    path: data.path,
                },
            ]);
            close.close();
        })}>
        {t('use_this_media', 'Use this media')}
      </Button>
    </div>);
};
const Polonto = (props) => {
    var _a;
    const { setMedia, type, closeModal } = props;
    const setActivateExitButton = useLaunchStore((e) => e.setActivateExitButton);
    useEffect(() => {
        setActivateExitButton(false);
        return () => {
            setActivateExitButton(true);
        };
    }, []);
    const user = useUser();
    const features = useMemo(() => {
        var _a;
        return [
            ...DEFAULT_SECTIONS,
            ...(((_a = user === null || user === void 0 ? void 0 : user.tier) === null || _a === void 0 ? void 0 : _a.image_generator) ? [PictureGeneratorSection] : []),
        ];
    }, [(_a = user === null || user === void 0 ? void 0 : user.tier) === null || _a === void 0 ? void 0 : _a.image_generator]);
    useEffect(() => {
        store.addPage({
            width: props.width || 540,
            height: props.height || 675,
        });
        return () => {
            store.clear();
        };
    }, []);
    return (<div className="bg-white text-black relative z-[400] polonto">
      <CloseContext.Provider value={{
            close: () => closeModal(),
            setMedia,
        }}>
        <PolotnoContainer style={{
            width: '100%',
            height: '700px',
        }}>
          <SidePanelWrap>
            <SidePanel store={store} sections={features}/>
          </SidePanelWrap>
          <WorkspaceWrap>
            <Toolbar store={store} components={{
            ActionControls,
        }}/>
            <Workspace store={store}/>
            <ZoomButtons store={store}/>
          </WorkspaceWrap>
        </PolotnoContainer>
      </CloseContext.Provider>
    </div>);
};
export default Polonto;
//# sourceMappingURL=polonto.js.map
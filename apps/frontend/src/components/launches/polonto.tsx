'use client';

import {
  createContext,
  FC,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { createStore } from 'polotno/model/store';
import Workspace from 'polotno/canvas/workspace';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { SidePanel, DEFAULT_SECTIONS } from 'polotno/side-panel';
import Toolbar from 'polotno/toolbar/toolbar';
import ZoomButtons from 'polotno/toolbar/zoom-buttons';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { PictureGeneratorSection } from '@gitroom/frontend/components/launches/polonto/polonto.picture.generation';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { loadVars } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
const store = createStore({
  get key() {
    return loadVars().plontoKey;
  },
  showCredit: false,
});

// @ts-ignore
const CloseContext = createContext({
  close: {} as any,
  setMedia: {} as any,
});
const ActionControls = ({ store }: any) => {
  const t = useT();
  const close = useContext(CloseContext);
  const [load, setLoad] = useState(false);
  const fetch = useFetch();
  return (
    <div>
      <Button
        loading={load}
        className="outline-none"
        innerClassName="invert outline-none text-black"
        onClick={async () => {
          setLoad(true);
          const blob = await store.toBlob();
          const formData = new FormData();
          formData.append('file', blob, 'media.png');
          const data = await (
            await fetch('/media/upload-simple', {
              method: 'POST',
              body: formData,
            })
          ).json();
          close.setMedia([
            {
              id: data.id,
              path: data.path,
            },
          ]);
          close.close();
        }}
      >
        {t('use_this_media', 'Use this media')}
      </Button>
    </div>
  );
};
const Polonto: FC<{
  setMedia: (params: { id: string; path: string }[]) => void;
  type?: 'image' | 'video';
  closeModal: () => void;
  width?: number;
  height?: number;
}> = (props) => {
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
    return [
      ...DEFAULT_SECTIONS,
      ...(user?.tier?.image_generator ? [PictureGeneratorSection] : []),
    ] as any[];
  }, [user?.tier?.image_generator]);
  useEffect(() => {
    store.addPage({
      width: props.width || 540,
      height: props.height || 675,
    });
    return () => {
      store.clear();
    };
  }, []);
  return (
    <div className="bg-white text-black relative z-[400] polonto">
      <CloseContext.Provider
        value={{
          close: () => closeModal(),
          setMedia,
        }}
      >
        <PolotnoContainer
          style={{
            width: '100%',
            height: '700px',
          }}
        >
          <SidePanelWrap>
            <SidePanel store={store} sections={features} />
          </SidePanelWrap>
          <WorkspaceWrap>
            <Toolbar
              store={store}
              components={{
                ActionControls,
              }}
            />
            <Workspace store={store} />
            <ZoomButtons store={store} />
          </WorkspaceWrap>
        </PolotnoContainer>
      </CloseContext.Provider>
    </div>
  );
};
export default Polonto;

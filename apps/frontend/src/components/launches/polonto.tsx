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

import { ReactComponent as CloseXSvg } from '@gitroom/frontend/assets/close-x.svg';

const store = createStore({
  get key() {
    return loadVars().plontoKey;
  },
  showCredit: false,
});

// @ts-ignore
const CloseContext = createContext({ close: {} as any, setMedia: {} as any });

const ActionControls = ({ store }: any) => {
  const close = useContext(CloseContext);
  const [load, setLoad] = useState(false);
  const fetch = useFetch();
  return (
    <div>
      <Button
        loading={load}
        className="outline-none"
        innerClassName="invert outline-none"
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
          close.setMedia({ id: data.id, path: data.path });
          close.close();
        }}
      >
        Use this media
      </Button>
    </div>
  );
};

const Polonto: FC<{
  setMedia: (params: { id: string; path: string }) => void;
  type?: 'image' | 'video';
  closeModal: () => void;
  width?: number;
  height?: number;
}> = (props) => {
  const { setMedia, type, closeModal } = props;
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
    <div className="fixed left-0 top-0 bg-primary/80 z-[300] w-full min-h-full p-[60px] animate-fade">
      <div className="w-full h-full bg-sixth border-tableBorder border-2 rounded-xl pb-[20px] px-[20px] relative">
        <div className="flex">
          <div className="flex-1">
            <TopTitle title="Design Media" />
          </div>
          <button
            onClick={closeModal}
            className="outline-none absolute right-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root bg-primary hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
            type="button"
          >
            <CloseXSvg />
          </button>
        </div>
        <div className="bg-white text-black relative z-[400] polonto">
          <CloseContext.Provider
            value={{ close: () => closeModal(), setMedia }}
          >
            <PolotnoContainer style={{ width: '100%', height: '1000px' }}>
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
      </div>
    </div>
  );
};

export default Polonto;

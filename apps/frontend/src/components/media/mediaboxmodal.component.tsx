import { FC, useCallback, useEffect, useState } from "react";
import { MediaBox } from "./mediabox.component";
import EventEmitter from "events";

const showModalEmitter = new EventEmitter();

export const showMediaBox = (
  callback: (params: { id: string; path: string }) => void
) => {
  showModalEmitter.emit('show-modal', callback);
};

export const ShowMediaBoxModal: FC = () => {
    const [showModal, setShowModal] = useState(false);
    const [callBack, setCallBack] =
      useState<(params: { id: string; path: string }) => void | undefined>();
  
    const closeModal = useCallback(() => {
      setShowModal(false);
      setCallBack(undefined);
    }, []);
  
    useEffect(() => {
      showModalEmitter.on('show-modal', (cCallback: any) => {
        setShowModal(true);
        setCallBack(() => cCallback);
      });
      return () => {
        showModalEmitter.removeAllListeners('show-modal');
      };
    }, []);
    if (!showModal) return null;
  
    return callBack && (
      <div className="text-textColor">
        <MediaBox setMedia={callBack} closeModal={closeModal} />
      </div>
    );
  };
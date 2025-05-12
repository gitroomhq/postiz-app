import { FC, memo, useCallback, useEffect, useState } from 'react';
import { ProviderInterface } from '@gitroom/extension/providers/provider.interface';

const Comp: FC<{ removeModal: () => void; style: string }> = (props) => {
  useEffect(() => {
    if (document.querySelector('iframe#modal-postiz')) {
      return;
    }

    const div = document.createElement('div');
    div.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.left = '0';
    div.style.zIndex = '9999';
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.border = 'none';
    div.style.overflow = 'hidden';
    document.body.appendChild(div);

    const iframe = document.createElement('iframe');
    iframe.style.backgroundColor = 'transparent';
    // @ts-ignore
    iframe.allowTransparency = 'true';
    iframe.src = import.meta.env.FRONTEND_URL + `/modal/${props.style}`;
    iframe.id = 'modal-postiz';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.zIndex = '9999';
    iframe.style.border = 'none';
    div.appendChild(iframe);

    window.addEventListener('message', (event) => {
      if (event.data.action === 'closeIframe') {
        const iframe = document.querySelector('iframe#modal-postiz');
        if (iframe) {
          props.removeModal();
          div.remove();
        }
      }
    });
  }, []);
  return <></>;
};
export const ActionComponent: FC<{
  target: Node;
  keyIndex: number;
  actionType: string;
  provider: ProviderInterface;
  wrap: boolean;
}> = memo((props) => {
  const { wrap, provider, target, actionType } = props;
  const [modal, showModal] = useState(false);
  const handle = useCallback(async (e: any) => {
    showModal(true);
    e.preventDefault();
    e.stopPropagation();
  }, []);

  useEffect(() => {
    if (document.querySelector('#blockingDiv')) {
      return;
    }

    // @ts-ignore
    const targetInformation = target.getBoundingClientRect();
    const blockingDiv = document.createElement('div');
    blockingDiv.style.position = 'absolute';
    blockingDiv.id = 'blockingDiv';
    blockingDiv.style.cursor = 'pointer';
    blockingDiv.style.top = `${targetInformation.top}px`;
    blockingDiv.style.left = `${targetInformation.left}px`;
    blockingDiv.style.width = `${targetInformation.width}px`;
    blockingDiv.style.height = `${targetInformation.height}px`;
    blockingDiv.style.zIndex = '9999';

    document.body.appendChild(blockingDiv);
    blockingDiv.addEventListener('click', handle);
    return () => {
      blockingDiv.removeEventListener('click', handle);
      blockingDiv.remove();
    };
  }, []);

  return (
    <div className="g-wrapper" style={{ position: 'relative' }}>
      <div className="absolute left-0 top-0 z-[9999] w-full h-full" />
      {modal && (
        <Comp style={provider.style} removeModal={() => showModal(false)} />
      )}
    </div>
  );
});

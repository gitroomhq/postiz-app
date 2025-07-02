import { FC, memo, useCallback, useEffect, useState } from 'react';
import { ProviderInterface } from '@gitroom/extension/providers/provider.interface';
import { fetchCookie } from '@gitroom/extension/utils/load.cookie';

const Comp: FC<{ removeModal: () => void; platform: string; style: string }> = (
  props
) => {
  const load = async () => {
    const cookie = await fetchCookie(`auth`);
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
    iframe.src =
      (import.meta.env?.FRONTEND_URL || process?.env?.FRONTEND_URL) +
      `/modal/${props.style}/${props.platform}?loggedAuth=${cookie}`;
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
  };
  useEffect(() => {
    load();
  }, []);
  return <></>;
};
export const ActionComponent: FC<{
  target: Node;
  keyIndex: number;
  actionType: string;
  provider: ProviderInterface;
  wrap: boolean;
  selector: string;
}> = memo((props) => {
  const { wrap, provider, selector, target, actionType } = props;
  const [modal, showModal] = useState(false);
  const handle = useCallback(async (e: any) => {
    showModal(true);
    e.preventDefault();
    e.stopPropagation();
  }, []);

  useEffect(() => {
    const blockingDiv = document.createElement('div');
    if (document.querySelector(`.${selector}`)) {
      console.log('already exists');
      return;
    }

    setTimeout(() => {
      // @ts-ignore
      const targetInformation = target.getBoundingClientRect();
      blockingDiv.style.position = 'absolute';
      blockingDiv.id = 'blockingDiv';
      blockingDiv.style.cursor = 'pointer';
      blockingDiv.style.top = `${targetInformation.top}px`;
      blockingDiv.style.left = `${targetInformation.left}px`;
      blockingDiv.style.width = `${targetInformation.width}px`;
      blockingDiv.style.height = `${targetInformation.height}px`;
      blockingDiv.style.zIndex = '9999';
      blockingDiv.className = selector;

      document.body.appendChild(blockingDiv);
      blockingDiv.addEventListener('click', handle);
    }, 1000);
    return () => {
      blockingDiv.removeEventListener('click', handle);
      blockingDiv.remove();
    };
  }, []);

  return (
    <div className="g-wrapper" style={{ position: 'relative' }}>
      <div className="absolute start-0 top-0 z-[9999] w-full h-full" />
      {modal && (
        <Comp
          platform={provider.identifier}
          style={provider.style}
          removeModal={() => showModal(false)}
        />
      )}
    </div>
  );
});

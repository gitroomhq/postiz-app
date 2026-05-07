import { FC, useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface LinkModalProps {
  isOpen: boolean;
  defaultText: string;
  onClose: () => void;
  onApply: (text: string, url: string) => void;
}

const LinkModal: FC<LinkModalProps> = ({
  isOpen,
  defaultText,
  onClose,
  onApply,
}) => {
  const t = useT();
  const form = useForm();
  const [text, setText] = useState(defaultText);
  const [url, setUrl] = useState('');

  useEffect(() => {
    setText(defaultText);
  }, [defaultText]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (!url) return;
    onApply(text, url);
    setText('');
    setUrl('');
  };

  const handleClose = () => {
    setText('');
    setUrl('');
    onClose();
  };

  return (
    <FormProvider {...form}>
      <div className="fixed bottom-0 z-50 flex items-center justify-center">
        <div className="bg-black rounded-[10px] shadow-lg p-5 w-[340px] flex flex-col gap-4">
          <h1 className="text-[20px]">{t('insert_link', 'Insert Link')}</h1>

          <div className="flex flex-col gap-1">
            <Input
              type="text"
              label="Display Name"
              disableForm
              icon=""
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('display_text', 'Display Text')}
              className="border border-gray-200 rounded-[6px] px-3 py-2 text-sm outline-none focus:border-gray-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Input
              type="url"
              label="url"
              icon=""
              disableForm
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t('www.example.com')}
              className="border border-gray-200 rounded-[6px] px-3 py-2 text-sm outline-none focus:border-gray-400"
            />
          </div>

          <div className="flex justify-end gap-2 mt-1">
            <Button
              onClick={handleClose}
              className="px-4 py-1.5 rounded-[6px] text-sm text-gray-600 border border-gray-200 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={!url}
              className="px-4 py-1.5 rounded-[6px] text-sm text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Apply
            </Button>
          </div>
        </div>
      </div>
    </FormProvider>
  );
};

export const LinkText: FC<{
  editor: any;
}> = ({ editor }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  // Get the currently selected text from the editor (if any)
  const { from, to } = editor?.state?.selection ?? {};

  const mark = () => {
    const highlighted = editor?.state?.doc?.textBetween(from, to, ' ') ?? '';
    setSelectedText(highlighted);
    setIsModalOpen(true);
  };

  const handleApply = (text: string, url: string) => {
    if (from !== to) {
      // Replace selected text with linked version
      editor?.commands?.setLink({ href: url });
    } else {
      // No selection — insert new linked text at cursor
      editor
        ?.chain()
        ?.focus()
        ?.insertContent(`<a href="${url}" target="_blank">${text || url}</a>`)
        ?.run();
    }

    setIsModalOpen(false);
    setSelectedText('');
  };

  return (
    <>
      <div
        data-tooltip-id="tooltip"
        data-tooltip-content="Insert Link"
        onClick={mark}
        className="select-none cursor-pointer rounded-[6px] w-[30px] h-[30px] bg-newColColor flex justify-center items-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M6.66699 8.66634C6.95299 9.04957 7.31826 9.36768 7.73803 9.59905C8.15780 9.83041 8.62201 9.96953 9.09966 9.99674C9.57732 10.0240 10.0533 9.93863 10.4955 9.75617C10.9378 9.57372 11.3358 9.29844 11.6637 8.94967L13.6637 6.94967C14.2554 6.33301 14.582 5.51301 14.5746 4.66167C14.5673 3.81034 14.2264 2.99567 13.6244 2.38901C13.0224 1.78234 12.2117 1.43567 11.3604 1.42501C10.5091 1.41434 9.69032 1.74101 9.07366 2.33301L7.88032 3.51967"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.33344 7.33301C9.04744 6.94977 8.68217 6.63166 8.26240 6.40030C7.84263 6.16893 7.37842 6.02981 6.90077 6.00260C6.42311 5.97539 5.94707 6.06082 5.50484 6.24327C5.06261 6.42573 4.66457 6.70101 4.33677 7.04967L2.33677 9.04967C1.74511 9.66634 1.41844 10.4863 1.42577 11.3377C1.43311 12.189 1.77400 13.0037 2.37600 13.6103C2.97800 14.217 3.78867 14.5637 4.63999 14.5743C5.49132 14.585 6.31010 14.2583 6.92677 13.6663L8.11344 12.4797"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <LinkModal
        isOpen={isModalOpen}
        defaultText={selectedText}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedText('');
        }}
        onApply={handleApply}
      />
    </>
  );
};

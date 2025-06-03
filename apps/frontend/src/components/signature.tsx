import { FC, useCallback, useState } from 'react';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { SignaturesComponent } from '@gitroom/frontend/components/settings/signatures.component';
import { Transforms } from 'slate';
export const SignatureBox: FC<{
  editor: any;
}> = ({ editor }) => {
  const [showModal, setShowModal] = useState<any>(false);
  const addSignature = useCallback(() => {
    setShowModal(true);
  }, [showModal]);
  const appendValue = (val: string) => {
    Transforms.insertText(editor, '\n' + val);
    setShowModal(false);
  };
  return (
    <>
      {showModal && (
        <SignatureModal
          appendSignature={appendValue}
          close={() => setShowModal(false)}
        />
      )}
      <div
        onClick={addSignature}
        className="select-none cursor-pointer bg-customColor2 w-[40px] p-[5px] text-center rounded-tl-lg rounded-tr-lg"
      >
        <svg
          width="25"
          viewBox="0 0 30 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M28.0007 18.5H7.79447C8.06947 17.9475 8.34572 17.3825 8.61822 16.8087C8.64822 16.7475 8.67697 16.6837 8.70572 16.6262C10.4007 16.4262 12.3032 15.2187 14.3957 13.0137C15.062 14.5212 16.1545 16.1225 17.852 16.4437C18.5082 16.5687 19.5382 16.5425 20.7145 15.7175C21.1274 15.4227 21.5079 15.085 21.8495 14.71C22.8907 15.6625 24.7345 16.5 28.0007 16.5C28.3985 16.5 28.7801 16.3419 29.0614 16.0606C29.3427 15.7793 29.5007 15.3978 29.5007 15C29.5007 14.6021 29.3427 14.2206 29.0614 13.9393C28.7801 13.658 28.3985 13.5 28.0007 13.5C23.9182 13.5 23.5245 12.0487 23.5007 11.925C23.4832 11.5853 23.3508 11.2617 23.1252 11.0072C22.8996 10.7527 22.5942 10.5824 22.2591 10.5243C21.924 10.4661 21.5791 10.5236 21.2809 10.6873C20.9828 10.8509 20.7491 11.1111 20.6182 11.425C19.447 13.1662 18.6682 13.55 18.4107 13.5C17.797 13.3837 16.8545 11.5375 16.4707 9.70122C16.4097 9.40441 16.2602 9.13304 16.0419 8.92284C15.8237 8.71265 15.5468 8.5735 15.2479 8.5237C14.949 8.47391 14.6421 8.51581 14.3674 8.64389C14.0928 8.77197 13.8634 8.98022 13.7095 9.24122C12.4595 10.7887 11.3895 11.8575 10.4995 12.5537C13.1632 5.90497 12.6432 3.48872 11.9332 2.23247C11.3082 1.12372 10.1832 0.509973 8.76322 0.503723H8.72322C6.47322 0.519973 4.66947 2.58622 3.88197 6.03747C3.45072 7.92872 3.38197 10.0225 3.69947 11.78C4.02947 13.6162 4.74072 14.9887 5.77572 15.8075C5.32947 16.73 4.87572 17.6362 4.43197 18.5H2.00072C1.6029 18.5 1.22137 18.658 0.940062 18.9393C0.658758 19.2206 0.500722 19.6021 0.500722 20C0.500722 20.3978 0.658758 20.7793 0.940062 21.0606C1.22137 21.3419 1.6029 21.5 2.00072 21.5H2.83572C1.62572 23.7087 0.730722 25.2 0.710722 25.2262C0.60917 25.395 0.541869 25.5822 0.512665 25.7771C0.483461 25.9719 0.492925 26.1706 0.540517 26.3618C0.588109 26.5529 0.672896 26.7329 0.790035 26.8913C0.907175 27.0497 1.05437 27.1835 1.22322 27.285C1.45751 27.4272 1.72666 27.5016 2.00072 27.5C2.25956 27.5002 2.51405 27.4334 2.73944 27.3061C2.96483 27.1789 3.15346 26.9955 3.28697 26.7737C3.36447 26.6425 4.65322 24.5 6.25072 21.5H28.0007C28.3985 21.5 28.7801 21.3419 29.0614 21.0606C29.3427 20.7793 29.5007 20.3978 29.5007 20C29.5007 19.6021 29.3427 19.2206 29.0614 18.9393C28.7801 18.658 28.3985 18.5 28.0007 18.5ZM23.5007 12C23.5007 11.9775 23.5007 11.955 23.5007 11.9325C23.5026 11.9549 23.5026 11.9775 23.5007 12ZM6.80572 6.70122C7.22197 4.87497 8.05572 3.49997 8.75072 3.49997C9.20947 3.49997 9.28197 3.62497 9.32572 3.70497C9.50447 4.02247 10.1445 5.84122 7.14822 12.805C6.9073 12.3137 6.73968 11.7898 6.65072 11.25C6.40827 9.73793 6.46091 8.19325 6.80572 6.70122Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </>
  );
};
export const SignatureModal: FC<{
  close: () => void;
  appendSignature: (sign: string) => void;
}> = (props) => {
  const { close, appendSignature } = props;
  return (
    <div className="bg-black/40 fixed start-0 top-0 w-full h-full z-[500]">
      <div className="relative w-[900px] mx-auto flex gap-[20px] flex-col flex-1 rounded-[4px] border border-customColor6 bg-sixth p-[16px] pt-0">
        <TopTitle title={`Add signature`} />
        <button
          className="outline-none absolute end-[20px] top-[15px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
          type="button"
        >
          <svg
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            onClick={close}
          >
            <path
              d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            ></path>
          </svg>
        </button>

        <SignaturesComponent appendSignature={appendSignature} />
      </div>
    </div>
  );
};

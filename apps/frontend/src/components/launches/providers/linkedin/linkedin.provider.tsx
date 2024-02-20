import { FC } from 'react';
import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';
import clsx from 'clsx';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useFormatting } from '@gitroom/frontend/components/launches/helpers/use.formatting';

const LinkedinPreview: FC = (props) => {
  const { value: topValue, integration } = useIntegration();
  const newValues = useFormatting(topValue, {
    removeMarkdown: true,
    saveBreaklines: true,
    specialFunc: (text: string) => {
      return text.slice(0, 280);
    },
  });

  return (
    <div className={clsx('max-w-[598px] px-[16px] border border-[#2E3336]')}>
      <div className="w-full h-full relative flex flex-col pt-[12px]">
        {newValues.map((value, index) => (
          <div
            key={`tweet_${index}`}
            className={`flex gap-[8px] pb-[${
              index === topValue.length - 1 ? '12px' : '24px'
            }] relative`}
          >
            <div className="w-[40px] flex flex-col items-center">
              <img
                src={integration?.picture}
                alt="x"
                className="rounded-full relative z-[2]"
              />
              {index !== topValue.length - 1 && (
                <div className="flex-1 w-[2px] h-[calc(100%-10px)] bg-[#2E3336] absolute top-[10px] z-[1]" />
              )}
            </div>
            <div className="flex-1 flex flex-col gap-[4px]">
              <div className="flex">
                <div className="h-[22px] text-[15px] font-[700]">
                  {integration?.name}
                </div>
                <div className="text-[15px] text-[#1D9BF0] mt-[1px] ml-[2px]">
                  <svg
                    viewBox="0 0 22 22"
                    aria-label="Verified account"
                    role="img"
                    className="max-w-[20px] max-h-[20px] fill-current h-[1.25em]"
                    data-testid="icon-verified"
                  >
                    <g>
                      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path>
                    </g>
                  </svg>
                </div>
                <div className="text-[15px] font-[400] text-[#71767b] ml-[4px]">
                  @username
                </div>
              </div>
              <pre>{value.text}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LinkedinSettings: FC = () => {
  return <div>asdfasd</div>;
};

export default withProvider(LinkedinSettings, LinkedinPreview);

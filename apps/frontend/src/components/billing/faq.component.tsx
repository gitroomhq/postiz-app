'use client';

import { FC, useCallback, useState } from 'react';
import clsx from 'clsx';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
const useFaqList = () => {
  const { repositoryUrl } = useVariables();
  const user = useUser();
  const t = useT();
  return [
    ...(user?.allowTrial
      ? [
          {
            title: t(
              'faq_am_i_going_to_be_charged_by_postqueen',
              'Am I going to be charged by PostQueen?'
            ),
            description: t(
              'faq_to_confirm_credit_card_information_postqueen_will_hold',
              'To confirm your credit card a small temporary authorization may be placed and released immediately. You can cancel your subscription anytime from settings without talking to a person'
            ),
          },
        ]
      : []),
    {
      title: t('faq_can_i_trust_postqueen_gitroom', 'Can I trust PostQueen?'),
      description:
        t(
          'faq_postqueen_gitroom_is_proudly_open_source',
          'PostQueen is proudly open-source! We believe in an ethical and transparent culture, meaning that PostQueen will live forever. You can check out the entire code or use it for personal projects.'
        ) +
        (repositoryUrl
          ? ` <a href="${repositoryUrl}" target="_blank" style="text-decoration: underline;">View the source code</a>.`
          : ''),
    },
    {
      title: t('faq_what_are_channels', 'What are channels?'),
      description: t(
        'faq_postqueen_gitroom_allows_you_to_schedule_posts',
        `PostQueen allows you to schedule your posts between different channels.
A channel is a publishing platform where you can schedule your posts.
For example, you can schedule your posts on X, Facebook, Instagram, TikTok, YouTube, Reddit, Linkedin, Dribbble, Threads and Pinterest.`
      ),
    },
    {
      title: t('faq_what_are_team_members', 'What are team members?'),
      description: t(
        'faq_if_you_have_a_team_with_multiple_members',
        'If you have a team with multiple members, you can invite them to your workspace to collaborate on your posts and add their personal channels'
      ),
    },
  ];
};
export const FAQSection: FC<{
  title: string;
  description: string;
  /** The checkout draws the same FAQ one size up (prototype :3667-3682). */
  scale?: 'billing' | 'checkout';
}> = (props) => {
  const { title, description, scale = 'billing' } = props;
  const checkout = scale === 'checkout';
  const [show, setShow] = useState(false);
  const changeShow = useCallback(() => {
    setShow(!show);
  }, [show]);
  return (
    <div
      className={clsx(
        'cursor-pointer bg-pqInner outline outline-1 -outline-offset-1 transition-[outline-color] duration-[140ms] hover:outline-pqBrand',
        checkout ? 'rounded-[18px] p-[24px_26px]' : 'rounded-[14px] p-[19px_22px]',
        show ? 'outline-pqBrand' : 'outline-pqBorder'
      )}
      onClick={changeShow}
    >
      <div className="flex items-center gap-[12px]">
        <div
          className={clsx(
            'min-w-0 flex-1 font-[600] -tracking-[0.01em] text-pqText',
            checkout ? 'text-[18px]' : 'text-[15.5px]'
          )}
        >
          {title}
        </div>
        <div
          className={clsx(
            'grid shrink-0 place-items-center rounded-[8px] transition-transform',
            checkout ? 'size-[28px] duration-[250ms]' : 'size-[26px] duration-[180ms]',
            show
              ? 'rotate-180 bg-pqBrandSoft text-pqBrand'
              : 'bg-pqSettings text-pqSoft'
          )}
        >
          <svg viewBox="0 0 24 24" width={checkout ? 17 : 15} height={checkout ? 17 : 15} fill="none">
            <path
              d="m6 9 6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      {show && (
        <div
          onClick={(e) => {
            e.stopPropagation();
          }}
          className={clsx(
            'text-pqMuted select-text',
            checkout
              ? 'mt-[12px] max-w-[66ch] text-[16px] leading-[1.6]'
              : 'mt-[11px] pe-[38px] text-[14px] leading-[1.7]'
          )}
          dangerouslySetInnerHTML={{
            __html: description,
          }}
        />
      )}
    </div>
  );
};
export const FAQComponent: FC<{
  scale?: 'billing' | 'checkout';
}> = ({ scale = 'billing' }) => {
  const t = useT();
  const list = useFaqList();
  return (
    <div className="mt-[8px] flex flex-col gap-[20px]">
      <h3 className="font-display text-[22px] font-[600] -tracking-[0.018em] text-pqText">
        {t('frequently_asked_questions', 'Frequently asked questions')}
      </h3>
      <div className="flex select-none flex-col gap-[9px]">
        {list.map((item, index) => (
          <FAQSection key={index} scale={scale} {...item} />
        ))}
      </div>
    </div>
  );
};

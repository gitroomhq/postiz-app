'use client';

import { FC, useCallback, useState } from 'react';
import clsx from 'clsx';
import interClass from '@gitroom/react/helpers/inter.font';
import { useVariables } from '@gitroom/react/helpers/variable.context';

import { ReactComponent as PlusSvg } from '@gitroom/frontend/assets/plus.svg';
import { ReactComponent as MinusSvg } from '@gitroom/frontend/assets/minus.svg';

const useFaqList = () => {
  const { isGeneral } = useVariables();
  return [
    {
      title: `Can I trust ${isGeneral ? 'Postiz' : 'Gitroom'}?`,
      description: `${
        isGeneral ? 'Postiz' : 'Gitroom'
      } is proudly open-source! We believe in an ethical and transparent culture, meaning that ${
        isGeneral ? 'Postiz' : 'Gitroom'
      } will live forever. You can check out the entire code or use it for personal projects. To view the open-source repository, <a href="https://github.com/gitroomhq/postiz-app" target="_blank" style="text-decoration: underline;">click here</a>.`,
    },
    {
      title: 'What are channels?',
      description: `${
        isGeneral ? 'Postiz' : 'Gitroom'
      } allows you to schedule your posts between different channels.
A channel is a publishing platform where you can schedule your posts.
For example, you can schedule your posts on X, Facebook, Instagram, TikTok, YouTube, Reddit, Linkedin, Dribbble, Threads and Pinterest.`,
    },
    {
      title: 'What are team members?',
      description: `If you have a team with multiple members, you can invite them to your workspace to collaborate on your posts and add their personal channels`,
    },
    {
      title: 'What is AI auto-complete?',
      description: `We automate ChatGPT to help you write your social posts and articles`,
    },
  ];
};

export const FAQSection: FC<{ title: string; description: string }> = (
  props
) => {
  const { title, description } = props;
  const [show, setShow] = useState(false);

  const changeShow = useCallback(() => {
    setShow(!show);
  }, [show]);

  return (
    <div
      className="bg-sixth p-[24px] border border-tableBorder rounded-[4px] flex flex-col"
      onClick={changeShow}
    >
      <div
        className={`text-[20px] ${interClass} cursor-pointer flex justify-center`}
      >
        <div className="flex-1">{title}</div>
        <div className="flex items-center justify-center w-[32px]">
          {!show ? <PlusSvg /> : <MinusSvg />}
        </div>
      </div>
      <div
        className={clsx(
          'transition-all duration-500 overflow-hidden',
          !show ? 'max-h-[0]' : 'max-h-[500px]'
        )}
      >
        <pre
          onClick={(e) => {
            e.stopPropagation();
          }}
          className={`mt-[16px] w-full text-wrap ${interClass} font-[400] text-[16px] text-customColor17 select-text`}
          dangerouslySetInnerHTML={{ __html: description }}
        />
      </div>
    </div>
  );
};

export const FAQComponent: FC = () => {
  const list = useFaqList();
  return (
    <div>
      <h3 className="text-[24px] text-center mt-[81px] mb-[40px]">
        Frequently Asked Questions
      </h3>
      <div className="gap-[24px] flex-col flex select-none">
        {list.map((item, index) => (
          <FAQSection key={index} {...item} />
        ))}
      </div>
    </div>
  );
};

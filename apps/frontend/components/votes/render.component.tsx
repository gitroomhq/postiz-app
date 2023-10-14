import { FC, useEffect, useMemo, useState } from 'react';
import { VoteValues } from '@clickvote/frontend/components/votes/add.votes.component';
import {
  ClickVoteComponent,
  ClickVoteProvider,
  LikeStyle,
  RangeStyle,
  UpvoteStyle,
} from '@clickvote/react';
import { useUserContext } from '@clickvote/frontend/helper/user.context';
import { UserFromRequest } from '@clickvote/interfaces';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { Button } from '@clickvote/frontend/components/form/button';
import clsx from 'clsx';

const options = {
  single: [
    { name: 'Likes', component: LikeStyle, componentName: 'LikeStyle'},
    { name: 'Upvote', component: UpvoteStyle, componentName: 'UpvoteStyle' },
  ],
  range: [{ name: 'Stars', component: RangeStyle, componentName: 'RangeStyle' }],
};
const componentConverter = (
  style: any,
  info: VoteValues,
  user: UserFromRequest,
  finalComponent: any,
  componentName: string
) => {
  const template = `import {
  ClickVoteComponent,
  ClickVoteProvider,
  ${componentName},
} from '@clickvote/react';

function RenderComponent () {
    return (
      <ClickVoteProvider
        value={{
          apiUrl: "${process.env.NEXT_PUBLIC_WEBSOCKETS_URL}",
          publicKey: "${user.currentEnv.public_key}",
          userId: "USER_ID"
        }}
      >
        <ClickVoteComponent id="${info.name}" voteTo="VOTE_TO">
          {(props) => <${componentName} {...props} />}
        </ClickVoteComponent>
      </ClickVoteProvider>
    );
};
  `;

  const Comp = finalComponent;

  const component = (
    <ClickVoteProvider
      value={{
        apiUrl: process.env.NEXT_PUBLIC_WEBSOCKETS_URL,
        publicKey: user.currentEnv.public_key,
        userId: 'justauserid',
      }}
    >
      <ClickVoteComponent id={info.name} voteTo="justarandomid">
        {(props) => <Comp {...props} />}
      </ClickVoteComponent>
    </ClickVoteProvider>
  );

  return {
    template: (
      <SyntaxHighlighter language="jsx" style={style}>
        {template}
      </SyntaxHighlighter>
    ),
    component,
  };
};

export const RenderComponent: FC<VoteValues> = (params) => {
  const [style, setStyle] = useState<any>(undefined);
  const [currentOption, setCurrentOption] = useState(
    options[params.type as 'single' | 'range'][0]
  );

  useEffect(() => {
    import('react-syntax-highlighter/dist/esm/styles/prism/funky').then((mod) =>
      setStyle(mod.default)
    );
  });
  const { user } = useUserContext();
  const info = useMemo(() => {
    return componentConverter(style, params, user, currentOption.component, currentOption.componentName);
  }, [params, user, style, currentOption]);

  return (
    <div className="ml-10 flex flex-col">
      <div className="flex space-x-3 mb-4">
        {options[params.type as 'single' | 'range'].map((p) => (
          <Button
            className={clsx(
              'flex-1 hover:bg-[#22252D]',
              p.name === currentOption.name
                ? 'bg-[#22252D] border-0 text-[#EDEEF0]'
                : 'bg-transparent border-0 text-[#9FA4AC]'
            )}
            onClick={() => setCurrentOption(p)}
            key={p.name}
          >
            {p.name}
          </Button>
        ))}
      </div>
      <div>Run:</div>
      <div className="border border-white/50 rounded-xl my-5">
        <SyntaxHighlighter language="bash" style={style}>
          npm i @clickvote/react
        </SyntaxHighlighter>
      </div>
      <div>Code Snippet:</div>
      <div className="border border-white/50 rounded-xl my-5">
        {info.template}
      </div>
      <div className="mb-5">Example:</div>
      {info.component}
    </div>
  );
};

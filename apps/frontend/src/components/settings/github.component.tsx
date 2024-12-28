'use client';
import Image from 'next/image';
import { Button } from '@gitroom/react/form/button';
import { FC, useCallback, useEffect, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { Input } from '@gitroom/react/form/input';
import { useToaster } from '@gitroom/react/toaster/toaster';
import interClass from '@gitroom/react/helpers/inter.font';
import { useTranslations } from 'next-intl';

const ConnectedComponent: FC<{
  id: string;
  login: string;
  deleteRepository: () => void;
}> = (props) => {
  const { id, login, deleteRepository } = props;  
  const t = useTranslations("Settings.Github");
  const fetch = useFetch();
  const disconnect = useCallback(async () => {
    if (
      !(await deleteDialog(
        t("AreYouSureYouWantToDisconnectThisRepository")
      ))
    ) {
      return;
    }
    deleteRepository();
    await fetch(`/settings/repository/${id}`, {
      method: 'DELETE',
    });
  }, []);
  return (
    <div className="my-[16px] mt-[16px] h-[90px] bg-sixth border-fifth border rounded-[4px] p-[24px]">
      <div className={`flex items-center gap-[8px] ${interClass}`}>
        <div>
          <Image src="/icons/github.svg" alt="GitHub" width={40} height={40} />
        </div>
        <div className="flex-1">
          <strong>{t("Connected")}:</strong> {login}
        </div>
        <Button onClick={disconnect}>{t("Disconnect")}</Button>
      </div>
    </div>
  );
};

const ConnectComponent: FC<{
  setConnected: (name: string) => void;
  id: string;
  login: string;
  organizations: Array<{ id: string; login: string }>;
  deleteRepository: () => void;
}> = (props) => {
  const { id, setConnected, deleteRepository } = props;
  const [url, setUrl] = useState('');
  const fetch = useFetch();
  const toast = useToaster(); 
  const t = useTranslations("Settings.Github");

  const cancelConnection = useCallback(async () => {
    await (
      await fetch(`/settings/repository/${id}`, {
        method: 'DELETE',
      })
    ).json();

    deleteRepository();
  }, []);

  const completeConnection = useCallback(async () => {
    const [select, repo] = url
      .match(/https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/)!
      .slice(1);

    const response = await fetch(`/settings/organizations/${id}`, {
      method: 'POST',
      body: JSON.stringify({ login: `${select}/${repo}` }),
    });

    if (response.status === 404) {
      toast.show(t('RepositoryNotFound'), 'warning');
      return ;
    }


    setConnected(`${select}/${repo}`);
  }, [url]);

  return (
    <div className="my-[16px] mt-[16px] h-[100px] bg-sixth border-fifth border rounded-[4px] px-[24px] flex">
      <div className={`flex items-center gap-[8px] ${interClass} flex-1`}>
        <div>
          <Image src="/icons/github.svg" alt="GitHub" width={40} height={40} />
        </div>
        <div className="flex-1">{t("ConnectYourRepository")}</div>
        <Button
          className="bg-transparent border-0 text-gray mt-[7px]"
          onClick={cancelConnection}
        >
          {t("Cancel")}
        </Button>
        <Input
          value={url}
          disableForm={true}
          removeError={true}
          onChange={(e) => setUrl(e.target.value)}
          name="github"
          label=""
          placeholder={t("FullGitHubURL")}
        />
        <Button
          className="h-[44px] mt-[7px]"
          disabled={
            !url.match(
              /https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/
            )
          }
          onClick={completeConnection}
        >
          {t("Connect")}
        </Button>
      </div>
    </div>
  );
};

export const GithubComponent: FC<{
  organizations: Array<{ login: string; id: string }>;
  github: Array<{ id: string; login: string }>;
}> = (props) => {
  if (typeof window !== 'undefined' && window.opener) {
    window.close();
  } 
  const t = useTranslations("Settings.Github");
  const { github, organizations } = props;
  const [githubState, setGithubState] = useState(github);
  useEffect(() => {
    setGithubState(github);
  }, [github]);
  const fetch = useFetch();

  const connect = useCallback(async () => {
    const { url } = await (await fetch('/settings/github/url')).json();
    window.open(url, "Github Connect", "width=700,height=700");
  }, []);

  const setConnected = useCallback(
    (g: { id: string; login: string }) => (name: string) => {
      setGithubState((gitlibs) => {
        return gitlibs.map((git, index) => {
          if (git.id === g.id) {
            return { id: g.id, login: name };
          }
          return git;
        });
      });
    },
    [githubState]
  );

  const deleteConnect = useCallback(
    (g: { id: string; login: string }) => () => {
      setGithubState((gitlibs) => {
        return gitlibs.filter((git, index) => {
          return git.id !== g.id;
        });
      });
    },
    [githubState]
  );

  return (
    <>
      {githubState.map((g) => (
        <>
          {!g.login ? (
            <ConnectComponent
              deleteRepository={deleteConnect(g)}
              setConnected={setConnected(g)}
              organizations={organizations}
              {...g}
            />
          ) : (
            <ConnectedComponent deleteRepository={deleteConnect(g)} {...g} />
          )}
        </>
      ))}
      {githubState.filter((f) => !f.login).length === 0 && (
        <div className="my-[16px] mt-[16px] h-[90px] bg-sixth border-fifth border rounded-[4px] p-[24px]">
          <div className={`flex items-center gap-[8px] ${interClass}`}>
            <div>
              <Image
                src="/icons/github.svg"
                alt="GitHub"
                width={40}
                height={40}
              />
            </div>
            <div className="flex-1">{t("ConnectYourRepository")}</div>
            <Button onClick={connect}>{t("Connect")}</Button>
          </div>
        </div>
      )}
    </>
  );
};

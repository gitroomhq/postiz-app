'use client';
import Image from 'next/image';
import { Button } from '@gitroom/react/form/button';
import { FC, useCallback, useEffect, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { Input } from '@gitroom/react/form/input';
import { useToaster } from '@gitroom/react/toaster/toaster';

const ConnectedComponent: FC<{
  id: string;
  login: string;
  deleteRepository: () => void;
}> = (props) => {
  const { id, login, deleteRepository } = props;
  const fetch = useFetch();
  const disconnect = useCallback(async () => {
    if (
      !(await deleteDialog(
        'Are you sure you want to disconnect this repository?'
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
      <div className="flex items-center gap-[8px] font-[Inter]">
        <div>
          <Image src="/icons/github.svg" alt="GitHub" width={40} height={40} />
        </div>
        <div className="flex-1">
          <strong>Connected:</strong> {login}
        </div>
        <Button onClick={disconnect}>Disconnect</Button>
      </div>
    </div>
  );
};

const RepositoryComponent: FC<{
  id: string;
  login?: string;
  setRepo: (name: string) => void;
}> = (props) => {
  const { setRepo, login, id } = props;
  const [repositories, setRepositories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const fetch = useFetch();

  const loadRepositories = useCallback(async () => {
    const { repositories: repolist } = await (
      await fetch(`/settings/organizations/${id}/${login}`)
    ).json();
    setRepositories(repolist);
  }, [login, id]);

  useEffect(() => {
    setRepositories([]);
    if (!login) {
      return;
    }

    loadRepositories();
  }, [login]);
  if (!login || !repositories.length) {
    return <></>;
  }

  return (
    <select
      className="border border-fifth bg-transparent h-[40px]"
      onChange={(e) => setRepo(e.target.value)}
    >
      <option value="">Choose a repository</option>
      {repositories.map((o) => (
        <option key={o.id} value={o.name}>
          {o.name}
        </option>
      ))}
    </select>
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
      toast.show('Repository not found', 'warning');
      return ;
    }

    setConnected(`${select}/${repo}`);
  }, [url]);

  return (
    <div className="my-[16px] mt-[16px] h-[100px] bg-sixth border-fifth border rounded-[4px] px-[24px] flex">
      <div className="flex items-center gap-[8px] font-[Inter] flex-1">
        <div>
          <Image src="/icons/github.svg" alt="GitHub" width={40} height={40} />
        </div>
        <div className="flex-1">Connect your repository</div>
        <Button
          className="bg-transparent border-0 text-gray mt-[7px]"
          onClick={cancelConnection}
        >
          Cancel
        </Button>
        <Input
          value={url}
          disableForm={true}
          removeError={true}
          onChange={(e) => setUrl(e.target.value)}
          name="github"
          label=""
          placeholder="Full GitHub URL"
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
          Connect
        </Button>
      </div>
    </div>
  );
};

export const GithubComponent: FC<{
  organizations: Array<{ login: string; id: string }>;
  github: Array<{ id: string; login: string }>;
}> = (props) => {
  const { github, organizations } = props;
  const [githubState, setGithubState] = useState(github);
  const fetch = useFetch();
  const connect = useCallback(async () => {
    const { url } = await (await fetch('/settings/github/url')).json();
    window.location.href = url;
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
          <div className="flex items-center gap-[8px] font-[Inter]">
            <div>
              <Image
                src="/icons/github.svg"
                alt="GitHub"
                width={40}
                height={40}
              />
            </div>
            <div className="flex-1">Connect your repository</div>
            <Button onClick={connect}>Connect</Button>
          </div>
        </div>
      )}
    </>
  );
};

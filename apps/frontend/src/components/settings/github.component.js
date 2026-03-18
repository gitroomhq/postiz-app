'use client';
import { __awaiter } from "tslib";
import Image from 'next/image';
import { Button } from "../../../../../libraries/react-shared-libraries/src/form/button";
import { useCallback, useEffect, useState } from 'react';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import { deleteDialog } from "../../../../../libraries/react-shared-libraries/src/helpers/delete.dialog";
import { Input } from "../../../../../libraries/react-shared-libraries/src/form/input";
import { useToaster } from "../../../../../libraries/react-shared-libraries/src/toaster/toaster";
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
const ConnectedComponent = (props) => {
    const { id, login, deleteRepository } = props;
    const fetch = useFetch();
    const disconnect = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        if (!(yield deleteDialog('Are you sure you want to disconnect this repository?'))) {
            return;
        }
        deleteRepository();
        yield fetch(`/settings/repository/${id}`, {
            method: 'DELETE',
        });
    }), []);
    const t = useT();
    return (<div className="my-[16px] mt-[16px] h-[90px] bg-sixth border-fifth border rounded-[4px] p-[24px]">
      <div className={`flex items-center gap-[8px]`}>
        <div>
          <Image src="/icons/github.svg" alt="GitHub" width={40} height={40}/>
        </div>
        <div className="flex-1">
          <strong>{t('connected', 'Connected:')}</strong> {login}
        </div>
        <Button onClick={disconnect}>{t('disconnect', 'Disconnect')}</Button>
      </div>
    </div>);
};
const ConnectComponent = (props) => {
    const { id, setConnected, deleteRepository } = props;
    const [url, setUrl] = useState('');
    const fetch = useFetch();
    const toast = useToaster();
    const cancelConnection = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        yield (yield fetch(`/settings/repository/${id}`, {
            method: 'DELETE',
        })).json();
        deleteRepository();
    }), []);
    const completeConnection = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        const [select, repo] = url
            .match(/https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/)
            .slice(1);
        const response = yield fetch(`/settings/organizations/${id}`, {
            method: 'POST',
            body: JSON.stringify({
                login: `${select}/${repo}`,
            }),
        });
        if (response.status === 404) {
            toast.show('Repository not found', 'warning');
            return;
        }
        setConnected(`${select}/${repo}`);
    }), [url]);
    const t = useT();
    return (<div className="my-[16px] mt-[16px] h-[100px] bg-sixth border-fifth border rounded-[4px] px-[24px] flex">
      <div className={`flex items-center gap-[8px] flex-1`}>
        <div>
          <Image src="/icons/github.svg" alt="GitHub" width={40} height={40}/>
        </div>
        <div className="flex-1">
          {t('connect_your_repository', 'Connect your repository')}
        </div>
        <Button className="bg-transparent border-0 text-gray mt-[7px]" onClick={cancelConnection}>
          {t('cancel', 'Cancel')}
        </Button>
        <Input value={url} disableForm={true} removeError={true} onChange={(e) => setUrl(e.target.value)} name="github" label="" placeholder="Full GitHub URL"/>
        <Button className="h-[44px] mt-[7px]" disabled={!url.match(/https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/)} onClick={completeConnection}>
          {t('connect', 'Connect')}
        </Button>
      </div>
    </div>);
};
export const GithubComponent = (props) => {
    if (typeof window !== 'undefined' && window.opener) {
        window.close();
    }
    const { github, organizations } = props;
    const [githubState, setGithubState] = useState(github);
    useEffect(() => {
        setGithubState(github);
    }, [github]);
    const fetch = useFetch();
    const connect = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        const { url } = yield (yield fetch('/settings/github/url')).json();
        window.open(url, 'Github Connect', 'width=700,height=700');
    }), []);
    const setConnected = useCallback((g) => (name) => {
        setGithubState((gitlibs) => {
            return gitlibs.map((git, index) => {
                if (git.id === g.id) {
                    return {
                        id: g.id,
                        login: name,
                    };
                }
                return git;
            });
        });
    }, [githubState]);
    const deleteConnect = useCallback((g) => () => {
        setGithubState((gitlibs) => {
            return gitlibs.filter((git, index) => {
                return git.id !== g.id;
            });
        });
    }, [githubState]);
    const t = useT();
    return (<>
      {githubState.map((g) => (<>
          {!g.login ? (<ConnectComponent deleteRepository={deleteConnect(g)} setConnected={setConnected(g)} organizations={organizations} {...g}/>) : (<ConnectedComponent deleteRepository={deleteConnect(g)} {...g}/>)}
        </>))}
      {githubState.filter((f) => !f.login).length === 0 && (<div className="my-[16px] mt-[16px] h-[90px] bg-sixth border-fifth border rounded-[4px] p-[24px]">
          <div className={`flex items-center gap-[8px]`}>
            <div>
              <Image src="/icons/github.svg" alt="GitHub" width={40} height={40}/>
            </div>
            <div className="flex-1">
              {t('connect_your_repository', 'Connect your repository')}
            </div>
            <Button onClick={connect}>{t('connect', 'Connect')}</Button>
          </div>
        </div>)}
    </>);
};
//# sourceMappingURL=github.component.js.map
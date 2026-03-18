'use client';
import { __awaiter } from "tslib";
import { useCallback, useState } from 'react';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import useSWR from 'swr';
import { Button } from "../../../../../libraries/react-shared-libraries/src/form/button";
import { useToaster } from "../../../../../libraries/react-shared-libraries/src/toaster/toaster";
import { useDecisionModal, useModals } from "../layout/new-modal";
import { MediaBox } from "../media/media.component";
import copy from 'copy-to-clipboard';
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
const useOAuthApp = () => {
    const fetch = useFetch();
    const load = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield fetch('/user/oauth-app');
        const text = yield res.text();
        if (!text || text === 'null' || text === 'false') {
            return null;
        }
        return JSON.parse(text);
    }), []);
    return useSWR('oauth-app', load, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
    });
};
export const DeveloperComponent = () => {
    var _a, _b, _c;
    const fetch = useFetch();
    const toaster = useToaster();
    const decision = useDecisionModal();
    const modals = useModals();
    const t = useT();
    const { data: app, mutate } = useOAuthApp();
    const [plaintextSecret, setPlaintextSecret] = useState(null);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [redirectUrl, setRedirectUrl] = useState('');
    const [pictureId, setPictureId] = useState(undefined);
    const [picturePath, setPicturePath] = useState(undefined);
    const startEditing = useCallback(() => {
        var _a;
        if (!app)
            return;
        setName(app.name || '');
        setDescription(app.description || '');
        setRedirectUrl(app.redirectUrl || '');
        setPictureId(app.pictureId || undefined);
        setPicturePath(((_a = app.picture) === null || _a === void 0 ? void 0 : _a.path) || undefined);
        setEditing(true);
    }, [app]);
    const changeMedia = useCallback((selected) => {
        const media = Array.isArray(selected) ? selected[0] : selected;
        if (media) {
            setPictureId(media.id);
            setPicturePath(media.path);
        }
    }, []);
    const openMedia = useCallback(() => {
        modals.openModal({
            title: t('media_library', 'Media Library'),
            askClose: false,
            closeOnEscape: true,
            fullScreen: true,
            size: 'calc(100% - 80px)',
            height: 'calc(100% - 80px)',
            children: (close) => (<MediaBox setMedia={changeMedia} closeModal={close}/>),
        });
    }, [modals, t, changeMedia]);
    const createApp = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        if (!name || !redirectUrl) {
            toaster.show('Name and Redirect URL are required', 'warning');
            return;
        }
        try {
            const result = yield (yield fetch('/user/oauth-app', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    description,
                    redirectUrl,
                    pictureId,
                }),
            })).json();
            if (result.clientSecret) {
                setPlaintextSecret(result.clientSecret);
                toaster.show('App created! Copy your client secret now - it will only be shown once.', 'success');
            }
            setCreating(false);
            mutate();
        }
        catch (_a) {
            toaster.show('Failed to create app', 'warning');
        }
    }), [name, description, redirectUrl, pictureId]);
    const updateApp = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield fetch('/user/oauth-app', {
                method: 'PUT',
                body: JSON.stringify({
                    name,
                    description,
                    redirectUrl,
                    pictureId,
                }),
            });
            toaster.show('App updated', 'success');
            setEditing(false);
            mutate();
        }
        catch (_a) {
            toaster.show('Failed to update app', 'warning');
        }
    }), [name, description, redirectUrl, pictureId]);
    const rotateSecret = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        const approved = yield decision.open({
            title: 'Rotate Client Secret?',
            description: 'This will generate a new client secret and invalidate the current one. Any integrations using the old secret will stop working.',
            approveLabel: 'Rotate',
            cancelLabel: 'Cancel',
        });
        if (!approved)
            return;
        try {
            const result = yield (yield fetch('/user/oauth-app/rotate-secret', { method: 'POST' })).json();
            if (result.clientSecret) {
                setPlaintextSecret(result.clientSecret);
                toaster.show('Secret rotated! Copy your new client secret now.', 'success');
                mutate();
            }
        }
        catch (_a) {
            toaster.show('Failed to rotate secret', 'warning');
        }
    }), [decision]);
    const deleteApp = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        const approved = yield decision.open({
            title: 'Delete OAuth App?',
            description: 'This will delete the OAuth application and revoke all user authorizations. This action cannot be undone.',
            approveLabel: 'Delete',
            cancelLabel: 'Cancel',
        });
        if (!approved)
            return;
        try {
            yield fetch('/user/oauth-app', { method: 'DELETE' });
            toaster.show('OAuth app deleted', 'success');
            setPlaintextSecret(null);
            mutate();
        }
        catch (_a) {
            toaster.show('Failed to delete app', 'warning');
        }
    }), [decision]);
    const copyToClipboard = useCallback((text, label) => {
        copy(text);
        toaster.show(`${label} copied to clipboard`, 'success');
    }, []);
    if (app === undefined) {
        return null;
    }
    if (!app && !creating) {
        return (<div className="flex flex-col gap-[20px]">
        <div className="flex flex-col">
          <h3 className="text-[20px]">{t('developer', 'Developer')}</h3>
          <div className="text-customColor18 mt-[4px]">
            {t('create_an_oauth_application', 'Create an OAuth application to allow third-party integrations with Postiz on behalf of your users.')}
            <br />
            <a className="underline hover:font-bold hover:underline" href="https://docs.postiz.com/public-api/oauth" target="_blank">
              {t('read_the_oauth_documentation', 'Read the OAuth documentation.')}
            </a>
          </div>
          <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px]">
            <Button onClick={() => setCreating(true)}>
              {t('create_oauth_app', 'Create OAuth App')}
            </Button>
          </div>
        </div>
      </div>);
    }
    if (creating && !app) {
        return (<div className="flex flex-col gap-[20px]">
        <div className="flex flex-col">
          <h3 className="text-[20px]">
            {t('create_oauth_app', 'Create OAuth App')}
          </h3>
          <div className="text-customColor18 mt-[4px]">
            {t('fill_in_the_details_for_your_oauth_application', 'Fill in the details for your OAuth application.')}
          </div>
        </div>
        <div className="bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[4px]">
            <label className="text-[14px]">{t('app_name', 'App Name')} *</label>
            <input className="bg-input border border-fifth rounded-[4px] p-[8px] text-textColor outline-none" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Application" maxLength={100}/>
          </div>
          <div className="flex flex-col gap-[4px]">
            <label className="text-[14px]">
              {t('description', 'Description')}
            </label>
            <textarea className="bg-input border border-fifth rounded-[4px] p-[8px] text-textColor outline-none min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what your app does" maxLength={500}/>
          </div>
          <div className="flex flex-col gap-[4px]">
            <label className="text-[14px]">
              {t('profile_picture', 'Profile Picture')}
            </label>
            <div className="flex items-center gap-[12px]">
              {picturePath ? (<img src={picturePath} alt="App picture" className="w-[48px] h-[48px] rounded-full object-cover"/>) : (<div className="w-[48px] h-[48px] rounded-full bg-fifth flex items-center justify-center text-customColor18">
                  ?
                </div>)}
              <Button onClick={openMedia}>
                {t('choose_image', 'Choose Image')}
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-[4px]">
            <label className="text-[14px]">
              {t('redirect_url', 'Redirect URL')} *
            </label>
            <input className="bg-input border border-fifth rounded-[4px] p-[8px] text-textColor outline-none" value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="https://yourapp.com/callback"/>
          </div>
          <div className="flex gap-[10px]">
            <Button onClick={createApp}>
              {t('create', 'Create')}
            </Button>
            <Button onClick={() => setCreating(false)}>
              {t('cancel', 'Cancel')}
            </Button>
          </div>
        </div>
      </div>);
    }
    return (<div className="flex flex-col gap-[20px]">
      <div className="flex flex-col">
        <h3 className="text-[20px]">{t('developer', 'Developer')}</h3>
        <div className="text-customColor18 mt-[4px]">
          {t('manage_your_oauth_application', 'Manage your OAuth application for third-party integrations.')}
          <br />
          <a className="underline hover:font-bold hover:underline" href="https://docs.postiz.com/public-api/oauth" target="_blank">
            {t('read_the_oauth_documentation', 'Read the OAuth documentation.')}
          </a>
        </div>
      </div>

      {editing ? (<div className="bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[4px]">
            <label className="text-[14px]">{t('app_name', 'App Name')} *</label>
            <input className="bg-input border border-fifth rounded-[4px] p-[8px] text-textColor outline-none" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Application" maxLength={100}/>
          </div>
          <div className="flex flex-col gap-[4px]">
            <label className="text-[14px]">
              {t('description', 'Description')}
            </label>
            <textarea className="bg-input border border-fifth rounded-[4px] p-[8px] text-textColor outline-none min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what your app does" maxLength={500}/>
          </div>
          <div className="flex flex-col gap-[4px]">
            <label className="text-[14px]">
              {t('profile_picture', 'Profile Picture')}
            </label>
            <div className="flex items-center gap-[12px]">
              {picturePath ? (<img src={picturePath} alt="App picture" className="w-[48px] h-[48px] rounded-full object-cover"/>) : (<div className="w-[48px] h-[48px] rounded-full bg-fifth flex items-center justify-center text-customColor18">
                  ?
                </div>)}
              <Button onClick={openMedia}>
                {t('choose_image', 'Choose Image')}
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-[4px]">
            <label className="text-[14px]">
              {t('redirect_url', 'Redirect URL')} *
            </label>
            <input className="bg-input border border-fifth rounded-[4px] p-[8px] text-textColor outline-none" value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="https://yourapp.com/callback"/>
          </div>
          <div className="flex gap-[10px]">
            <Button onClick={updateApp}>
              {t('save', 'Save')}
            </Button>
            <Button onClick={() => setEditing(false)}>
              {t('cancel', 'Cancel')}
            </Button>
          </div>
        </div>) : (<div className="bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[16px]">
          <div className="flex items-center gap-[12px]">
            {((_a = app.picture) === null || _a === void 0 ? void 0 : _a.path) ? (<img src={app.picture.path} alt={app.name} className="w-[48px] h-[48px] rounded-full object-cover"/>) : (<div className="w-[48px] h-[48px] rounded-full bg-fifth flex items-center justify-center text-customColor18">
                {((_c = (_b = app.name) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.toUpperCase()) || '?'}
              </div>)}
            <div>
              <div className="text-[16px] font-bold">{app.name}</div>
              {app.description && (<div className="text-customColor18 text-[14px]">
                  {app.description}
                </div>)}
            </div>
          </div>

          <div className="flex flex-col gap-[4px]">
            <label className="text-[14px] text-customColor18">
              {t('redirect_url', 'Redirect URL')}
            </label>
            <div className="text-[14px]">{app.redirectUrl}</div>
          </div>

          <div>
            <Button onClick={startEditing}>
              {t('edit_app', 'Edit App')}
            </Button>
          </div>
        </div>)}

      <div className="flex flex-col gap-[12px]">
        <h4 className="text-[16px]">{t('credentials', 'Credentials')}</h4>

        <div className="bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[4px]">
            <label className="text-[14px] text-customColor18">
              {t('client_id', 'Client ID')}
            </label>
            <div className="flex items-center gap-[12px]">
              <code className="text-[14px] break-all">{app.clientId}</code>
              <Button onClick={() => copyToClipboard(app.clientId, 'Client ID')}>
                {t('copy', 'Copy')}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-[4px]">
            <label className="text-[14px] text-customColor18">
              {t('client_secret', 'Client Secret')}
            </label>
            <div className="flex items-center gap-[12px]">
              {plaintextSecret ? (<code className="text-[14px] break-all">
                  {plaintextSecret}
                </code>) : (<span className="text-customColor18 text-[14px]">
                  {t('secret_only_shown_on_creation', 'Secret is only shown on creation or rotation')}
                </span>)}
              {plaintextSecret && (<Button onClick={() => copyToClipboard(plaintextSecret, 'Client Secret')}>
                  {t('copy', 'Copy')}
                </Button>)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-[10px]">
        <Button onClick={rotateSecret}>
          {t('rotate_secret', 'Rotate Secret')}
        </Button>
        <Button onClick={deleteApp}>
          {t('delete_app', 'Delete App')}
        </Button>
      </div>
    </div>);
};
//# sourceMappingURL=developer.component.js.map
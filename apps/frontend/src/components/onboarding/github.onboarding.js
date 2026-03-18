import { __awaiter } from "tslib";
import { useCallback } from 'react';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import useSWR from 'swr';
import { GithubComponent } from "../settings/github.component";
export const GithubOnboarding = () => {
    const fetch = useFetch();
    const load = useCallback((path) => __awaiter(void 0, void 0, void 0, function* () {
        const { github } = yield (yield fetch('/settings/github')).json();
        if (!github) {
            return false;
        }
        const emptyOnes = github.find((p) => !p.login);
        const { organizations } = emptyOnes
            ? yield (yield fetch(`/settings/organizations/${emptyOnes.id}`)).json()
            : {
                organizations: [],
            };
        return {
            github,
            organizations,
        };
    }), []);
    const { isLoading: isLoadingSettings, data: loadAll } = useSWR('load-all', load);
    if (!loadAll) {
        return null;
    }
    return (<GithubComponent github={loadAll.github} organizations={loadAll.organizations}/>);
};
//# sourceMappingURL=github.onboarding.js.map
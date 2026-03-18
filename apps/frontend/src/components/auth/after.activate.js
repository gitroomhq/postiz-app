'use client';
import { __awaiter } from "tslib";
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import { LoadingComponent } from "../layout/loading";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import useCookie from 'react-use-cookie';
export const AfterActivate = () => {
    const fetch = useFetch();
    const params = useParams();
    const [showLoader, setShowLoader] = useState(true);
    const run = useRef(false);
    const t = useT();
    const [datafast_visitor_id] = useCookie('datafast_visitor_id');
    useEffect(() => {
        if (!run.current) {
            run.current = true;
            loadCode();
        }
    }, []);
    const loadCode = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        if (params.code) {
            const { can } = yield (yield fetch(`/auth/activate`, {
                method: 'POST',
                body: JSON.stringify({
                    code: params.code,
                    datafast_visitor_id,
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            })).json();
            if (!can) {
                setShowLoader(false);
            }
        }
    }), []);
    return (<>
      {showLoader ? (<LoadingComponent />) : (<>
          This user is already activated,
          <br />
          <Link href="/auth/login" className="underline">
            {t('click_here_to_go_back_to_login', 'Click here to go back to login')}
          </Link>
        </>)}
    </>);
};
//# sourceMappingURL=after.activate.js.map
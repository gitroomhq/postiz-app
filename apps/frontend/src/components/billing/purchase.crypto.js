import { __awaiter } from "tslib";
import { useCallback, useState } from 'react';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import { Button } from "../../../../../libraries/react-shared-libraries/src/form/button";
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export const PurchaseCrypto = () => {
    const fetch = useFetch();
    const t = useT();
    const [loading, setLoading] = useState(false);
    const load = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        setLoading(true);
        const data = yield (yield fetch('/billing/crypto')).json();
        window.location.href = data.invoice_url;
    }), []);
    return (<div className="flex-1 bg-sixth items-center border border-customColor6 rounded-[4px] p-[24px] gap-[16px] flex [@media(max-width:1024px)]:items-center">
      <div>
        {t('purchase_a_life_time_pro_account_with_sol_199', 'Purchase a Life-time PRO account with SOL ($199)')}
      </div>
      <div>
        <Button loading={loading} onClick={load}>
          {t('purchase_now', 'Purchase now')}
        </Button>
      </div>
    </div>);
};
//# sourceMappingURL=purchase.crypto.js.map
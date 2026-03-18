import { __awaiter } from "tslib";
import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import { ChartSocial } from "../analytics/chart-social";
import { LoadingComponent } from "../layout/loading";
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
const TrendIndicator = ({ value, average, }) => {
    if (value === 0)
        return null;
    const isPositive = value > 0;
    const displayValue = Math.abs(value).toFixed(1);
    return (<div className={`flex items-center gap-[4px] text-[13px] font-medium ${isPositive ? 'text-[#32d583]' : 'text-[#f97066]'}`}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={isPositive ? '' : 'rotate-180'}>
        <path d="M6 2.5L10 7.5H2L6 2.5Z" fill="currentColor"/>
      </svg>
      <span>
        {displayValue}
        {average ? 'pp' : '%'}
      </span>
    </div>);
};
const AnalyticsCard = ({ item, total, index }) => {
    const colorVariants = ['purple', 'green', 'blue'];
    const color = colorVariants[index % colorVariants.length];
    const hasMultipleDataPoints = item.data.length > 1;
    return (<div className="group relative">
      <div className={`
          flex flex-col h-full
          bg-newTableHeader
          border border-newTableBorder
          rounded-[12px]
          overflow-hidden
          transition-all duration-200
          hover:border-[#612bd3]/50
        `}>
        {/* Header */}
        <div className="flex items-center justify-between px-[16px] pt-[14px] pb-[8px]">
          <div className="flex items-center gap-[10px]">
            <div className={`
                w-[8px] h-[8px] rounded-full
                ${color === 'purple' ? 'bg-[#612bd3]' : ''}
                ${color === 'green' ? 'bg-[#32d583]' : ''}
                ${color === 'blue' ? 'bg-[#1d9bf0]' : ''}
              `}/>
            <span className="text-[15px] font-medium text-newTableText">
              {item.label}
            </span>
          </div>
          {item.percentageChange !== undefined && (<TrendIndicator value={item.percentageChange} average={item.average}/>)}
        </div>

        {/* Content */}
        {hasMultipleDataPoints ? (<>
            {/* Chart */}
            <div className="flex-1 px-[12px] py-[8px]">
              <div className="h-[120px] relative">
                <ChartSocial data={item.data} color={color} key={`chart-${index}`}/>
              </div>
            </div>

            {/* Value */}
            <div className="px-[16px] pb-[14px]">
              <div className="text-[36px] leading-[42px] font-semibold tracking-tight">
                {total}
              </div>
            </div>
          </>) : (
        /* Single value display */
        <div className="flex-1 flex flex-col items-center justify-center py-[32px] px-[16px]">
            <div className="text-[48px] leading-[56px] font-semibold tracking-tight">
              {total}
            </div>
          </div>)}
      </div>
    </div>);
};
const EmptyState = ({ onRefresh }) => {
    const t = useT();
    return (<div className="col-span-full flex flex-col items-center justify-center py-[48px] px-[24px] bg-newTableHeader border border-newTableBorder rounded-[12px]">
      <div className="w-[48px] h-[48px] mb-[16px] rounded-full bg-[#612bd3]/10 flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#612bd3]">
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          <path d="M12 8v4l2 2"/>
        </svg>
      </div>
      <p className="text-[15px] text-newTableText text-center mb-[12px]">
        {t('this_channel_needs_to_be_refreshed', 'This channel needs to be refreshed to display analytics')}
      </p>
      <button onClick={onRefresh} className="inline-flex items-center gap-[6px] px-[16px] py-[8px] text-[14px] font-medium text-white bg-[#612bd3] hover:bg-[#5023b8] rounded-[8px] transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 4v6h-6M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
        </svg>
        {t('refresh_channel', 'Refresh Channel')}
      </button>
    </div>);
};
export const RenderAnalytics = (props) => {
    const { integration, date } = props;
    const [loading, setLoading] = useState(true);
    const fetch = useFetch();
    const load = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        setLoading(true);
        const load = (yield fetch(`/analytics/${integration.id}?date=${date}`)).json();
        setLoading(false);
        return load;
    }), [integration, date]);
    const { data } = useSWR(`/analytics-${integration === null || integration === void 0 ? void 0 : integration.id}-${date}`, load, {
        refreshInterval: 0,
        refreshWhenHidden: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        refreshWhenOffline: false,
        revalidateOnMount: true,
    });
    const refreshChannel = useCallback((integrationData) => () => __awaiter(void 0, void 0, void 0, function* () {
        const { url } = yield (yield fetch(`/integrations/social/${integrationData.identifier}?refresh=${integrationData.internalId}`, {
            method: 'GET',
        })).json();
        window.location.href = url;
    }), []);
    const t = useT();
    const totals = useMemo(() => {
        return data === null || data === void 0 ? void 0 : data.map((p) => {
            const value = ((p === null || p === void 0 ? void 0 : p.data.reduce((acc, curr) => acc + curr.total, 0)) || 0) /
                (p.average ? p.data.length : 1);
            if (p.average) {
                return value.toFixed(2) + '%';
            }
            return new Intl.NumberFormat().format(Math.round(value));
        });
    }, [data]);
    if (loading) {
        return (<div className="flex items-center justify-center py-[48px]">
        <LoadingComponent />
      </div>);
    }
    return (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[16px]">
      {(data === null || data === void 0 ? void 0 : data.length) === 0 && (<EmptyState onRefresh={refreshChannel(integration)}/>)}
      {data === null || data === void 0 ? void 0 : data.map((item, index) => (<AnalyticsCard key={`analytics-${index}`} item={item} total={totals[index]} index={index}/>))}
    </div>);
};
//# sourceMappingURL=render.analytics.js.map
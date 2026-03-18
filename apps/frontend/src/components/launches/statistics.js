import { __awaiter } from "tslib";
import React, { Fragment, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import { ChartSocial } from "../analytics/chart-social";
import { Select } from "../../../../../libraries/react-shared-libraries/src/form/select";
import { LoadingComponent } from "../layout/loading";
import { MissingReleaseModal } from "./missing-release.modal";
export const StatisticsModal = (props) => {
    var _a, _b;
    const { postId } = props;
    const t = useT();
    const fetch = useFetch();
    const [dateRange, setDateRange] = useState(7);
    const loadStatistics = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        return (yield fetch(`/posts/${postId}/statistics`)).json();
    }), [postId, fetch]);
    const loadPostAnalytics = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        return (yield fetch(`/analytics/post/${postId}?date=${dateRange}`)).json();
    }), [postId, dateRange, fetch]);
    const { data: statisticsData, isLoading: isLoadingStatistics } = useSWR(`/posts/${postId}/statistics`, loadStatistics);
    const { data: analyticsData, isLoading: isLoadingAnalytics, mutate: mutateAnalytics } = useSWR(`/analytics/post/${postId}?date=${dateRange}`, loadPostAnalytics, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        revalidateOnMount: true,
        refreshWhenHidden: false,
        refreshWhenOffline: false,
    });
    const isMissing = analyticsData && !Array.isArray(analyticsData) && analyticsData.missing;
    const dateOptions = useMemo(() => {
        return [
            { key: 7, value: t('7_days', '7 Days') },
            { key: 30, value: t('30_days', '30 Days') },
            { key: 90, value: t('90_days', '90 Days') },
        ];
    }, [t]);
    const totals = useMemo(() => {
        if (!analyticsData || !Array.isArray(analyticsData))
            return [];
        return analyticsData.map((p) => {
            var _a;
            const value = (((_a = p === null || p === void 0 ? void 0 : p.data) === null || _a === void 0 ? void 0 : _a.reduce((acc, curr) => acc + Number(curr.total), 0)) || 0) /
                (p.average ? p.data.length : 1);
            if (p.average) {
                return value.toFixed(2) + '%';
            }
            return Math.round(value);
        });
    }, [analyticsData]);
    const isLoading = isLoadingStatistics || isLoadingAnalytics;
    return (<div className="relative min-h-[200px]">
      {isLoading ? (<div className="flex items-center justify-center py-[40px]">
          <LoadingComponent />
        </div>) : isMissing ? (<MissingReleaseModal postId={postId} onSuccess={() => mutateAnalytics()}/>) : (<div className="flex flex-col gap-[24px]">
          {/* Post Analytics Section */}
          {analyticsData && Array.isArray(analyticsData) && analyticsData.length > 0 && (<div className="flex flex-col gap-[14px]">
              <div className="flex items-center justify-between">
                <h3 className="text-[18px] font-[500]">
                  {t('post_analytics', 'Post Analytics')}
                </h3>
                <div className="max-w-[150px]">
                  <Select label="" name="date" disableForm={true} hideErrors={true} value={dateRange} onChange={(e) => setDateRange(+e.target.value)}>
                    {dateOptions.map((option) => (<option key={option.key} value={option.key}>
                        {option.value}
                      </option>))}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[16px]">
                {analyticsData.map((p, index) => {
                    const colorVariants = ['purple', 'green', 'blue'];
                    const color = colorVariants[index % colorVariants.length];
                    return (<div key={`analytics-${index}`} className="group">
                      <div className="flex flex-col h-full bg-newTableHeader border border-newTableBorder rounded-[12px] overflow-hidden transition-all duration-200 hover:border-[#612bd3]/50">
                        <div className="flex items-center justify-between px-[16px] pt-[14px] pb-[8px]">
                          <div className="flex items-center gap-[10px]">
                            <div className={`w-[8px] h-[8px] rounded-full ${color === 'purple' ? 'bg-[#612bd3]' : ''} ${color === 'green' ? 'bg-[#32d583]' : ''} ${color === 'blue' ? 'bg-[#1d9bf0]' : ''}`}/>
                            <span className="text-[15px] font-medium text-newTableText">
                              {p.label}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 px-[12px] py-[8px]">
                          <div className="h-[120px] relative">
                            <ChartSocial data={p.data} color={color} key={`chart-${index}`}/>
                          </div>
                        </div>
                        <div className="px-[16px] pb-[14px]">
                          <div className="text-[36px] leading-[42px] font-semibold tracking-tight">
                            {totals[index]}
                          </div>
                        </div>
                      </div>
                    </div>);
                })}
              </div>
            </div>)}

          {/* Short Links Statistics Section */}
          <div className="flex flex-col gap-[14px]">
            <h3 className="text-[18px] font-[500]">
              {t('short_links_statistics', 'Short Links Statistics')}
            </h3>
            {((_a = statisticsData === null || statisticsData === void 0 ? void 0 : statisticsData.clicks) === null || _a === void 0 ? void 0 : _a.length) === 0 ? (<div className="text-gray-400">
                {t('no_short_link_results', 'No short link results')}
              </div>) : (<div className="grid grid-cols-3">
                <div className="bg-forth p-[4px] rounded-tl-lg">
                  {t('short_link', 'Short Link')}
                </div>
                <div className="bg-forth p-[4px]">
                  {t('original_link', 'Original Link')}
                </div>
                <div className="bg-forth p-[4px] rounded-tr-lg">
                  {t('clicks', 'Clicks')}
                </div>
                {(_b = statisticsData === null || statisticsData === void 0 ? void 0 : statisticsData.clicks) === null || _b === void 0 ? void 0 : _b.map((p) => (<Fragment key={p.short}>
                    <div className="p-[4px] py-[10px] bg-customColor6">
                      {p.short}
                    </div>
                    <div className="p-[4px] py-[10px] bg-customColor6">
                      {p.original}
                    </div>
                    <div className="p-[4px] py-[10px] bg-customColor6">
                      {p.clicks}
                    </div>
                  </Fragment>))}
              </div>)}
          </div>

          {/* No analytics available message */}
          {(!analyticsData || !Array.isArray(analyticsData) || analyticsData.length === 0) &&
                (!(statisticsData === null || statisticsData === void 0 ? void 0 : statisticsData.clicks) || statisticsData.clicks.length === 0) && (<div className="text-center text-gray-400 py-[20px]">
                {t('no_statistics_available', 'No statistics available for this post')}
              </div>)}
        </div>)}
    </div>);
};
//# sourceMappingURL=statistics.js.map
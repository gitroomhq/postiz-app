export const LaunchesComponent = () => {
  const t = useT();
  const [reload, setReload] = useState(false);
  const [collapseMenu, setCollapseMenu] = useCookie('collapseMenu', '0');
  const { isLoading, data: integrations, mutate } = useIntegrationList();

  const totalNonDisabledChannels = useMemo(() => {
    if (!integrations) return 0;
    return integrations.filter((item: any) => !item.disabled).length;
  }, [integrations]);

  return (
    <div className="some-wrapper-class">
      {!isLoading && (
        <div>
          <div className="flex items-center">
            <h2 className="group-[.sidebar]:hidden flex-1 text-[20px] font-[500]">
              {t('channels')}
            </h2>
            <div
              onClick={() => setCollapseMenu(collapseMenu === '1' ? '0' : '1')}
              className="group-[.sidebar]:rotate-[180deg] group-[.sidebar]:mx-auto text-btnText bg-btnSimple rounded-[6px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer select-none"
            >
              {/* Icon or collapse arrow goes here */}
            </div>
          </div>

          {/* Add the count display */}
          <p className="text-sm text-gray-600 mt-2">
            Total Active Channels: {totalNonDisabledChannels}
          </p>
        </div>
      )}
    </div>
  );
};

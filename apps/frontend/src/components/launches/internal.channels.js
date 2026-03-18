import { useEffect, useState } from 'react';
import { PickPlatforms } from "./helpers/pick.platform.component";
import { useIntegration } from "./helpers/use.integration";
import { Select } from "../../../../../libraries/react-shared-libraries/src/form/select";
import { Slider } from "../../../../../libraries/react-shared-libraries/src/form/slider";
import { Input } from "../../../../../libraries/react-shared-libraries/src/form/input";
import { Textarea } from "../../../../../libraries/react-shared-libraries/src/form/textarea";
import { useSettings } from "./helpers/use.values";
import clsx from 'clsx';
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
const delayOptions = [
    {
        name: 'Immediately',
        value: 0,
    },
    {
        name: '1 hour',
        value: 3600000,
    },
    {
        name: '2 hours',
        value: 7200000,
    },
    {
        name: '3 hours',
        value: 10800000,
    },
    {
        name: '8 hours',
        value: 28800000,
    },
    {
        name: '12 hours',
        value: 43200000,
    },
    {
        name: '15 hours',
        value: 54000000,
    },
    {
        name: '24 hours',
        value: 86400000,
    },
];
export const InternalChannels = (props) => {
    const { plugs } = props;
    return (<div>
      {plugs.map((plug, index) => (<Plug plug={plug} key={index}/>))}
    </div>);
};
const PlugField = ({ plugIdentifier, field }) => {
    const fieldName = `plug--${plugIdentifier}--${field.name}`;
    if (field.type === 'textarea') {
        return (<Textarea label={field.description} name={fieldName} placeholder={field.placeholder}/>);
    }
    return (<Input label={field.description} name={fieldName} placeholder={field.placeholder}/>);
};
const Plug = ({ plug }) => {
    const { allIntegrations, integration } = useIntegration();
    const t = useT();
    const { watch, setValue, control, register } = useSettings();
    const [load, setLoad] = useState(false);
    const val = watch(`plug--${plug.identifier}--integrations`);
    const active = watch(`plug--${plug.identifier}--active`);
    useEffect(() => {
        setTimeout(() => {
            setLoad(true);
        }, 20);
    }, []);
    const [localValue, setLocalValue] = useState((val || []).map((p) => (Object.assign({}, p))));
    useEffect(() => {
        setValue(`plug--${plug.identifier}--integrations`, [...localValue]);
    }, [localValue, plug, setValue]);
    const [allowedIntegrations] = useState(allIntegrations.filter((i) => plug.pickIntegration.includes(i.identifier) && (integration === null || integration === void 0 ? void 0 : integration.id) !== i.id));
    if (!load) {
        return null;
    }
    return (<div key={plug.title} className="flex flex-col gap-[10px] border-tableBorder border p-[15px] rounded-lg">
      <div className="flex items-center">
        <div className="flex-1">{plug.title}</div>
        <div>
          <Slider value={active ? 'on' : 'off'} onChange={(p) => setValue(`plug--${plug.identifier}--active`, p === 'on')} fill={true}/>
        </div>
      </div>
      <div className="w-full max-w-[600px] overflow-y-auto pb-[10px] text-[12px] flex flex-col gap-[10px]">
        {!allowedIntegrations.length ? ('No available accounts') : (<div className={clsx('flex flex-col gap-[10px]', !active && 'opacity-25 pointer-events-none')}>
            <div>{plug.description}</div>
            <Select label="Delay" hideErrors={true} {...register(`plug--${plug.identifier}--delay`)}>
              {delayOptions.map((p) => (<option key={p.name} value={p.value}>
                  {p.name}
                </option>))}
            </Select>
            {plug.fields.length > 0 && (<div className="flex flex-col gap-[10px]">
                {plug.fields.map((field) => (<PlugField key={field.name} plugIdentifier={plug.identifier} field={field}/>))}
              </div>)}
            <div>
              {t('accounts_that_will_engage', 'Accounts that will engage:')}
            </div>
            <PickPlatforms hide={false} integrations={allowedIntegrations} selectedIntegrations={localValue} singleSelect={false} isMain={true} onChange={setLocalValue}/>
          </div>)}
      </div>
    </div>);
};
//# sourceMappingURL=internal.channels.js.map
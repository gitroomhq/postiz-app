import {FC} from "react";
import {withProvider} from "@gitroom/frontend/components/launches/providers/high.order.provider";

const DevtoPreview: FC = () => {
    return <div>asd</div>
};

const DevtoSettings: FC = () => {
    return <div>asdfasd</div>
};

export default withProvider(DevtoSettings, DevtoPreview);
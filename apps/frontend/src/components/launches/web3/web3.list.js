import { WrapcasterProvider } from "./providers/wrapcaster.provider";
import { TelegramProvider } from "./providers/telegram.provider";
import { MoltbookProvider } from "./providers/moltbook.provider";
export const web3List = [
    {
        identifier: 'telegram',
        component: TelegramProvider,
    },
    {
        identifier: 'wrapcast',
        component: WrapcasterProvider,
    },
    {
        identifier: 'moltbook',
        component: MoltbookProvider,
    },
];
//# sourceMappingURL=web3.list.js.map
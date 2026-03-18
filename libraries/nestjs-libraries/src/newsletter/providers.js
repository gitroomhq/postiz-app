import { BeehiivProvider } from "./providers/beehiiv.provider";
import { EmailEmptyProvider } from "./providers/email-empty.provider";
import { ListmonkProvider } from "./providers/listmonk.provider";
export const newsletterProviders = [
    new BeehiivProvider(),
    new ListmonkProvider(),
    new EmailEmptyProvider(),
];
//# sourceMappingURL=providers.js.map
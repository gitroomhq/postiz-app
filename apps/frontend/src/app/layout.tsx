import './global.css';

import LayoutContext from "@gitroom/frontend/components/layout/layout.context";
import {ReactNode} from "react";
import {Chakra_Petch} from "next/font/google";
const chakra = Chakra_Petch({weight: '400', subsets: ['latin']})
export default async function AppLayout({children}: {children: ReactNode}) {
    return (
        <html>
            <body className={chakra.className}>
                <LayoutContext>
                    {children}
                </LayoutContext>
            </body>
        </html>
    )
}
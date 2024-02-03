import LayoutContext from "@gitroom/frontend/components/layout/layout.context";
import {ReactNode} from "react";

export default async function AppLayout({children}: {children: ReactNode}) {
    return (
        <html>
            <body className="overflow-hidden">
                <LayoutContext>
                    {children}
                </LayoutContext>
            </body>
        </html>
    )
}
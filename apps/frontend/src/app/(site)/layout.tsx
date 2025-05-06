import {LayoutSettings} from "@gitroom/frontend/components/layout/layout.settings";

/**
 * Wraps the provided children in the {@link LayoutSettings} component.
 *
 * @param children - The React nodes to be rendered within the layout.
 */
export default async function Layout({ children }: { children: React.ReactNode }) {
    return (
        <LayoutSettings>
            {children}
        </LayoutSettings>
    );
}

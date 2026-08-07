'use client';

/**
 * Connections entry — the full-page catalog was replaced by the Settings-scale
 * Connect panel (`connect-panel.tsx`). Catalog data lives in
 * `connections.catalog.ts`. Keep these re-exports so existing imports and the
 * `/connections` route stay stable.
 */
export {
  ConnectPage as ConnectionsPage,
  ConnectPanel,
  ConnectPanel as ConnectionsComponent,
} from '@gitroom/frontend/components/public-api/connect-panel';

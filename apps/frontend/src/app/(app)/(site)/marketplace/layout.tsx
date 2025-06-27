import { BuyerSeller } from '@chaolaolo/frontend/components/marketplace/buyer.seller';
import { ReactNode } from 'react';
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <BuyerSeller />
      {children}
    </>
  );
}

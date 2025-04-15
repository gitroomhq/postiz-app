import { ReactNode } from 'react';

export default async function IntegrationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="text-6xl text-center mt-[50px]">
      Adding channel, Redirecting You{children}
    </div>
  );
}

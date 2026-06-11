'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ClientForm } from '@gitroom/frontend/components/hub/crm/client-form.component';
import { useCrmMutations } from '@gitroom/frontend/components/hub/crm/use-crm-mutations.hook';

export default function CrmNovoClientePage() {
  const router = useRouter();
  const { createClient } = useCrmMutations();

  return (
    <div className="flex flex-col flex-1 bg-newBgColor min-h-full">
      <div className="bg-newBgColorInner border-b border-newTableBorder px-[20px] py-[20px]">
        <div className="max-w-[600px] mx-auto">
          <Link
            href="/hub/crm"
            className="inline-flex items-center gap-[5px] text-[12px] font-[600] text-newTableText hover:text-newTextColor transition-colors mb-[16px]"
          >
            <ArrowLeft size={13} /> Clientes
          </Link>
          <p className="text-[10px] font-[900] tracking-[0.12em] uppercase mb-[4px]" style={{ color: 'var(--voc-rose)' }}>
            Hub · CRM
          </p>
          <h1 className="text-[24px] font-[700] text-newTextColor">Novo cliente</h1>
        </div>
      </div>

      <div className="flex-1 max-w-[600px] w-full mx-auto px-[20px] py-[28px]">
        <div className="bg-newBgColorInner rounded-[16px] border border-newTableBorder p-[24px]">
          <ClientForm
            submitLabel="Criar cliente"
            onCancel={() => router.push('/hub/crm')}
            onSubmit={async (data) => {
              const created = await createClient(data);
              router.push(`/hub/crm/${created.id}`);
            }}
          />
        </div>
      </div>
    </div>
  );
}

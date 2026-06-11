'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProjectForm } from '@gitroom/frontend/components/hub/crm/project-form.component';
import { useProjectMutations } from '@gitroom/frontend/components/hub/crm/use-project.hook';
import { useClients } from '@gitroom/frontend/components/hub/crm/use-clients.hook';
import { useUser } from '@gitroom/frontend/components/layout/user.context';

export default function CrmNovoProjetoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preClientId = searchParams.get('clientId') ?? undefined;

  const { createProject } = useProjectMutations();
  const { data } = useClients({ page: 1 });
  const user = useUser();

  const clients = data?.items?.map((c) => ({ id: c.id, name: c.name })) ?? [];

  return (
    <div className="flex flex-col flex-1 bg-newBgColor min-h-full">
      <div className="bg-newBgColorInner border-b border-newTableBorder px-[20px] py-[20px]">
        <div className="max-w-[700px] mx-auto">
          <Link href="/hub/crm/projetos" className="inline-flex items-center gap-[5px] text-[12px] font-[600] text-newTableText hover:text-newTextColor transition-colors mb-[16px]">
            <ArrowLeft size={13} /> Projetos
          </Link>
          <p className="text-[10px] font-[900] tracking-[0.12em] uppercase mb-[4px]" style={{ color: 'var(--voc-rose)' }}>Hub · CRM</p>
          <h1 className="text-[24px] font-[700] text-newTextColor">Novo projeto</h1>
        </div>
      </div>

      <div className="flex-1 max-w-[700px] w-full mx-auto px-[20px] py-[28px]">
        {clients.length === 0 ? (
          <p className="text-[14px] text-newTableText text-center py-[40px]">Carregando clientes…</p>
        ) : (
          <ProjectForm
            initial={{ clientId: preClientId ?? clients[0]?.id }}
            clients={clients}
            currentUserId={user?.id ?? ''}
            submitLabel="Criar projeto"
            onCancel={() => router.back()}
            onSubmit={async (data) => {
              const created = await createProject(data);
              router.push(`/hub/crm/projetos/${created.id}`);
            }}
          />
        )}
      </div>
    </div>
  );
}

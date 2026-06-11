'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProjectForm } from '@gitroom/frontend/components/hub/crm/project-form.component';
import { useProject, useProjectMutations } from '@gitroom/frontend/components/hub/crm/use-project.hook';
import { useClients } from '@gitroom/frontend/components/hub/crm/use-clients.hook';
import { useUser } from '@gitroom/frontend/components/layout/user.context';

interface Props { params: { id: string } }

export default function CrmProjectDetailPage({ params }: Props) {
  const router = useRouter();
  const { data, isLoading } = useProject(params.id);
  const { data: clientsData } = useClients({ page: 1 });
  const { updateProject } = useProjectMutations();
  const user = useUser();

  const clients = clientsData?.items?.map((c) => ({ id: c.id, name: c.name })) ?? [];

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 bg-newBgColor animate-pulse">
        <div className="bg-newBgColorInner border-b border-newTableBorder px-[20px] py-[24px]">
          <div className="max-w-[700px] mx-auto space-y-[10px]">
            <div className="h-[14px] w-[100px] rounded-full bg-newBgColor" />
            <div className="h-[24px] w-[240px] rounded-full bg-newBgColor" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-[80px] bg-newBgColor flex-1">
        <p className="text-[16px] text-newTableText">Projeto não encontrado.</p>
        <Link href="/hub/crm/projetos" className="mt-[16px] text-[13px] font-[700]" style={{ color: 'var(--voc-violet)' }}>
          ← Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-newBgColor min-h-full">
      <div className="bg-newBgColorInner border-b border-newTableBorder px-[20px] py-[20px]">
        <div className="max-w-[700px] mx-auto">
          <Link href={`/hub/crm/${data.client.id}`} className="inline-flex items-center gap-[5px] text-[12px] font-[600] text-newTableText hover:text-newTextColor transition-colors mb-[16px]">
            <ArrowLeft size={13} /> {data.client.name}
          </Link>
          <p className="text-[10px] font-[900] tracking-[0.12em] uppercase mb-[4px]" style={{ color: 'var(--voc-rose)' }}>Hub · CRM · Projeto</p>
          <h1 className="text-[24px] font-[700] text-newTextColor">{data.name}</h1>
        </div>
      </div>

      <div className="flex-1 max-w-[700px] w-full mx-auto px-[20px] py-[28px]">
        <ProjectForm
          initial={data}
          clients={clients.length ? clients : [{ id: data.clientId, name: data.client.name }]}
          currentUserId={user?.id ?? data.ownerId}
          submitLabel="Salvar alterações"
          onCancel={() => router.push(`/hub/crm/${data.client.id}`)}
          onSubmit={async (formData) => {
            await updateProject(params.id, formData);
            router.push(`/hub/crm/${data.client.id}`);
          }}
        />
      </div>
    </div>
  );
}

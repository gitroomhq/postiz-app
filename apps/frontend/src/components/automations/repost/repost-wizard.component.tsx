'use client';

import { FC } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { RepostRuleForm } from '@gitroom/frontend/components/automations/repost/repost-rule-form.component';

export const RepostWizardComponent: FC = () => {
  const router = useRouter();
  const t = useT();
  return (
    <div className="flex flex-col gap-[16px] p-[24px] flex-1">
      <div className="flex items-center gap-[12px]">
        <button
          type="button"
          onClick={() => router.push('/automacoes')}
          aria-label={t('back', 'Voltar')}
          className="text-customColor18 hover:text-textColor text-[18px]"
        >
          &larr;
        </button>
        <h1 className="text-[20px] font-semibold text-textColor">
          {t('repost_wizard_title', 'Nova regra de Repost')}
        </h1>
      </div>
      <RepostRuleForm
        mode="create"
        onSaved={(rule) => router.push(`/automacoes/repost/${rule.id}`)}
        onCancel={() => router.push('/automacoes')}
      />
    </div>
  );
};

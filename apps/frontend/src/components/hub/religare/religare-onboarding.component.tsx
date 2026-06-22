'use client';

import { FC, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Sparkles, Loader2 } from 'lucide-react';
import { useExperts } from '@gitroom/frontend/components/hub/crm/use-experts.hook';
import {
  ARCHETYPE_QUESTIONS,
  VOCATIONAL_QUESTIONS,
  type IkigaiAnswers,
} from '@gitroom/helpers/utils/religare';
import {
  useReligareMutations,
  type ReligareProfileFormData,
} from './use-religare-mutations.hook';

const STEPS = ['Nascimento', 'Arquétipos', 'Vocação & Ikigai', 'Revisão'];

const EMPTY_IKIGAI: IkigaiAnswers = {
  loves: '',
  goodAt: '',
  worldNeeds: '',
  paidFor: '',
};

const fieldClass =
  'w-full px-[12px] py-[10px] rounded-[10px] bg-newBgColorInner border border-newTableBorder text-[14px] text-newTextColor outline-none focus:border-[var(--voc-rose)] transition-colors';

const labelClass = 'block text-[12px] font-[700] mb-[6px] text-newTextColor';

export const ReligareOnboarding: FC = () => {
  const router = useRouter();
  const params = useSearchParams();
  const preExpertId = params.get('expertId') || '';
  const { data: experts = [] } = useExperts();
  const { createProfile, submitQuestionnaire } = useReligareMutations();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preExpert = useMemo(
    () => experts.find((e) => e.id === preExpertId),
    [experts, preExpertId]
  );

  const [form, setForm] = useState<ReligareProfileFormData>({
    expertId: preExpertId || undefined,
    name: preExpert?.name || '',
    birthDate: '',
    birthTime: '',
    birthPlace: '',
  });
  const [archAnswers, setArchAnswers] = useState<Record<string, string>>({});
  const [vocAnswers, setVocAnswers] = useState<Record<string, string>>({});
  const [ikigai, setIkigai] = useState<IkigaiAnswers>(EMPTY_IKIGAI);

  // keep name in sync when the expert is picked from the selector
  const pickExpert = (id: string) => {
    const exp = experts.find((e) => e.id === id);
    setForm((f) => ({
      ...f,
      expertId: id || undefined,
      name: exp?.name || f.name,
    }));
  };

  const step1Valid =
    form.name.trim().length >= 2 &&
    !!form.birthDate &&
    !!form.birthTime &&
    form.birthPlace.trim().length >= 2;
  const step2Valid = ARCHETYPE_QUESTIONS.every((q) => archAnswers[q.id]);
  const step3Valid =
    VOCATIONAL_QUESTIONS.every((q) => vocAnswers[q.id]) &&
    Object.values(ikigai).every((v) => v.trim().length > 0);

  const canAdvance =
    (step === 0 && step1Valid) ||
    (step === 1 && step2Valid) ||
    (step === 2 && step3Valid) ||
    step === 3;

  const handleFinish = async () => {
    setSaving(true);
    setError(null);
    try {
      const created = await createProfile(form);
      await submitQuestionnaire(created.id, {
        answers: { archetypes: archAnswers, vocational: vocAnswers, ikigai },
      });
      router.push(`/hub/religare/perfil/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar o Religare');
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-newBgColor min-h-full">
      <div className="max-w-[760px] w-full mx-auto px-[20px] py-[28px]">
        {/* header + stepper */}
        <div className="flex items-center gap-[10px] mb-[6px]">
          <Link
            href="/hub/religare"
            className="text-newTextColor opacity-70 hover:opacity-100"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-[20px] font-[800] text-newTextColor">Novo Religare</h1>
        </div>
        <div className="flex items-center gap-[8px] mb-[26px] flex-wrap">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-[8px]">
              <div
                className="flex items-center gap-[7px] text-[12px] font-[700]"
                style={{
                  color:
                    i === step
                      ? 'var(--voc-rose)'
                      : i < step
                      ? 'rgb(var(--new-textColor))'
                      : 'var(--new-table-text)',
                }}
              >
                <span
                  className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px]"
                  style={{
                    background:
                      i === step
                        ? 'var(--voc-rose)'
                        : i < step
                        ? 'var(--voc-violet)'
                        : 'var(--new-bgColorInner)',
                    color: i <= step ? '#fff' : 'var(--new-table-text)',
                    border:
                      i > step ? '1px solid var(--new-table-border)' : 'none',
                  }}
                >
                  {i < step ? <Check size={12} /> : i + 1}
                </span>
                {label}
              </div>
              {i < STEPS.length - 1 && (
                <span style={{ color: 'var(--new-table-text)' }}>·</span>
              )}
            </div>
          ))}
        </div>

        {/* step 1 — birth data */}
        {step === 0 && (
          <div className="flex flex-col gap-[16px]">
            {experts.length > 0 && (
              <div>
                <label className={labelClass}>Expert</label>
                <select
                  className={fieldClass}
                  value={form.expertId || ''}
                  onChange={(e) => pickExpert(e.target.value)}
                >
                  <option value="">— Sem expert vinculado —</option>
                  {experts.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={labelClass}>Nome *</label>
              <input
                className={fieldClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome de quem será lido"
              />
            </div>
            <div className="grid grid-cols-2 gap-[12px]">
              <div>
                <label className={labelClass}>Data de nascimento *</label>
                <input
                  type="date"
                  className={fieldClass}
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Hora de nascimento *</label>
                <input
                  type="time"
                  className={fieldClass}
                  value={form.birthTime}
                  onChange={(e) => setForm({ ...form, birthTime: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Local de nascimento *</label>
              <input
                className={fieldClass}
                value={form.birthPlace}
                onChange={(e) => setForm({ ...form, birthPlace: e.target.value })}
                placeholder="Cidade, Estado, País"
              />
              <p className="text-[11px] mt-[6px]" style={{ color: 'var(--new-table-text)' }}>
                Data, hora e local são essenciais para o Tzolkin e, em breve, para a
                Astrologia e o Human Design.
              </p>
            </div>
          </div>
        )}

        {/* step 2 — archetypes */}
        {step === 1 && (
          <QuestionList
            questions={ARCHETYPE_QUESTIONS}
            answers={archAnswers}
            onAnswer={(qid, oid) => setArchAnswers((a) => ({ ...a, [qid]: oid }))}
          />
        )}

        {/* step 3 — vocational + ikigai */}
        {step === 2 && (
          <div className="flex flex-col gap-[20px]">
            <QuestionList
              questions={VOCATIONAL_QUESTIONS}
              answers={vocAnswers}
              onAnswer={(qid, oid) => setVocAnswers((a) => ({ ...a, [qid]: oid }))}
            />
            <div className="rounded-[14px] border border-newTableBorder p-[16px]">
              <div className="flex items-center gap-[8px] mb-[12px]">
                <Sparkles size={15} style={{ color: 'var(--voc-rose)' }} />
                <span className="text-[14px] font-[800] text-newTextColor">
                  Ikigai — os 4 pilares
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
                {(
                  [
                    ['loves', 'O que você ama?'],
                    ['goodAt', 'No que você é bom?'],
                    ['worldNeeds', 'O que o mundo precisa?'],
                    ['paidFor', 'Pelo que pode ser pago?'],
                  ] as [keyof IkigaiAnswers, string][]
                ).map(([key, prompt]) => (
                  <div key={key}>
                    <label className={labelClass}>{prompt}</label>
                    <textarea
                      className={`${fieldClass} resize-none h-[72px]`}
                      value={ikigai[key]}
                      onChange={(e) =>
                        setIkigai((v) => ({ ...v, [key]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* step 4 — review */}
        {step === 3 && (
          <div className="rounded-[14px] border border-newTableBorder p-[20px] flex flex-col gap-[10px]">
            <Row label="Nome" value={form.name} />
            <Row label="Nascimento" value={`${form.birthDate} ${form.birthTime}`} />
            <Row label="Local" value={form.birthPlace} />
            <Row
              label="Arquétipos"
              value={`${Object.keys(archAnswers).length}/${ARCHETYPE_QUESTIONS.length} respondidos`}
            />
            <Row
              label="Vocação"
              value={`${Object.keys(vocAnswers).length}/${VOCATIONAL_QUESTIONS.length} respondidos`}
            />
            <p className="text-[12px] mt-[4px]" style={{ color: 'var(--new-table-text)' }}>
              Ao concluir, a leitura (Kin natal, arquétipos, chamados e síntese) é
              calculada e salva.
            </p>
            {error && (
              <p className="text-[12px] font-[700]" style={{ color: 'var(--voc-rose)' }}>
                {error}
              </p>
            )}
          </div>
        )}

        {/* nav */}
        <div className="flex items-center justify-between mt-[24px]">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || saving}
            className="flex items-center gap-[6px] px-[14px] py-[9px] rounded-[10px] text-[13px] font-[700] text-newTextColor border border-newTableBorder disabled:opacity-40"
          >
            <ArrowLeft size={14} />
            Voltar
          </button>
          {step < 3 ? (
            <button
              onClick={() => canAdvance && setStep((s) => s + 1)}
              disabled={!canAdvance}
              className="flex items-center gap-[6px] px-[18px] py-[9px] rounded-[10px] text-[13px] font-[700] text-white disabled:opacity-40"
              style={{ background: 'var(--voc-aurora)' }}
            >
              Avançar
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center gap-[7px] px-[20px] py-[9px] rounded-[10px] text-[13px] font-[700] text-white disabled:opacity-60"
              style={{ background: 'var(--voc-aurora)' }}
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {saving ? 'Revelando…' : 'Revelar essência'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Row: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-[12px]">
    <span className="text-[12px] font-[700]" style={{ color: 'var(--new-table-text)' }}>
      {label}
    </span>
    <span className="text-[13px] text-newTextColor text-right">{value || '—'}</span>
  </div>
);

interface QListProps {
  questions: { id: string; prompt: string; options: { id: string; label: string }[] }[];
  answers: Record<string, string>;
  onAnswer: (qid: string, oid: string) => void;
}

const QuestionList: FC<QListProps> = ({ questions, answers, onAnswer }) => (
  <div className="flex flex-col gap-[18px]">
    {questions.map((q, qi) => (
      <div key={q.id}>
        <div className="text-[14px] font-[700] text-newTextColor mb-[10px]">
          {qi + 1}. {q.prompt}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[8px]">
          {q.options.map((opt) => {
            const active = answers[q.id] === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onAnswer(q.id, opt.id)}
                className="text-left text-[13px] px-[12px] py-[10px] rounded-[10px] border transition-colors"
                style={{
                  background: active ? 'rgba(207,98,149,0.12)' : 'var(--new-bgColorInner)',
                  borderColor: active ? 'var(--voc-rose)' : 'var(--new-table-border)',
                  color: 'rgb(var(--new-textColor))',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    ))}
  </div>
);

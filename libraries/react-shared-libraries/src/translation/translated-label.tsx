import { ReactNode } from 'react';
import { useT } from './get.transation.service.client';

interface TranslatedLabelProps {
  label: string;
  translationKey?: string;
  translationParams?: Record<string, string | number>;
  children?: ReactNode;
}

/**
 * TranslatedLabel is a wrapper component that translates labels in form components
 *
 * @param label - The original label text (fallback if no translation found)
 * @param translationKey - Optional custom translation key, defaults to normalized label text
 * @param translationParams - Optional parameters for translation interpolation
 * @param children - Optional children components
 */
export function TranslatedLabel({
  label,
  translationKey,
  translationParams = {},
  children,
}: TranslatedLabelProps) {
  const t = useT();

  // If no explicit key is provided, create one from the label
  const key =
    translationKey ||
    `label_${label.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '')}`;

  const translatedLabel = t(key, label, translationParams);

  return (
    <>
      {translatedLabel}
      {children}
    </>
  );
}

'use client';

import React, { FC, useCallback, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import Loading from '@gitroom/frontend/components/layout/loading';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

const MAX_IMAGE_SIZE_MB = 30;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

/**
 * Dropzone reusavel para imagem de referencia em fluxos I2X (I2V no
 * AiVideo, I2I no AiImage). Sobre tudo:
 *  - Drag-and-drop OU click no input file
 *  - POST para /media/upload-server (FormData) e devolve `path` (URL R2/local)
 *  - Mostra preview thumb 80x80 + "Remover" depois do upload
 *  - Fallback "ou cole URL publica" abaixo do dropzone
 *  - Validacao tipo (image/*) + tamanho (30MB)
 *
 * Chaves de traducao (compartilhadas entre AiVideo e AiImage):
 *  - ai_dropzone, ai_dropzone_hint, ai_or_paste_url, ai_uploading,
 *    ai_only_images, ai_image_too_large, ai_upload_failed,
 *    ai_upload_no_path, ai_reference_remove, ai_reference_invalid
 */
export interface ReferenceImageDropzoneProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export const ReferenceImageDropzone: FC<ReferenceImageDropzoneProps> = ({
  value,
  onChange,
  disabled,
}) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValid = useMemo(() => {
    if (!value) return true;
    try {
      const u = new URL(value.trim());
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }, [value]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toaster.show(
          t('ai_only_images', 'Apenas imagens são aceitas como referência.'),
          'warning'
        );
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toaster.show(
          t('ai_image_too_large', 'Imagem muito grande (máximo 30MB).'),
          'warning'
        );
        return;
      }
      setUploading(true);
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/media/upload-server', {
          method: 'POST',
          body: form,
        });
        if (!res.ok) {
          toaster.show(
            t('ai_upload_failed', 'Falha ao enviar imagem.'),
            'warning'
          );
          return;
        }
        const data = await res.json();
        if (data?.path) {
          onChange(data.path);
        } else {
          toaster.show(
            t('ai_upload_no_path', 'Resposta inválida do servidor.'),
            'warning'
          );
        }
      } catch {
        toaster.show(
          t('ai_upload_failed', 'Falha ao enviar imagem.'),
          'warning'
        );
      } finally {
        setUploading(false);
      }
    },
    [fetch, toaster, t, onChange]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled || uploading) return;
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileUpload(file);
    },
    [disabled, uploading, handleFileUpload]
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  if (value) {
    return (
      <div className="flex items-center gap-[12px] bg-newColColor border border-newTableBorder rounded-[8px] p-[10px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={value}
          alt="reference"
          className="w-[80px] h-[80px] object-cover rounded-[6px] flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-customColor18 truncate">{value}</div>
          {!isValid && (
            <div className="text-[11px] text-customColor19 mt-[2px]">
              {t(
                'ai_reference_invalid',
                'URL inválida (use http:// ou https://).'
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          className="text-[12px] text-customColor19 hover:underline"
          disabled={disabled}
          onClick={() => onChange('')}
        >
          {t('ai_reference_remove', 'Remover')}
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={() =>
          !disabled && !uploading && fileInputRef.current?.click()
        }
        className={clsx(
          'border-2 border-dashed border-newTableBorder rounded-[8px] p-[20px] text-center cursor-pointer transition-colors hover:bg-newColColor/40',
          (disabled || uploading) && 'opacity-50 cursor-not-allowed'
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-[6px]">
            <Loading height={20} width={20} type="spin" color="currentColor" />
            <span className="text-[12px] text-customColor18">
              {t('ai_uploading', 'Enviando imagem...')}
            </span>
          </div>
        ) : (
          <>
            <div className="text-[13px] text-textColor mb-[2px]">
              {t('ai_dropzone', 'Arraste uma imagem ou clique para selecionar')}
            </div>
            <div className="text-[11px] text-customColor18">
              {t('ai_dropzone_hint', 'PNG, JPG ou WebP até 30MB')}
            </div>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = '';
        }}
      />
      <div className="text-[12px] text-customColor18 mt-[8px]">
        {t('ai_or_paste_url', 'Ou cole uma URL pública:')}
      </div>
      <input
        type="url"
        className="bg-newBgColorInner border border-newTableBorder rounded-[8px] px-[14px] py-[8px] outline-none text-[13px] mt-[4px]"
        placeholder="https://..."
        disabled={disabled || uploading}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </>
  );
};

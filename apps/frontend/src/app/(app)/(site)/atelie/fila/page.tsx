import { AtelieFilaClient } from '@gitroom/frontend/components/atelie/fila-client.component';

/**
 * Cockpit interno do Ateliê Virtual (AT-2) — OWNER/OPERATOR, sem link no menu principal
 * de propósito (não é a aba client-facing "Ateliê Virtual" da AT-3, que ainda não existe).
 * A segurança real é a `@VocaccioRoles(OWNER, OPERATOR)` no backend (AtelieController);
 * esta rota só está fora do menu pra não confundir o usuário final.
 */
export default function AtelieFilaPage() {
  return (
    <div className="p-[24px]">
      <AtelieFilaClient />
    </div>
  );
}

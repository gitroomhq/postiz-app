import { SubscriptionTier } from '@prisma/client';

/**
 * Limite de perfis Religare por plano.
 * ⚠️ Os tiers reais são os herdados do Postiz (STANDARD/TEAM/PRO/ULTIMATE);
 * sem assinatura = FREE. Os nomes do PLANO-MESTRE (Individual/Básico/
 * Intermediário/Enterprise) serão reconciliados com billing depois — por isso
 * o mapa fica num lugar só.
 */
export function religareProfileLimit(
  tier?: SubscriptionTier | null
): number {
  switch (tier) {
    case 'STANDARD':
      return 5;
    case 'TEAM':
    case 'PRO':
    case 'ULTIMATE':
      return Infinity;
    default:
      // FREE / sem assinatura
      return 1;
  }
}

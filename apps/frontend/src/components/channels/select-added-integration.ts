/**
 * Pick which connected channel to focus after OAuth lands on
 * `/channels?added=<provider>&focus=<integrationUuid>`.
 *
 * `focus` wins when that id is in the list (Facebook two-step already knows
 * it). Otherwise matches `identifier === added`. Several accounts on the
 * same provider resolve to the newest `createdAt` when the list carries it,
 * otherwise the last match in list order.
 */
export type AddedIntegrationFields = {
  id?: string;
  identifier?: string;
  createdAt?: string | Date | null;
};

export function selectAddedIntegration<T extends AddedIntegrationFields>(
  list: T[] | null | undefined,
  added: string | null | undefined,
  focus?: string | null,
): T | undefined {
  if (!Array.isArray(list) || list.length === 0) {
    return undefined;
  }

  if (focus) {
    const focused = list.find((item) => item.id === focus);
    if (focused) {
      return focused;
    }
  }

  if (!added) {
    return undefined;
  }

  const matches = list.filter((item) => item.identifier === added);
  if (matches.length === 0) {
    return undefined;
  }
  if (matches.length === 1) {
    return matches[0];
  }

  let newest: T | undefined;
  let newestTime = Number.NEGATIVE_INFINITY;
  for (const item of matches) {
    if (item.createdAt == null || item.createdAt === '') {
      continue;
    }
    const time = new Date(item.createdAt).getTime();
    if (Number.isNaN(time)) {
      continue;
    }
    if (time >= newestTime) {
      newestTime = time;
      newest = item;
    }
  }

  return newest ?? matches[matches.length - 1];
}

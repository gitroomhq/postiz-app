export function calculatePercentageChange(
  data: Array<{ total: string | number; date: string }>
): number {
  if (data.length < 2) return 0;

  const midpoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midpoint);
  const secondHalf = data.slice(midpoint);

  const firstHalfSum = firstHalf.reduce(
    (sum, item) => sum + Number(item.total),
    0
  );
  const secondHalfSum = secondHalf.reduce(
    (sum, item) => sum + Number(item.total),
    0
  );

  if (firstHalfSum === 0) return 0;

  return Math.round(((secondHalfSum - firstHalfSum) / firstHalfSum) * 1000) / 10;
}

import { TradeError } from "../lib/errors";
export const sharePercent = (value: number, total: number): number => {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isFinite(total) ||
    total <= 0
  )
    throw new TradeError(
      "A valid positive export total is needed for shares.",
      "invalid",
    );
  return (value / total) * 100;
};
export function topThree<
  T extends { valueUsd: number; code?: string; countryCode?: string },
>(items: T[]): T[] {
  return [...items]
    .sort(
      (a, b) =>
        b.valueUsd - a.valueUsd ||
        (a.code ?? a.countryCode ?? "").localeCompare(
          b.code ?? b.countryCode ?? "",
        ),
    )
    .slice(0, 3);
}
export function reconcile(values: number[], total: number): void {
  const sum = values.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - total) > Math.max(1, total * 1e-8))
    throw new TradeError(
      "The returned records do not reconcile to total exports. Ranking completeness could not be verified.",
      "invalid",
    );
}

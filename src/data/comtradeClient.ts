import { TradeError } from "../lib/errors";
import {
  adaptBuyers,
  adaptProducts,
  adaptTotal,
  availableYears,
  safeRanking,
  adaptTradeBreakdown,
} from "./comtradeAdapter";
import { countryForM49 } from "./countryMapping";
import type {
  CountryTradeProfile,
  Ranking,
  TradeBreakdown,
  TradeBreakdownRequest,
} from "../domain/trade";
export async function request(
  kind: string,
  country: string,
  year?: number,
  signal?: AbortSignal,
  filters?: { product?: string; partner?: string },
): Promise<unknown> {
  const params = new URLSearchParams({ kind, country });
  if (year !== undefined) params.set("year", String(year));
  if (filters?.product !== undefined) params.set("product", filters.product);
  if (filters?.partner !== undefined) params.set("partner", filters.partner);
  const timeout = AbortSignal.timeout(55000);
  const combined = new AbortController();
  const abort = () => combined.abort();
  signal?.addEventListener("abort", abort, { once: true });
  timeout.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) combined.abort();
  try {
    const response = await fetch(`/api/comtrade?${params}`, {
      signal: combined.signal,
    });
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new TradeError(
        "The service returned an unreadable response.",
        "invalid",
      );
    }
    if (!response.ok) {
      const error = body as { error?: string; code?: TradeError["code"] };
      throw new TradeError(
        error.error ?? "The trade service is unavailable.",
        error.code ?? "http",
        Number(response.headers.get("Retry-After")) || 0,
      );
    }
    return body;
  } catch (e) {
    if (signal?.aborted) throw e;
    if (timeout.aborted)
      throw new TradeError(
        "The request timed out. Please try again.",
        "timeout",
      );
    if (e instanceof TradeError) throw e;
    throw new TradeError(
      "Could not connect. Check your connection and try again.",
      "network",
    );
  } finally {
    signal?.removeEventListener("abort", abort);
    timeout.removeEventListener("abort", abort);
  }
}
export const fetchAvailableYears = async (code: string, signal?: AbortSignal) =>
  availableYears(await request("availability", code, undefined, signal), code);
export async function fetchTradeBreakdown(
  context: TradeBreakdownRequest,
  signal?: AbortSignal,
): Promise<TradeBreakdown> {
  const filters =
    context.kind === "product-buyers"
      ? { product: context.productCode }
      : { partner: context.buyerCode };
  return adaptTradeBreakdown(
    await request(
      context.kind,
      context.countryCode,
      context.year,
      signal,
      filters,
    ),
    context,
  );
}
export async function fetchCountryTrade(
  code: string,
  year: number,
  signal?: AbortSignal,
): Promise<CountryTradeProfile> {
  const total = adaptTotal(
    await request("total", code, year, signal),
    code,
    year,
  );
  // Rankings fail independently; a validated total can still be shown.
  let quotaReason: string | undefined;
  const load = async <T>(
    kind: string,
    adapt: (body: unknown) => T[],
  ): Promise<Ranking<T>> => {
    if (quotaReason)
      return {
        status: "unavailable",
        items: [],
        reason: quotaReason,
        errorCode: "quota",
      };
    try {
      const body = await request(kind, code, year, signal);
      return safeRanking(() => adapt(body));
    } catch (e) {
      if (signal?.aborted) throw e;
      if (e instanceof TradeError && e.code === "quota")
        quotaReason = e.message;
      return {
        status: "unavailable",
        items: [],
        reason: e instanceof Error ? e.message : "Ranking unavailable.",
        errorCode: e instanceof TradeError ? e.code : "network",
      };
    }
  };
  const topProducts = await load("products", (body) =>
    adaptProducts(body, code, year, total.valueUsd, total.classification),
  );
  const topBuyers = await load("buyers", (body) =>
    adaptBuyers(body, code, year, total.valueUsd, total.classification),
  );
  return {
    countryCode: code,
    countryName: countryForM49(code)?.name ?? code,
    year,
    totalExportsUsd: total.valueUsd,
    classification: total.classification,
    topProducts,
    topBuyers,
    source: "UN_COMTRADE",
    periodType: "ANNUAL",
    lastFetchedAt: new Date().toISOString(),
  };
}

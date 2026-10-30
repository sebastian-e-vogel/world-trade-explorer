import type {
  CountryTradeProfile,
  ExportProduct,
  Ranking,
  TradePartner,
  TradeBreakdown,
  TradeBreakdownRequest,
} from "../domain/trade";
import { reconcile, sharePercent, topThree } from "../domain/rankings";
import { TradeError } from "../lib/errors";
import {
  countryForM49,
  isGeographicPartner,
  partnerForM49,
} from "./countryMapping";
export interface RawRecord {
  typeCode: string;
  freqCode: string;
  period: string | number;
  reporterCode: number;
  flowCode: string;
  partnerCode: number;
  partner2Code: number;
  cmdCode: string;
  cmdDesc: string | null;
  classificationCode: string;
  isOriginalClassification: boolean;
  aggrLevel: number | null;
  customsCode: string;
  motCode: number;
  primaryValue: number | null;
}
function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new TradeError("Invalid UN Comtrade response.", "invalid");
  return value as Record<string, unknown>;
}
export function parseEnvelope(value: unknown): RawRecord[] {
  const body = object(value);
  if (
    body.error ||
    !Array.isArray(body.data) ||
    body.count !== body.data.length ||
    body.data.length >= 500
  )
    throw new TradeError(
      "UN Comtrade returned an invalid or potentially truncated response.",
      "invalid",
    );
  return body.data.map((v) => object(v) as unknown as RawRecord);
}
export function availableYears(value: unknown, code: string): number[] {
  const rows = parseEnvelope(value) as unknown as Record<string, unknown>[];
  if (
    rows.some(
      (r) =>
        r.typeCode !== "C" ||
        r.freqCode !== "A" ||
        r.reporterCode !== Number(code) ||
        r.isOriginalClassification !== true ||
        !Number.isInteger(Number(r.period)) ||
        !/^\d{4}$/.test(String(r.period)),
    )
  )
    throw new TradeError("Invalid annual availability catalog.", "invalid");
  return [...new Set(rows.map((r) => Number(r.period)))].sort((a, b) => b - a);
}
function validateRows(
  value: unknown,
  code: string,
  year: number,
  classification?: string,
): RawRecord[] {
  const rows = parseEnvelope(value);
  for (const r of rows) {
    if (
      r.typeCode !== "C" ||
      r.freqCode !== "A" ||
      String(r.period) !== String(year) ||
      r.reporterCode !== Number(code) ||
      r.flowCode !== "X" ||
      r.partner2Code !== 0 ||
      r.customsCode !== "C00" ||
      r.motCode !== 0 ||
      r.isOriginalClassification !== true ||
      !/^H[0-6]$/.test(r.classificationCode) ||
      (classification && r.classificationCode !== classification) ||
      typeof r.primaryValue !== "number" ||
      !Number.isFinite(r.primaryValue) ||
      r.primaryValue < 0
    )
      throw new TradeError(
        "Records have missing values or inconsistent query dimensions.",
        "invalid",
      );
  }
  return rows;
}
export function adaptTotal(value: unknown, code: string, year: number) {
  const rows = validateRows(value, code, year);
  if (!rows.length)
    throw new TradeError(
      "No annual merchandise export total is available for this country and year.",
      "missing",
    );
  if (
    rows.length !== 1 ||
    rows[0].cmdCode !== "TOTAL" ||
    rows[0].partnerCode !== 0 ||
    rows[0].aggrLevel !== 0
  )
    throw new TradeError("Expected one World export total.", "invalid");
  return {
    valueUsd: rows[0].primaryValue!,
    classification: rows[0].classificationCode,
  };
}
export function adaptProducts(
  value: unknown,
  code: string,
  year: number,
  total: number,
  classification: string,
): ExportProduct[] {
  const rows = validateRows(value, code, year, classification);
  if (
    !rows.length ||
    rows.some(
      (r) =>
        r.aggrLevel !== 2 ||
        !/^\d{2}$/.test(r.cmdCode) ||
        r.partnerCode !== 0 ||
        !r.cmdDesc?.trim(),
    ) ||
    new Set(rows.map((r) => r.cmdCode)).size !== rows.length
  )
    throw new TradeError(
      "HS2 records are missing, duplicated or mixed with other levels.",
      "invalid",
    );
  reconcile(
    rows.map((r) => r.primaryValue!),
    total,
  );
  return topThree(
    rows.map((r) => ({
      code: r.cmdCode,
      name: r.cmdDesc!,
      valueUsd: r.primaryValue!,
      sharePercent: sharePercent(r.primaryValue!, total),
    })),
  );
}
export function adaptBuyers(
  value: unknown,
  code: string,
  year: number,
  total: number,
  classification: string,
): TradePartner[] {
  const rows = validateRows(value, code, year, classification);
  if (
    !rows.length ||
    rows.some(
      (r) =>
        r.cmdCode !== "TOTAL" ||
        r.aggrLevel !== 0 ||
        !Number.isInteger(r.partnerCode) ||
        r.partnerCode < 0,
    ) ||
    new Set(rows.map((r) => r.partnerCode)).size !== rows.length
  )
    throw new TradeError(
      "Partner records are missing or duplicated.",
      "invalid",
    );
  const world = rows.find((r) => r.partnerCode === 0);
  if (
    !world ||
    Math.abs(world.primaryValue! - total) > Math.max(1, total * 1e-8)
  )
    throw new TradeError(
      "The partner World total is missing or inconsistent.",
      "invalid",
    );
  const bilateral = rows.filter((r) => r.partnerCode !== 0);
  reconcile(
    bilateral.map((r) => r.primaryValue!),
    total,
  );
  // Reconcile all areas first; then rank geographic destinations only.
  return topThree(
    bilateral
      .filter((r) => isGeographicPartner(r.partnerCode))
      .map((r) => ({
        countryCode: String(r.partnerCode),
        name: partnerForM49(r.partnerCode)!.name,
        valueUsd: r.primaryValue!,
        sharePercent: sharePercent(r.primaryValue!, total),
      })),
  );
}
export function safeRanking<T>(fn: () => T[]): Ranking<T> {
  try {
    return { status: "complete", items: fn() };
  } catch (e) {
    return {
      status: "unavailable",
      items: [],
      reason: e instanceof Error ? e.message : "Ranking unavailable.",
      errorCode: e instanceof TradeError ? e.code : "invalid",
    };
  }
}
export function adaptTradeBreakdown(
  value: unknown,
  context: TradeBreakdownRequest,
): TradeBreakdown {
  const { countryCode, year, classification, totalValueUsd } = context;
  if (!Number.isFinite(totalValueUsd) || totalValueUsd <= 0)
    throw new TradeError(
      "A positive parent total is required for a breakdown.",
      "invalid",
    );
  const rows = validateRows(value, countryCode, year, classification);
  if (!rows.length)
    throw new TradeError(
      "No complete breakdown is available for this selection.",
      "missing",
    );
  const metadata = {
    source: "UN_COMTRADE" as const,
    lastFetchedAt: new Date().toISOString(),
  };
  if (context.kind === "product-buyers") {
    if (
      !/^\d{2}$/.test(context.productCode) ||
      rows.some(
        (row) =>
          row.cmdCode !== context.productCode ||
          row.aggrLevel !== 2 ||
          !Number.isInteger(row.partnerCode) ||
          row.partnerCode < 0,
      ) ||
      new Set(rows.map((row) => row.partnerCode)).size !== rows.length
    )
      throw new TradeError(
        "Product destinations are duplicated or have inconsistent dimensions.",
        "invalid",
      );
    const world = rows.find((row) => row.partnerCode === 0);
    if (!world)
      throw new TradeError("The product World total is missing.", "invalid");
    reconcile([world.primaryValue!], totalValueUsd);
    const bilateral = rows.filter((row) => row.partnerCode !== 0);
    reconcile(
      bilateral.map((row) => row.primaryValue!),
      totalValueUsd,
    );
    return {
      ...context,
      ...metadata,
      items: topThree(
        bilateral
          .filter(
            (row) =>
              isGeographicPartner(row.partnerCode) && row.primaryValue! > 0,
          )
          .map((row) => ({
            countryCode: String(row.partnerCode),
            name: partnerForM49(row.partnerCode)!.name,
            valueUsd: row.primaryValue!,
            sharePercent: sharePercent(row.primaryValue!, totalValueUsd),
          })),
      ),
    };
  }
  const partner = Number(context.buyerCode);
  if (
    !isGeographicPartner(partner) ||
    rows.some(
      (row) =>
        row.partnerCode !== partner ||
        row.aggrLevel !== 2 ||
        !/^\d{2}$/.test(row.cmdCode) ||
        !row.cmdDesc?.trim(),
    ) ||
    new Set(rows.map((row) => row.cmdCode)).size !== rows.length
  )
    throw new TradeError(
      "Bilateral HS2 records are duplicated or have inconsistent dimensions.",
      "invalid",
    );
  reconcile(
    rows.map((row) => row.primaryValue!),
    totalValueUsd,
  );
  return {
    ...context,
    ...metadata,
    items: topThree(
      rows
        .filter((row) => row.primaryValue! > 0)
        .map((row) => ({
          code: row.cmdCode,
          name: row.cmdDesc!,
          valueUsd: row.primaryValue!,
          sharePercent: sharePercent(row.primaryValue!, totalValueUsd),
        })),
    ),
  };
}
export function adaptProfile(
  code: string,
  year: number,
  totalBody: unknown,
  productsBody: unknown,
  buyersBody: unknown,
): CountryTradeProfile {
  const total = adaptTotal(totalBody, code, year);
  return {
    countryCode: code,
    countryName: countryForM49(code)?.name ?? code,
    year,
    totalExportsUsd: total.valueUsd,
    classification: total.classification,
    topProducts: safeRanking(() =>
      adaptProducts(
        productsBody,
        code,
        year,
        total.valueUsd,
        total.classification,
      ),
    ),
    topBuyers: safeRanking(() =>
      adaptBuyers(buyersBody, code, year, total.valueUsd, total.classification),
    ),
    source: "UN_COMTRADE",
    periodType: "ANNUAL",
    lastFetchedAt: new Date().toISOString(),
  };
}

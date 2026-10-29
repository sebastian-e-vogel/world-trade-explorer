export type TradeIssueCode =
  | "network"
  | "timeout"
  | "rate-limit"
  | "quota"
  | "invalid"
  | "missing"
  | "http";
export interface ExportProduct {
  code: string;
  name: string;
  valueUsd: number;
  sharePercent: number;
}
export interface TradePartner {
  countryCode: string;
  name: string;
  valueUsd: number;
  sharePercent: number;
}
export type Ranking<T> =
  | { status: "complete"; items: T[] }
  | {
      status: "unavailable";
      reason: string;
      errorCode?: TradeIssueCode;
      items: [];
    };
export interface CountryTradeProfile {
  countryCode: string;
  countryName: string;
  year: number;
  totalExportsUsd: number;
  topProducts: Ranking<ExportProduct>;
  topBuyers: Ranking<TradePartner>;
  source: "UN_COMTRADE";
  periodType: "ANNUAL";
  classification: string;
  lastFetchedAt: string;
}

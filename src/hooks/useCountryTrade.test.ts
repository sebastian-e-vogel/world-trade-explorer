import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { countryTradeKeys, queryDefaults } from "./useCountryTrade";
import { TradeError } from "../lib/errors";

describe("trade query cache", () => {
  it("deduplicates concurrent requests and reuses fresh data", async () => {
    const client = new QueryClient();
    const queryFn = vi.fn().mockResolvedValue({ total: 42 });
    const options = { ...queryDefaults, queryKey: countryTradeKeys.profile("32", 2025), queryFn };
    try {
      const [first, second] = await Promise.all([client.fetchQuery(options), client.fetchQuery(options)]);
      expect(first).toEqual(second);
      await client.fetchQuery(options);
      expect(queryFn).toHaveBeenCalledTimes(1);
    } finally { client.clear(); }
  });

  it("keeps countries and years in separate cache entries", () => {
    const client = new QueryClient();
    try {
      client.setQueryData(countryTradeKeys.profile("32", 2025), { total: 100 });
      client.setQueryData(countryTradeKeys.profile("76", 2025), { total: 200 });
      client.setQueryData(countryTradeKeys.profile("32", 2024), { total: 300 });
      expect(client.getQueryData(countryTradeKeys.profile("32", 2025))).toEqual({ total: 100 });
      expect(client.getQueryData(countryTradeKeys.profile("76", 2025))).toEqual({ total: 200 });
      expect(client.getQueryData(countryTradeKeys.profile("32", 2024))).toEqual({ total: 300 });
      expect(client.getQueryData(countryTradeKeys.availability("32"))).toBeUndefined();
    } finally { client.clear(); }
  });

  it("retries temporary failures once and avoids quota or invalid-data retries", () => {
    expect(queryDefaults.retry(0, new TradeError("offline", "network"))).toBe(true);
    expect(queryDefaults.retry(1, new TradeError("offline", "network"))).toBe(false);
    for (const code of ["quota", "rate-limit", "invalid", "missing"] as const) {
      expect(queryDefaults.retry(0, new TradeError("unavailable", code))).toBe(false);
    }
  });
});

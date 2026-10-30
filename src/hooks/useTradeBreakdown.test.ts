import { QueryClient } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fixture from "../../tests/fixtures/breakdowns-32-2025.json";
import type { TradeBreakdownRequest } from "../domain/trade";
import { TradeBreakdown } from "../components/TradeBreakdown";
import { LanguageProvider } from "../i18n/LanguageContext";
import { fetchTradeBreakdown } from "../data/comtradeClient";
import { tradeBreakdownKey } from "./useTradeBreakdown";
import { queryDefaults } from "./useCountryTrade";

const context: TradeBreakdownRequest = {
  kind: "product-buyers",
  countryCode: "32",
  year: 2025,
  classification: "H6",
  productCode: "10",
  totalValueUsd: 10462655969.12,
};
afterEach(() => vi.unstubAllGlobals());

it("renders collapsed details without creating a query or making a request", () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  // No QueryClientProvider is needed until the details are opened.
  const html = renderToStaticMarkup(
    createElement(
      LanguageProvider,
      null,
      createElement(TradeBreakdown, { context, label: "Cereals" }),
    ),
  );
  expect(html).toContain('aria-expanded="false"');
  expect(html).toContain('hidden=""');
  expect(fetch).not.toHaveBeenCalled();
});

it("caches verified breakdowns and preserves HS2 selectors in the request URL", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(fixture["product-10"])));
  vi.stubGlobal("fetch", fetch);
  const client = new QueryClient();
  const options = {
    ...queryDefaults,
    queryKey: tradeBreakdownKey(context),
    queryFn: () => fetchTradeBreakdown(context),
  };
  try {
    await client.fetchQuery(options);
    await client.fetchQuery(options);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toBe(
      "/api/comtrade?kind=product-buyers&country=32&year=2025&product=10",
    );
  } finally {
    client.clear();
  }
});

it("isolates each exporter, year, classification, selector, and parent denominator", () => {
  const contexts: TradeBreakdownRequest[] = [
    context,
    { ...context, countryCode: "76" },
    { ...context, year: 2024 },
    { ...context, classification: "H5" },
    { ...context, productCode: "01" },
    { ...context, totalValueUsd: context.totalValueUsd + 1 },
    {
      kind: "buyer-products",
      countryCode: "32",
      year: 2025,
      classification: "H6",
      buyerCode: "76",
      totalValueUsd: 12783029019.98,
    },
  ];
  expect(
    new Set(contexts.map((item) => JSON.stringify(tradeBreakdownKey(item))))
      .size,
  ).toBe(contexts.length);
});

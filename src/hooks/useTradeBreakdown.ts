import { useQuery } from "@tanstack/react-query";
import { fetchTradeBreakdown } from "../data/comtradeClient";
import type { TradeBreakdownRequest } from "../domain/trade";
import { queryDefaults } from "./useCountryTrade";

export const tradeBreakdownKey = (context: TradeBreakdownRequest) =>
  [
    "comtrade",
    "breakdown",
    "C",
    "A",
    "HS",
    "X",
    context.countryCode,
    context.year,
    context.classification,
    context.kind,
    context.kind === "product-buyers" ? context.productCode : context.buyerCode,
    context.totalValueUsd,
  ] as const;

export function useTradeBreakdown(context: TradeBreakdownRequest) {
  return useQuery({
    ...queryDefaults,
    retryOnMount: false,
    queryKey: tradeBreakdownKey(context),
    queryFn: ({ signal }) => fetchTradeBreakdown(context, signal),
  });
}

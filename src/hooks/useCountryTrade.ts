import { useQuery } from "@tanstack/react-query";
import { fetchAvailableYears, fetchCountryTrade } from "../data/comtradeClient";
import { TradeError } from "../lib/errors";
export const countryTradeKeys = {
  availability: (country: string) =>
    ["comtrade", "availability", "C", "A", "HS", country] as const,
  profile: (country: string, year: number | undefined) =>
    ["comtrade", "profile", "C", "A", "HS", "X", "AG2", country, year] as const,
};
export const queryDefaults = {
  staleTime: 24 * 60 * 60 * 1000,
  gcTime: 7 * 24 * 60 * 60 * 1000,
  refetchOnWindowFocus: false,
  retry: (count: number, error: Error) =>
    count < 1 &&
    error instanceof TradeError &&
    ["network", "timeout", "http"].includes(error.code),
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 10000),
};
export function useCountryTrade(
  country: string,
  requestedYear: number | undefined,
) {
  const availability = useQuery({
    ...queryDefaults,
    queryKey: countryTradeKeys.availability(country),
    queryFn: ({ signal }) => fetchAvailableYears(country, signal),
  });
  const years = availability.data ?? [];
  const year =
    requestedYear !== undefined && years.includes(requestedYear)
      ? requestedYear
      : years[0];
  const profile = useQuery({
    ...queryDefaults,
    queryKey: countryTradeKeys.profile(country, year),
    queryFn: ({ signal }) => fetchCountryTrade(country, year!, signal),
    enabled: year !== undefined,
  });
  return { availability, profile, years, year };
}

import { afterEach, it, expect, vi } from "vitest";
import arg from "../../tests/fixtures/32.json";
import { fetchCountryTrade, request } from "./comtradeClient";
import { TradeError } from "../lib/errors";
afterEach(() => vi.unstubAllGlobals());
it("never converts a network error into a zero profile", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
  await expect(request("total", "32", 2025)).rejects.toMatchObject({
    code: "network",
  });
});
it("reports rate limits and retry information", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: "Please wait.", code: "rate-limit" }),
          { status: 429, headers: { "Retry-After": "2" } },
        ),
      ),
  );
  await expect(request("total", "32", 2025)).rejects.toMatchObject({
    code: "rate-limit",
    retryAfter: 2,
  });
});
it("rejects invalid JSON", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("<html>failure</html>")),
  );
  await expect(request("total", "32", 2025)).rejects.toMatchObject({
    code: "invalid",
  });
});
it("stops further ranking requests after a daily quota failure", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(arg.total)))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: "Daily quota exhausted.", code: "quota" }),
        { status: 429 },
      ),
    );
  vi.stubGlobal("fetch", fetch);
  const profile = await fetchCountryTrade("32", 2025);
  expect(profile.totalExportsUsd).toBe(arg.total.data[0].primaryValue);
  expect(profile.topProducts.status).toBe("unavailable");
  expect(profile.topBuyers.status).toBe("unavailable");
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("retains complete buyers when the product response is truncated", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(arg.total)))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ count: 500, data: Array(500).fill({}), error: "" }),
      ),
    )
    .mockResolvedValueOnce(new Response(JSON.stringify(arg.partners)));
  vi.stubGlobal("fetch", fetch);
  const profile = await fetchCountryTrade("32", 2025);
  expect(profile.topProducts.status).toBe("unavailable");
  expect(profile.topBuyers.status).toBe("complete");
  expect(fetch.mock.calls.map((c) => String(c[0]))).toEqual([
    "/api/comtrade?kind=total&country=32&year=2025",
    "/api/comtrade?kind=products&country=32&year=2025",
    "/api/comtrade?kind=buyers&country=32&year=2025",
  ]);
});
it("preserves explicit service errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new TradeError("timed out", "timeout")),
  );
  await expect(request("total", "32", 2025)).rejects.toMatchObject({
    code: "timeout",
  });
});

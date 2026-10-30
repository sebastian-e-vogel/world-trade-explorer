import { afterEach, describe, it, expect, vi } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
import { upstreamUrl } from "./comtradeProxy";
it("bounds the proxy to fixed public UN Comtrade queries", () => {
  const u = upstreamUrl(
    new URLSearchParams({ kind: "products", country: "32", year: "2025" }),
  );
  expect(u.origin).toBe("https://comtradeapi.un.org");
  expect(u.searchParams.get("cmdCode")).toBe("AG2");
  expect(u.searchParams.get("partner2Code")).toBe("0");
  const partners = upstreamUrl(
    new URLSearchParams({ kind: "buyers", country: "842", year: "2025" }),
  );
  expect(partners.searchParams.has("partnerCode")).toBe(false);
  const productBuyers = upstreamUrl(
    new URLSearchParams({
      kind: "product-buyers",
      country: "32",
      year: "2025",
      product: "01",
    }),
  );
  expect(productBuyers.searchParams.get("cmdCode")).toBe("01");
  expect(productBuyers.searchParams.has("partnerCode")).toBe(false);
  const buyerProducts = upstreamUrl(
    new URLSearchParams({
      kind: "buyer-products",
      country: "32",
      year: "2025",
      partner: "608",
    }),
  );
  expect(buyerProducts.searchParams.get("cmdCode")).toBe("AG2");
  expect(buyerProducts.searchParams.get("partnerCode")).toBe("608");
  for (const input of [
    "kind=products&country=32&year=2025&url=https://example.com",
    "kind=bad&country=32",
    "kind=total&country=32&year=2025&year=2024",
    "kind=total&country=0&year=2025",
    "kind=total&country=32&year=202501",
    "kind=product-buyers&country=32&year=2025",
    "kind=product-buyers&country=32&year=2025&product=1",
    "kind=product-buyers&country=32&year=2025&product=01,02",
    "kind=product-buyers&country=32&year=2025&product=01&product=02",
    "kind=buyer-products&country=32&year=2025&partner=0",
    "kind=buyer-products&country=32&year=2025&partner=899",
    "kind=buyer-products&country=32&year=2025&partner=76&product=10",
  ])
    expect(() => upstreamUrl(new URLSearchParams(input))).toThrow();
});

describe("proxy responses", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function invoke(
    method = "GET",
    url = "/?kind=total&country=32&year=2025",
  ) {
    vi.resetModules();
    const { handleComtrade } = await import("./comtradeProxy");
    const headers: Record<string, string> = {};
    let body = "";
    const response = {
      statusCode: 200,
      setHeader: (name: string, value: string) => {
        headers[name] = value;
      },
      end: (value: string) => {
        body = value;
      },
    };
    const pending = handleComtrade(
      { method, url } as IncomingMessage,
      response as unknown as ServerResponse,
    );
    await vi.runAllTimersAsync();
    await pending;
    return { status: response.statusCode, headers, body: JSON.parse(body) };
  }

  it("rejects invalid input and unsupported methods before contacting Comtrade", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect((await invoke("POST")).status).toBe(405);
    expect(
      (await invoke("GET", "/?kind=total&country=0&year=2025")).status,
    ).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns validated JSON and permits caching only on success", async () => {
    vi.useFakeTimers();
    const data = { data: [{ primaryValue: 123 }], count: 1, error: "" };
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(data)));
    vi.stubGlobal("fetch", fetch);
    const result = await invoke();
    expect(result.status).toBe(200);
    expect(result.body).toEqual(data);
    expect(result.headers["Cache-Control"]).toContain("s-maxage=86400");
    expect(String(fetch.mock.calls[0][0])).toContain(
      "comtradeapi.un.org/public/v1/preview/",
    );
    expect(fetch.mock.calls[0][1].headers).toEqual({
      Accept: "application/json",
    });
  });

  it("does not retry an identified daily quota exhaustion", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockResolvedValue(
      new Response("Daily quota exhausted", {
        status: 429,
        headers: { "Retry-After": "86400" },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const result = await invoke();
    expect(result.status).toBe(429);
    expect(result.body.code).toBe("quota");
    expect(result.headers["Retry-After"]).toBe("86400");
    expect(result.headers["Cache-Control"]).toBe("no-store");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries a short transient rate limit only once", async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("Rate limit exceeded", {
          status: 429,
          headers: { "Retry-After": "1" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("Rate limit exceeded", {
          status: 429,
          headers: { "Retry-After": "2" },
        }),
      );
    vi.stubGlobal("fetch", fetch);
    const result = await invoke();
    expect(result.status).toBe(429);
    expect(result.body.code).toBe("rate-limit");
    expect(result.headers["Retry-After"]).toBe("2");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    [
      "timeout",
      new DOMException("Request timed out", "TimeoutError"),
      504,
      "timeout",
    ],
    ["network", new TypeError("Could not connect"), 502, "network"],
  ])(
    "maps %s failures to structured errors",
    async (_label, error, status, code) => {
      vi.useFakeTimers();
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
      const result = await invoke();
      expect(result.status).toBe(status);
      expect(result.body.code).toBe(code);
      expect(result.headers["Cache-Control"]).toBe("no-store");
    },
  );

  it("rejects an unreadable upstream response without forwarding its body", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>internal failure</html>")),
    );
    const result = await invoke();
    expect(result.status).toBe(502);
    expect(result.body.error).not.toContain("internal failure");
  });
});

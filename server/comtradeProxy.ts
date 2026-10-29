import type { IncomingMessage, ServerResponse } from "node:http";
import { countries } from "../src/data/countryMapping.js";
const allowedCountries = new Set(countries.map((c) => c.m49));
export type QueryKind = "availability" | "total" | "products" | "buyers";
export function upstreamUrl(params: URLSearchParams): URL {
  const kind = params.get("kind");
  const country = params.get("country");
  const year = params.get("year");
  if (
    !kind ||
    !["availability", "total", "products", "buyers"].includes(kind) ||
    !country ||
    !allowedCountries.has(country) ||
    (kind !== "availability" &&
      (!year ||
        !/^\d{4}$/.test(year) ||
        Number(year) < 1962 ||
        Number(year) > new Date().getUTCFullYear())) ||
    [...params.keys()].some((k) => !["kind", "country", "year"].includes(k)) ||
    [...params.keys()].some((k) => params.getAll(k).length !== 1)
  )
    throw new Error("Invalid country, year or query kind.");
  const url = new URL(
    kind === "availability"
      ? "https://comtradeapi.un.org/public/v1/getDA/C/A/HS"
      : "https://comtradeapi.un.org/public/v1/preview/C/A/HS",
  );
  url.searchParams.set("reporterCode", country);
  if (kind !== "availability") {
    Object.entries({
      period: year!,
      cmdCode: kind === "products" ? "AG2" : "TOTAL",
      flowCode: "X",
      partner2Code: "0",
      customsCode: "C00",
      motCode: "0",
      includeDesc: "true",
    }).forEach(([k, v]) => url.searchParams.set(k, v));
    if (kind !== "buyers") url.searchParams.set("partnerCode", "0");
  }
  return url;
}
// Pace within a warm function instance. Provider limits still apply across instances.
let queue: Promise<void> = Promise.resolve();
let lastStart = 0;
async function pacedFetch(url: URL): Promise<Response> {
  let release!: () => void;
  const previous = queue;
  queue = new Promise<void>((r) => {
    release = r;
  });
  await previous;
  try {
    await new Promise((r) =>
      setTimeout(r, Math.max(0, 2200 - (Date.now() - lastStart))),
    );
    lastStart = Date.now();
    return await fetch(url, {
      signal: AbortSignal.timeout(18000),
      headers: { Accept: "application/json" },
    });
  } finally {
    release();
  }
}
export async function handleComtrade(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "GET requests only.", code: "http" }));
    return;
  }
  let url: URL;
  try {
    url = upstreamUrl(new URL(req.url ?? "/", "http://localhost").searchParams);
  } catch {
    res.statusCode = 400;
    res.end(
      JSON.stringify({
        error: "Invalid country, year or query kind.",
        code: "invalid",
      }),
    );
    return;
  }
  try {
    let upstream = await pacedFetch(url);
    if (upstream.status === 429) {
      const message = await upstream.text();
      const daily = /quota|daily|day|86400/i.test(message);
      const wait = Number(upstream.headers.get("Retry-After"));
      if (!daily && Number.isFinite(wait) && wait > 0 && wait <= 5) {
        await new Promise((r) => setTimeout(r, (wait + 1) * 1000));
        upstream = await pacedFetch(url);
      } else {
        res.statusCode = 429;
        res.setHeader(
          "Retry-After",
          String(wait > 0 ? Math.min(wait, 86400) : 60),
        );
        res.end(
          JSON.stringify({
            error: daily
              ? "UN Comtrade daily quota is exhausted. Please try after the quota resets."
              : "UN Comtrade is rate limiting requests. Please wait before retrying.",
            code: daily ? "quota" : "rate-limit",
          }),
        );
        return;
      }
    }
    if (!upstream.ok) {
      const body = await upstream.text();
      const daily =
        upstream.status === 429 && /quota|daily|day|86400/i.test(body);
      res.statusCode = upstream.status === 429 ? 429 : 502;
      if (upstream.status === 429)
        res.setHeader(
          "Retry-After",
          upstream.headers.get("Retry-After") ?? "60",
        );
      res.end(
        JSON.stringify({
          error: daily
            ? "UN Comtrade daily quota is exhausted. Please try after the quota resets."
            : upstream.status === 429
              ? "UN Comtrade is rate limiting requests. Please wait before retrying."
              : "UN Comtrade is temporarily unavailable.",
          code: daily
            ? "quota"
            : upstream.status === 429
              ? "rate-limit"
              : "http",
        }),
      );
      return;
    }
    const data: unknown = await upstream.json();
    if (
      !data ||
      typeof data !== "object" ||
      !Array.isArray((data as { data?: unknown }).data) ||
      (data as { error?: unknown }).error
    )
      throw new Error("Invalid upstream body");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=86400");
    res.end(JSON.stringify(data));
  } catch (e) {
    const timedOut = e instanceof Error && /timeout|abort/i.test(e.name);
    res.statusCode = timedOut ? 504 : 502;
    res.end(
      JSON.stringify({
        error: timedOut
          ? "The UN Comtrade request timed out. Please retry."
          : "UN Comtrade returned an unreadable response or could not be reached.",
        code: timedOut ? "timeout" : "network",
      }),
    );
  }
}

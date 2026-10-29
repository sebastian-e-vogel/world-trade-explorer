import { beforeEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import argentina from "../../tests/fixtures/32.json";
import { adaptProfile } from "../data/comtradeAdapter";
import { TradeDashboard } from "./TradeDashboard";
import { LanguageProvider } from "../i18n/LanguageContext";
import { i18n } from "../i18n/engine";
import { exactUsd, percent } from "../lib/format";

beforeEach(async () => { await i18n.changeLanguage("en"); });
const profile = () => adaptProfile("32", 2025, argentina.total, argentina.hs2, argentina.partners);
const render = (value: ReturnType<typeof profile>) => renderToStaticMarkup(
  createElement(LanguageProvider, null, createElement(TradeDashboard, { profile: value })),
);

describe("trade dashboard", () => {
  it("renders verified totals, rankings, shares, and source metadata", () => {
    const value = profile();
    const html = render(value);
    expect(html).toContain("$87.11B");
    expect(html).toContain(exactUsd(value.totalExportsUsd));
    expect(html).toContain("Leading exports");
    expect(html).toContain("Top destinations");
    expect(html).toContain("2025");
    expect(html).toContain("UN Comtrade");
    expect(html).toContain(value.classification);
    for (const item of value.topProducts.items) {
      expect(html).toContain(`class="rank-index">${item.code}</div>`);
      expect(html).toContain(percent(item.sharePercent));
    }
    expect((html.match(/class="rank-content"/g) ?? []).length).toBe(6);
  });

  it("retains the total and buyers when a product ranking is unavailable", () => {
    const value = profile();
    value.topProducts = { status: "unavailable", items: [], reason: "Truncated response", errorCode: "invalid" };
    const html = render(value);
    expect(html).toContain("$87.11B");
    expect(html).toContain("Ranking unavailable");
    expect(html).toContain("Incomplete results are never presented as a verified top three.");
    expect((html.match(/class="rank-content"/g) ?? []).length).toBe(3);
  });
});

import { describe, it, expect } from "vitest";
import arg from "../../tests/fixtures/32.json";
import bra from "../../tests/fixtures/76.json";
import usa from "../../tests/fixtures/842.json";
import ssd from "../../tests/fixtures/728.json";
import {
  adaptProfile,
  adaptBuyers,
  adaptProducts,
  adaptTotal,
  availableYears,
  parseEnvelope,
} from "./comtradeAdapter";
import { countryForMapId, countryForIso, mapIdForM49 } from "./countryMapping";
import { sharePercent, topThree } from "../domain/rankings";
const copy = <T>(v: T): T => structuredClone(v);
describe("saved live response integration", () => {
  for (const [code, data] of [
    ["32", arg],
    ["76", bra],
    ["842", usa],
    ["728", ssd],
  ] as const) {
    it(`validates ${code} total and both complete rankings`, () => {
      const p = adaptProfile(code, 2025, data.total, data.hs2, data.partners);
      expect(p.totalExportsUsd).toBe(data.total.data[0].primaryValue);
      expect(p.topProducts.status).toBe("complete");
      expect(p.topBuyers.status).toBe("complete");
      expect(p.topProducts.items).toHaveLength(3);
      expect(p.topBuyers.items).toHaveLength(3);
      expect(p.topBuyers.items[0].valueUsd).toBeGreaterThan(
        p.topBuyers.items[1].valueUsd,
      );
      expect(p.topProducts.items[0].valueUsd).toBeGreaterThan(
        p.topProducts.items[1].valueUsd,
      );
    });
  }
  it("uses country-specific annual periods", () => {
    expect(availableYears(ssd.availability, "728")).toEqual([2025]);
    expect(availableYears(arg.availability, "32")[0]).toBe(2025);
  });
});
describe("ranking correctness", () => {
  const total = arg.total.data[0].primaryValue;
  it("sorts both domain entity kinds without mutating input", () => {
    const xs = [
      { code: "01", valueUsd: 3 },
      { code: "02", valueUsd: 9 },
    ];
    expect(topThree(xs)[0].code).toBe("02");
    expect(xs[0].code).toBe("01");
    expect(
      topThree([
        { countryCode: "32", valueUsd: 3 },
        { countryCode: "76", valueUsd: 4 },
      ])[0].countryCode,
    ).toBe("76");
  });
  it("calculates percentages and rejects invalid denominators", () => {
    expect(sharePercent(25, 200)).toBe(12.5);
    expect(() => sharePercent(1, 0)).toThrow();
    expect(() => sharePercent(NaN, 1)).toThrow();
  });
  it("excludes World and uses World as the share denominator", () => {
    const rows = adaptBuyers(arg.partners, "32", 2025, total, "H6");
    expect(rows.map((r) => r.countryCode)).toEqual(["76", "156", "842"]);
    expect(rows[0].sharePercent).toBeCloseTo((rows[0].valueUsd / total) * 100);
  });
  it("retains a historical destination even without a current map boundary", () => {
    const v = copy(arg.partners);
    v.data.find((r) => r.partnerCode === 76)!.partnerCode = 810;
    const items = adaptBuyers(v, "32", 2025, total, "H6");
    expect(items[0].countryCode).toBe("810");
    expect(items[0].name).toMatch(/USSR/);
    expect(mapIdForM49("810")).toBe("");
  });
  it("rejects duplicated partner records instead of double-counting", () => {
    const v = copy(arg.partners);
    v.data.push(v.data[1]);
    v.count++;
    expect(() => adaptBuyers(v, "32", 2025, total, "H6")).toThrow(/duplicated/);
  });
  it("rejects duplicated chapters and mixed parent-child levels", () => {
    const v = copy(arg.hs2);
    v.data.push(v.data[0]);
    v.count++;
    expect(() => adaptProducts(v, "32", 2025, total, "H6")).toThrow();
    const mixed = copy(arg.hs2);
    mixed.data[0].cmdCode = "0101";
    mixed.data[0].aggrLevel = 4;
    expect(() => adaptProducts(mixed, "32", 2025, total, "H6")).toThrow();
  });
  it("rejects null and missing values without coercing to zero", () => {
    for (const value of [null, undefined]) {
      const v = copy(arg.total) as unknown as {
        data: { primaryValue: unknown }[];
      };
      v.data[0].primaryValue = value;
      expect(() => adaptTotal(v, "32", 2025)).toThrow();
    }
  });
  it("preserves leading zeros", () => {
    const v = copy(arg.hs2);
    const first = v.data.find((r) => r.cmdCode === "01")!;
    const remaining = v.data.filter((r) => r !== first);
    first.primaryValue = total - remaining.length;
    remaining.forEach((r) => (r.primaryValue = 1));
    expect(adaptProducts(v, "32", 2025, total, "H6")[0].code).toBe("01");
  });
  it("detects record caps, count mismatches and missing rows", () => {
    expect(() =>
      parseEnvelope({ count: 500, data: Array(500).fill({}), error: "" }),
    ).toThrow();
    expect(() => parseEnvelope({ count: 2, data: [{}], error: "" })).toThrow();
    const v = copy(arg.hs2);
    v.data.pop();
    v.count--;
    expect(() => adaptProducts(v, "32", 2025, total, "H6")).toThrow(
      /reconcile/,
    );
  });
  it("rejects mixed revisions and unexpected dimensions", () => {
    const v = copy(arg.hs2);
    v.data[0].classificationCode = "H5";
    expect(() => adaptProducts(v, "32", 2025, total, "H6")).toThrow();
    v.data[0].classificationCode = "H6";
    v.data[0].partner2Code = 76;
    expect(() => adaptProducts(v, "32", 2025, total, "H6")).toThrow();
  });
  it("represents unavailable rankings separately from valid totals", () => {
    const p = adaptProfile(
      "32",
      2025,
      arg.total,
      { count: 0, data: [], error: "" },
      arg.partners,
    );
    expect(p.totalExportsUsd).toBe(total);
    expect(p.topProducts.status).toBe("unavailable");
    expect(p.topBuyers.status).toBe("complete");
  });
  it("does not interpret absent data as zero", () => {
    expect(() =>
      adaptTotal({ count: 0, data: [], error: "" }, "32", 2026),
    ).toThrow(/No annual/);
  });
  it("maps trade and ISO identifiers including the US exception", () => {
    expect(countryForMapId("032")?.iso3).toBe("ARG");
    expect(countryForMapId(840)?.m49).toBe("842");
    expect(mapIdForM49("842")).toBe("840");
    expect(countryForIso("bra")?.m49).toBe("76");
    expect(countryForMapId(356)?.m49).toBe("699");
    expect(countryForMapId(250)?.m49).toBe("251");
    expect(mapIdForM49("699")).toBe("356");
    expect(countryForMapId(-99)).toBeUndefined();
  });
});

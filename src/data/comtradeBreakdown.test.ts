import { describe, expect, it } from "vitest";
import fixtures from "../../tests/fixtures/breakdowns-32-2025.json";
import { adaptTradeBreakdown } from "./comtradeAdapter";
import type { TradeBreakdownRequest } from "../domain/trade";

const cereal: TradeBreakdownRequest = {
  kind: "product-buyers",
  countryCode: "32",
  year: 2025,
  classification: "H6",
  productCode: "10",
  totalValueUsd: 10462655969.12,
};
const brazil: TradeBreakdownRequest = {
  kind: "buyer-products",
  countryCode: "32",
  year: 2025,
  classification: "H6",
  buyerCode: "76",
  totalValueUsd: 12783029019.98,
};
const clone = <T>(value: T): T => structuredClone(value);

describe("verified product and buyer breakdowns", () => {
  it("finds each product's own buyers, beyond the general destination ranking", () => {
    const result = adaptTradeBreakdown(fixtures["product-10"], cereal);
    expect(result.kind).toBe("product-buyers");
    expect(
      result.items.map((item) => "countryCode" in item && item.countryCode),
    ).toEqual(["76", "704", "604"]);
    expect(result.items[0].sharePercent).toBeCloseTo(13.9295691267);
    expect(result.items[0].valueUsd).toBe(1457402895.71);
  });

  it("finds a buyer's own products rather than restricting them to the exporter's top three", () => {
    const result = adaptTradeBreakdown(fixtures["buyer-76"], brazil);
    expect(result.items.map((item) => "code" in item && item.code)).toEqual([
      "87",
      "10",
      "27",
    ]);
    expect(result.items[0].sharePercent).toBeCloseTo(43.8018896133);
    expect(result.items[1].sharePercent).toBeCloseTo(11.4010763289);
  });

  it("uses different denominators for the same bilateral flow", () => {
    const product = adaptTradeBreakdown(fixtures["product-10"], cereal)
      .items[0];
    const buyer = adaptTradeBreakdown(fixtures["buyer-76"], brazil).items[1];
    expect(product.valueUsd).toBe(buyer.valueUsd);
    expect(product.sharePercent).not.toBe(buyer.sharePercent);
    expect(product.sharePercent).toBeCloseTo(
      (product.valueUsd / cereal.totalValueUsd) * 100,
    );
    expect(buyer.sharePercent).toBeCloseTo(
      (buyer.valueUsd / brazil.totalValueUsd) * 100,
    );
  });

  it("preserves leading zeros in bilateral HS2 codes", () => {
    const result = adaptTradeBreakdown(fixtures["buyer-156"], {
      ...brazil,
      buyerCode: "156",
      totalValueUsd: 9716808774.15,
    });
    expect(result.items.map((item) => "code" in item && item.code)).toEqual([
      "12",
      "02",
      "28",
    ]);
  });

  it.each([
    [
      "product-99",
      { ...cereal, productCode: "99", totalValueUsd: 11458883869.62 },
    ],
    [
      "product-27",
      { ...cereal, productCode: "27", totalValueUsd: 8944385464.1 },
    ],
    [
      "buyer-842",
      { ...brazil, buyerCode: "842", totalValueUsd: 8326621834.85 },
    ],
  ] as const)("reconciles the saved %s response", (name, context) => {
    const result = adaptTradeBreakdown(fixtures[name], context);
    expect(result.items).toHaveLength(3);
    expect(result.totalValueUsd).toBe(context.totalValueUsd);
  });

  it("keeps residual areas in coverage checks but excludes them and World from country rankings", () => {
    const context = {
      ...cereal,
      productCode: "99",
      totalValueUsd: 11458883869.62,
    };
    const result = adaptTradeBreakdown(fixtures["product-99"], context);
    expect(
      result.items.map((item) => "countryCode" in item && item.countryCode),
    ).toEqual(["842", "699", "124"]);
    const missingResidual = clone(fixtures["product-99"]);
    missingResidual.data = missingResidual.data.filter(
      (row) => row.partnerCode !== 899,
    );
    missingResidual.count = missingResidual.data.length;
    expect(() => adaptTradeBreakdown(missingResidual, context)).toThrow(
      /reconcile/,
    );
  });

  it("rejects a different parent total or HS classification", () => {
    expect(() =>
      adaptTradeBreakdown(fixtures["product-10"], {
        ...cereal,
        totalValueUsd: cereal.totalValueUsd * 2,
      }),
    ).toThrow();
    expect(() =>
      adaptTradeBreakdown(fixtures["buyer-76"], {
        ...brazil,
        classification: "H5",
      }),
    ).toThrow();
    expect(() =>
      adaptTradeBreakdown(fixtures["product-10"], {
        ...cereal,
        totalValueUsd: 0,
      }),
    ).toThrow();
  });

  it("rejects truncated responses, duplicate keys, and a missing product World total", () => {
    expect(() =>
      adaptTradeBreakdown({ count: 500, data: Array(500).fill({}) }, cereal),
    ).toThrow();
    const duplicate = clone(fixtures["product-10"]);
    duplicate.data.push(duplicate.data[1]);
    duplicate.count++;
    expect(() => adaptTradeBreakdown(duplicate, cereal)).toThrow(/duplicated/);
    const missingWorld = clone(fixtures["product-10"]);
    missingWorld.data = missingWorld.data.filter(
      (row) => row.partnerCode !== 0,
    );
    missingWorld.count--;
    expect(() => adaptTradeBreakdown(missingWorld, cereal)).toThrow(
      /World total/,
    );
  });

  it("rejects null values, mixed levels, and another destination's records", () => {
    const missingValue = clone(fixtures["buyer-76"]);
    const missing = {
      ...missingValue,
      data: [
        { ...missingValue.data[0], primaryValue: null },
        ...missingValue.data.slice(1),
      ],
    };
    expect(() => adaptTradeBreakdown(missing, brazil)).toThrow(
      /missing values/,
    );
    const mixed = clone(fixtures["buyer-76"]);
    mixed.data[0].aggrLevel = 4;
    expect(() => adaptTradeBreakdown(mixed, brazil)).toThrow(
      /inconsistent dimensions/,
    );
    const other = clone(fixtures["buyer-76"]);
    other.data[0].partnerCode = 842;
    expect(() => adaptTradeBreakdown(other, brazil)).toThrow(
      /inconsistent dimensions/,
    );
  });
});

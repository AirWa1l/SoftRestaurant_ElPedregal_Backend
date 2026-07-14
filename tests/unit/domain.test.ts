import { describe, expect, it } from "vitest";

import { allowedTargets, findTransition } from "../../src/utils/orderStateMachine";
import { applyDiscount } from "../../src/utils/pricing";
import type { PromotionDocument } from "../../src/models/Promotion";

describe("orderStateMachine (funcional)", () => {
  it("define el flujo principal", () => {
    expect(allowedTargets("PENDIENTE")).toEqual([
      "EN_PREPARACION",
      "CANCELADO",
    ]);

    expect(allowedTargets("CONFIRMADO")).toEqual([
      "EN_PREPARACION",
      "CANCELADO",
    ]);

    expect(allowedTargets("EN_PREPARACION")).toEqual([
      "PENDIENTE",
      "ENTREGADO",
      "CANCELADO",
    ]);

    expect(allowedTargets("ENTREGADO")).toEqual([
      "FACTURADO",
    ]);

    expect(allowedTargets("FACTURADO")).toEqual([]);

    expect(allowedTargets("CANCELADO")).toEqual([]);
  });

  it("exige dueño para cancelar como cliente desde PENDIENTE", () => {
    const transition = findTransition("PENDIENTE", "CANCELADO");

    expect(transition).not.toBeNull();
    expect(transition?.roles).toContain("user");
    expect(transition?.ownerOnly).toBe(true);
  });

  it("impide saltos inválidos", () => {
    expect(findTransition("PENDIENTE", "FACTURADO")).toBeNull();
    expect(findTransition("FACTURADO", "PENDIENTE")).toBeNull();
    expect(findTransition("ENTREGADO", "PENDIENTE")).toBeNull();
  });
});

describe("pricing.applyDiscount (funcional)", () => {
  it("aplica descuento porcentual y fijo", () => {
    const percent = {
      type: "percentage",
      value: 10,
    } as unknown as PromotionDocument;

    const fixed = {
      type: "fixed",
      value: 1500,
    } as unknown as PromotionDocument;

    expect(applyDiscount(10000, percent)).toBe(9000);
    expect(applyDiscount(10000, fixed)).toBe(8500);
  });

  it("no permite precio negativo", () => {
    const fixed = {
      type: "fixed",
      value: 50000,
    } as unknown as PromotionDocument;

    expect(applyDiscount(1000, fixed)).toBe(0);
  });
});
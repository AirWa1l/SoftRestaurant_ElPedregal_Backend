import { describe, expect, it } from "vitest";

import { allowedTargets, findTransition } from "../../src/utils/orderStateMachine";
import { applyDiscount } from "../../src/utils/pricing";
import type { PromotionDocument } from "../../src/models/Promotion";

describe("orderStateMachine (funcional)", () => {
  it("define el flujo principal pendiente → preparación → entregado → facturado", () => {
    expect(allowedTargets("PENDIENTE")).toEqual(
      expect.arrayContaining(["EN_PREPARACION", "CANCELADO"])
    );
    expect(allowedTargets("EN_PREPARACION")).toEqual(
      expect.arrayContaining(["ENTREGADO", "PENDIENTE"])
    );
    expect(allowedTargets("ENTREGADO")).toEqual(["FACTURADO"]);
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
  });
});

describe("pricing.applyDiscount (funcional)", () => {
  it("aplica descuento porcentual y fijo", () => {
    const percent = {
      type: "percentage",
      value: 10,
    } as PromotionDocument;
    const fixed = {
      type: "fixed",
      value: 1500,
    } as PromotionDocument;

    expect(applyDiscount(10000, percent)).toBe(9000);
    expect(applyDiscount(10000, fixed)).toBe(8500);
  });

  it("no permite precio negativo (no funcional - integridad)", () => {
    const fixed = {
      type: "fixed",
      value: 50_000,
    } as PromotionDocument;
    expect(applyDiscount(1000, fixed)).toBe(0);
  });
});

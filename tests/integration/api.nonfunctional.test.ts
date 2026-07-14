import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

let mongoServer: MongoMemoryServer;
let app: typeof import("../../src/app").default;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  const mod = await import("../../src/app");
  app = mod.default;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key]?.deleteMany({});
  }
});

describe("API no funcional", () => {
  it("responde /health en menos de 500ms (rendimiento)", async () => {
    const started = Date.now();
    const res = await request(app).get("/health");
    const elapsed = Date.now() - started;

    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThan(500);
  });

  it("incluye cabeceras de seguridad de Helmet", async () => {
    const res = await request(app).get("/health");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBeDefined();
    // CORP cross-origin permite cargar imágenes desde el front en otro puerto
    expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
  });

  it("rechaza JSON demasiado grande (límite 1mb)", async () => {
    const oversized = "x".repeat(1.2 * 1024 * 1024);
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send(`{"email":"a@b.com","password":"${oversized}"}`);

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("protege recursos sin token (seguridad)", async () => {
    const res = await request(app).get("/api/auth/users/current");
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("unauthorized");
  });

  it("valida payload de login malformado", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "no-es-email",
      password: "corta",
    });
    expect(res.status).toBe(400);
  });
});

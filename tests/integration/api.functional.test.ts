import fs from "fs/promises";
import path from "path";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PRODUCTS_UPLOAD_DIR } from "../../src/middlewares/upload";
import { Category } from "../../src/models/Category";
import { Product } from "../../src/models/Product";
import { User } from "../../src/models/User";
import { signAccessToken } from "../../src/utils/tokens";

let mongoServer: MongoMemoryServer;
let app: typeof import("../../src/app").default;

async function seedAdmin() {
  const admin = await User.create({
    email: "admin@test.com",
    passwordHash: "$2b$12$abcdefghijklmnopqrstuv", // no se usa en estos tests
    firstName: "Admin",
    lastName: "Test",
    phone: "3000000000",
    role: "admin",
  });
  return admin;
}

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

describe("API funcional", () => {
  it("GET /health responde ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("registra y autentica un usuario", async () => {
    const register = await request(app).post("/api/auth/register").send({
      firstName: "Ana",
      lastName: "Pérez",
      phone: "3001234567",
      email: "ana@example.com",
      password: "password123",
    });
    expect(register.status).toBe(201);
    expect(register.body.id).toBeTruthy();

    const login = await request(app).post("/api/auth/login").send({
      email: "ana@example.com",
      password: "password123",
    });
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toBeTruthy();

    const me = await request(app)
      .get("/api/auth/users/current")
      .set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("ana@example.com");
  });

  it("lista productos públicos y sirve imagen estática", async () => {
    const category = await Category.create({ name: "Bebidas" });
    const fileName = `test-${Date.now()}.png`;
    const filePath = path.join(PRODUCTS_UPLOAD_DIR, fileName);
    // PNG 1x1 mínimo
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
    await fs.mkdir(PRODUCTS_UPLOAD_DIR, { recursive: true });
    await fs.writeFile(filePath, png);

    await Product.create({
      name: "Jugo natural",
      description: "Jugo de naranja fresco del día",
      price: mongoose.Types.Decimal128.fromString("8000.00"),
      category: category._id,
      image: `/uploads/products/${fileName}`,
    });

    const list = await request(app).get("/api/products");
    expect(list.status).toBe(200);
    expect(list.body.products).toHaveLength(1);
    expect(list.body.products[0].image).toBe(`/uploads/products/${fileName}`);

    const image = await request(app).get(`/uploads/products/${fileName}`);
    expect(image.status).toBe(200);
    expect(image.headers["content-type"]).toMatch(/image\/png/);

    await fs.unlink(filePath).catch(() => undefined);

    const missing = await request(app).get("/uploads/products/archivo-inexistente.jpg");
    expect(missing.status).toBe(200);
    expect(missing.headers["content-type"]).toMatch(/image\/png/);
  });

  it("exige admin para crear productos", async () => {
    const user = await User.create({
      email: "cliente@test.com",
      passwordHash: "hash",
      firstName: "Cliente",
      lastName: "Test",
      phone: "3001112233",
      role: "user",
    });
    const token = signAccessToken(user._id.toString());
    const category = await Category.create({ name: "Platos" });

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Bandeja",
        description: "Bandeja paisa completa",
        price: 25000,
        category: category._id.toString(),
      });

    expect(res.status).toBe(403);
  });

  it("permite a un admin crear producto con imageUrl externa", async () => {
    const admin = await seedAdmin();
    const token = signAccessToken(admin._id.toString());
    const category = await Category.create({ name: "Entradas" });

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Empanada",
        description: "Empanada de carne crujiente",
        price: 4500,
        category: category._id.toString(),
        imageUrl: "https://cdn.example.com/empanada.jpg",
      });

    expect(res.status).toBe(201);
    expect(res.body.product.image).toBe("https://cdn.example.com/empanada.jpg");
  });
});

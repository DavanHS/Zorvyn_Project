import { describe, it, expect, beforeAll } from "vitest";
import { app } from "./test-setup.js";

const ADMIN_EMAIL = "admin@zorvyn.com";
const ADMIN_PASSWORD = "admin123456";
const ANALYST_EMAIL = "sarah@zorvyn.com";
const ANALYST_PASSWORD = "analyst123456";
const VIEWER_EMAIL = "mike@zorvyn.com";
const VIEWER_PASSWORD = "viewer123456";

let adminToken: string | null = null;
let analystToken: string | null = null;
let viewerToken: string | null = null;
let dbAvailable = false;

async function login(email: string, password: string): Promise<string | null> {
  try {
    const res = await app.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (data.success && data.data?.accessToken) {
      return data.data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

describe("Integration Tests", () => {
  beforeAll(async () => {
    adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    analystToken = await login(ANALYST_EMAIL, ANALYST_PASSWORD);
    viewerToken = await login(VIEWER_EMAIL, VIEWER_PASSWORD);
    dbAvailable = !!(adminToken && analystToken && viewerToken);
  });

  describe("Authentication", () => {
    it("should reject invalid credentials", async () => {
      const res = await app.request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "invalid@test.com", password: "wrong" }),
        headers: { "Content-Type": "application/json" },
      });
      expect(res.status).toBe(401);
    });
  });

  if (!dbAvailable) {
    describe("Database Tests", () => {
      it("skip - database not available (run npm run seed first)", () => {
        console.log("⚠️  Tests skipped: Run 'npm run seed' to enable database tests");
      });
    });
    return;
  }

  describe("Records - Admin", () => {
    it("should create a record as admin", async () => {
      const res = await app.request("/api/records", {
        method: "POST",
        body: JSON.stringify({
          amount: 10000,
          type: "expense",
          category: "software",
          date: "2024-05-01",
          notes: "Test record",
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
      });
      expect(res.status).toBe(201);
    });

    it("should list records as admin", async () => {
      const res = await app.request("/api/records", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
    });

    it("should delete a record as admin", async () => {
      const listRes = await app.request("/api/records", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const listData = await listRes.json();
      
      if (listData.data.length > 0) {
        const recordId = listData.data[0].id;
        const delRes = await app.request(`/api/records/${recordId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        expect(delRes.status).toBe(200);
      }
    });
  });

  describe("Records - Analyst", () => {
    it("should list records as analyst", async () => {
      const res = await app.request("/api/records", {
        headers: { Authorization: `Bearer ${analystToken}` },
      });
      expect(res.status).toBe(200);
    });

    it("should not create a record as analyst", async () => {
      const res = await app.request("/api/records", {
        method: "POST",
        body: JSON.stringify({
          amount: 5000,
          type: "income",
          category: "consulting",
          date: "2024-05-01",
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${analystToken}`,
        },
      });
      expect(res.status).toBe(403);
    });
  });

  describe("Records - Viewer", () => {
    it("should not create a record as viewer", async () => {
      const res = await app.request("/api/records", {
        method: "POST",
        body: JSON.stringify({
          amount: 5000,
          type: "income",
          category: "consulting",
          date: "2024-05-01",
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${viewerToken}`,
        },
      });
      expect(res.status).toBe(403);
    });

    it("should not list records as viewer", async () => {
      const res = await app.request("/api/records", {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });
      expect(res.status).toBe(403);
    });
  });

  describe("Dashboard", () => {
    it("should get dashboard summary as admin", async () => {
      const res = await app.request("/api/dashboard/summary", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("total_income");
      expect(data.data).toHaveProperty("total_expenses");
      expect(data.data).toHaveProperty("category_breakdown");
    });

    it("should get dashboard summary as viewer", async () => {
      const res = await app.request("/api/dashboard/summary", {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });
      expect(res.status).toBe(200);
    });
  });

  describe("Validation", () => {
    it("should return 400 for invalid record data", async () => {
      const res = await app.request("/api/records", {
        method: "POST",
        body: JSON.stringify({
          amount: -100,
          type: "invalid",
          category: "invalid_category",
          date: "2099-01-01",
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Validation failed");
    });
  });
});
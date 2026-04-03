import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { hashPassword } from "../src/utils/password.js";

const SUPER_ADMIN = {
  name: "System Administrator",
  email: "admin@zorvyn.com",
  password: "admin123456",
  role: "admin" as const,
};

async function seed() {
  const connectionString = process.env.DATABASE_URL!;
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("Starting database seed...");

    const existingAdmin = await prisma.user.findFirst({
      where: { isSuperAdmin: true },
    });

    if (existingAdmin) {
      console.log("Super admin already exists — skipping creation");
    } else {
      const passwordHash = await hashPassword(SUPER_ADMIN.password);

      await prisma.user.create({
        data: {
          name: SUPER_ADMIN.name,
          email: SUPER_ADMIN.email.toLowerCase(),
          passwordHash,
          role: SUPER_ADMIN.role,
          status: "active",
          isSuperAdmin: true,
          requiresPasswordReset: true,
        },
      });

      console.log("Super admin user created:");
      console.log(`   Email: ${SUPER_ADMIN.email}`);
      console.log(`   Password: ${SUPER_ADMIN.password}`);
      console.log(`   Role: ${SUPER_ADMIN.role}`);
    }

    const userCount = await prisma.user.count();
    console.log(`Total users: ${userCount}`);
    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();

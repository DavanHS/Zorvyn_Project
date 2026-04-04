import "dotenv/config";
import { PrismaClient, Category, RecordType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { hashPassword } from "../src/utils/password.js";

const USERS = [
  {
    name: "System Administrator",
    email: "admin@zorvyn.com",
    password: "admin123456",
    role: "admin" as const,
    isSuperAdmin: true,
  },
  {
    name: "Sarah Analyst",
    email: "sarah@zorvyn.com",
    password: "analyst123456",
    role: "analyst" as const,
    isSuperAdmin: false,
  },
  {
    name: "Mike Viewer",
    email: "mike@zorvyn.com",
    password: "viewer123456",
    role: "viewer" as const,
    isSuperAdmin: false,
  },
];

const RECORDS: Array<{ amount: number; type: RecordType; category: Category; date: string; notes: string }> = [
  { amount: 150000, type: "income", category: "client_payments", date: "2024-01-05", notes: "Project Alpha payment" },
  { amount: 75000, type: "expense" as const, category: "salaries", date: "2024-01-10", notes: "January salaries" },
  { amount: 25000, type: "expense" as const, category: "rent", date: "2024-01-15", notes: "Office rent - January" },
  { amount: 120000, type: "income" as const, category: "client_payments", date: "2024-01-20", notes: "Project Beta milestone" },
  { amount: 15000, type: "expense" as const, category: "software", date: "2024-01-25", notes: "Adobe Creative Cloud" },
  { amount: 200000, type: "income" as const, category: "consulting", date: "2024-02-01", notes: "Consulting engagement - Q1" },
  { amount: 80000, type: "expense" as const, category: "salaries", date: "2024-02-10", notes: "February salaries" },
  { amount: 25000, type: "expense" as const, category: "rent", date: "2024-02-15", notes: "Office rent - February" },
  { amount: 8500, type: "expense" as const, category: "marketing", date: "2024-02-20", notes: "Google Ads campaign" },
  { amount: 180000, type: "income" as const, category: "client_payments", date: "2024-02-28", notes: "Project Gamma initial payment" },
  { amount: 75000, type: "expense" as const, category: "salaries", date: "2024-03-10", notes: "March salaries" },
  { amount: 25000, type: "expense" as const, category: "rent", date: "2024-03-15", notes: "Office rent - March" },
  { amount: 12000, type: "expense" as const, category: "travel", date: "2024-03-18", notes: "Client meeting travel" },
  { amount: 95000, type: "income" as const, category: "investments", date: "2024-03-25", notes: "Investment returns - Q1" },
  { amount: 5000, type: "expense" as const, category: "subscriptions", date: "2024-03-28", notes: "Various subscriptions" },
  { amount: 250000, type: "income" as const, category: "client_payments", date: "2024-04-01", notes: "Project Delta full payment" },
  { amount: 80000, type: "expense" as const, category: "salaries", date: "2024-04-10", notes: "April salaries" },
  { amount: 25000, type: "expense" as const, category: "rent", date: "2024-04-15", notes: "Office rent - April" },
  { amount: 35000, type: "expense" as const, category: "insurance", date: "2024-04-20", notes: "Business insurance premium" },
];

function rupeesTopaise(rupees: number): number {
  return Math.round(rupees * 100);
}

async function seed() {
  const connectionString = process.env.DATABASE_URL!;
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("Starting database seed...\n");

    const createdUsers: { id: string; email: string; role: string }[] = [];

    for (const userData of USERS) {
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email.toLowerCase() },
      });

      if (existingUser) {
        console.log(`User ${userData.email} already exists — skipping`);
        createdUsers.push(existingUser);
      } else {
        const passwordHash = await hashPassword(userData.password);
        
        const user = await prisma.user.create({
          data: {
            name: userData.name,
            email: userData.email.toLowerCase(),
            passwordHash,
            role: userData.role,
            status: "active",
            isSuperAdmin: userData.isSuperAdmin,
            requiresPasswordReset: false,
          },
        });

        console.log(`Created user: ${userData.email} (${userData.role})`);
        createdUsers.push(user);
      }
    }

    const adminUser = createdUsers.find(u => u.role === "admin")!;

    const existingRecords = await prisma.record.count();
    if (existingRecords > 0) {
      console.log(`\nRecords already exist (${existingRecords}) — skipping seed`);
    } else {
      console.log("\nCreating financial records...");
      
      for (const record of RECORDS) {
        await prisma.record.create({
          data: {
            amount: rupeesTopaise(record.amount),
            type: record.type,
            category: record.category,
            date: new Date(record.date),
            notes: record.notes,
            createdBy: adminUser.id,
            isDeleted: false,
          },
        });
      }

      console.log(`Created ${RECORDS.length} financial records`);
    }

    console.log("\n--- Seed Summary ---");
    console.log(`Total users: ${createdUsers.length}`);
    const recordCount = await prisma.record.count();
    console.log(`Total records: ${recordCount}`);
    
    console.log("\nTest Credentials:");
    console.log("  Admin:   admin@zorvyn.com / admin123456");
    console.log("  Analyst: sarah@zorvyn.com / analyst123456");
    console.log("  Viewer:  mike@zorvyn.com / viewer123456");
    
    console.log("\nSeed completed successfully!");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function main() {
  console.log("Seeding database...");

  // ============================
  // Users
  // ============================
  const admin = await db.user.upsert({
    where: { email: "admin@hackeval.dev" },
    update: {},
    create: {
      email: "admin@hackeval.dev",
      name: "Admin User",
      passwordHash: hashPassword("admin123"),
      role: "admin",
    },
  });

  const evaluator = await db.user.upsert({
    where: { email: "evaluator@hackeval.dev" },
    update: {},
    create: {
      email: "evaluator@hackeval.dev",
      name: "Evaluator",
      passwordHash: hashPassword("eval123"),
      role: "evaluator",
    },
  });

  console.log("  Users created");

  // ============================
  // Rubric Templates (Official HACKDAY 1.0)
  // ============================

  const hackdayTemplate = await db.rubricTemplate.upsert({
    where: { id: "hackday-1-official" },
    update: {
      name: "HACKDAY 1.0 Official Rubric",
      category: "hackday_official",
      description: "Official HACKDAY 1.0 100-Point Scoring Rubric (5 Categories)",
      isDefault: true,
    },
    create: {
      id: "hackday-1-official",
      name: "HACKDAY 1.0 Official Rubric",
      category: "hackday_official",
      description: "Official HACKDAY 1.0 100-Point Scoring Rubric (5 Categories)",
      isDefault: true,
    },
  });

  const officialCriteria = [
    {
      id: "hackday-1",
      name: "Problem & Impact",
      description: "Problem clarity (5), Problem significance (5), Target-user relevance (5), Solution impact (5), Real-world usefulness (5) — Max 25 pts",
      weight: 25.0,
      sortOrder: 1,
    },
    {
      id: "hackday-2",
      name: "Innovation",
      description: "Originality (5), Novel approach (5), Differentiation (5), Creative use of technology (5) — Max 20 pts",
      weight: 20.0,
      sortOrder: 2,
    },
    {
      id: "hackday-3",
      name: "Technical Implementation",
      description: "Core functionality (7), Technical depth (5), Technology selection (4), Implementation quality (5), Working prototype (4) — Max 25 pts",
      weight: 25.0,
      sortOrder: 3,
    },
    {
      id: "hackday-4",
      name: "User Experience",
      description: "UI quality (4), Ease of use (3), User flow (3), Responsive design (3), Overall experience (2) — Max 15 pts",
      weight: 15.0,
      sortOrder: 4,
    },
    {
      id: "hackday-5",
      name: "Feasibility & Scalability",
      description: "Technical feasibility (4), Deployment practicality (3), Scalability (4), Future potential (4) — Max 15 pts",
      weight: 15.0,
      sortOrder: 5,
    },
  ];

  for (const c of officialCriteria) {
    await db.rubricCriterion.upsert({
      where: { id: c.id },
      update: {
        templateId: hackdayTemplate.id,
        name: c.name,
        description: c.description,
        weight: c.weight,
        sortOrder: c.sortOrder,
      },
      create: {
        id: c.id,
        templateId: hackdayTemplate.id,
        name: c.name,
        description: c.description,
        weight: c.weight,
        sortOrder: c.sortOrder,
      },
    });
  }

  // Ensure legacy templates are marked not default
  await db.rubricTemplate.updateMany({
    where: { id: { not: "hackday-1-official" } },
    data: { isDefault: false },
  });

  console.log("  HACKDAY 1.0 official rubric template & 5 criteria created");

  // ============================
  // App Settings
  // ============================
  await db.appSetting.upsert({
    where: { key: "openai_model" },
    update: {},
    create: { key: "openai_model", value: "gpt-4o" },
  });

  console.log("  Settings created");
  console.log("\nSeed complete!");
  console.log("\nLogin credentials:");
  console.log("  Admin:     admin@hackeval.dev / admin123");
  console.log("  Evaluator: evaluator@hackeval.dev / eval123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

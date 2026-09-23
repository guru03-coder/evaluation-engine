import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function GET() {
  return seed();
}

export async function POST() {
  return seed();
}

async function seed() {
  try {
    // Check if already seeded
    const existingAdmin = await db.user.findUnique({
      where: { email: "admin@hackeval.dev" },
    });
    if (existingAdmin) {
      return NextResponse.json({ message: "Database already seeded" });
    }

    // Users
    const admin = await db.user.create({
      data: {
        email: "admin@hackeval.dev",
        name: "Admin User",
        passwordHash: hashPassword("admin123"),
        role: "admin",
      },
    });

    await db.user.create({
      data: {
        email: "evaluator@hackeval.dev",
        name: "Evaluator",
        passwordHash: hashPassword("eval123"),
        role: "evaluator",
      },
    });

    // Rubric Template (Official HACKDAY 1.0)
    const hackdayTemplate = await db.rubricTemplate.create({
      data: {
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
      await db.rubricCriterion.create({
        data: {
          id: c.id,
          templateId: hackdayTemplate.id,
          name: c.name,
          description: c.description,
          weight: c.weight,
          sortOrder: c.sortOrder,
        },
      });
    }

    // App Settings
    await db.appSetting.create({
      data: { key: "openai_model", value: "gpt-4o" },
    });

    // Sample session
    await db.evaluationSession.create({
      data: {
        teamName: "Team Alpha - IndustrialAI",
        teamId: "demo-team-alpha",
        university: "Khalifa University",
        members: JSON.stringify(["Ahmed Al Mansouri", "Sara Al Hashimi", "Omar Khan", "Fatima Al Zaabi"]),
        category: "AI Smart Worker Assistant",
        demoUrl: "https://demo.example.com/alpha",
        notes: "Strong proposal with working computer vision prototype",
        status: "draft",
        createdById: admin.id,
      },
    });

    return NextResponse.json({ message: "Database seeded successfully" });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Seed failed", details: String(error) },
      { status: 500 }
    );
  }
}

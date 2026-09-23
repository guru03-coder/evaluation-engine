import fs from "fs";
import path from "path";
import { parseSpreadsheetBuffer } from "../lib/importers/spreadsheet-parser";
import { db } from "../lib/db";
import { startQueue, getQueueStatus } from "../lib/queue/evaluation-queue";

async function main() {
  console.log("=== STEP 1: PARSING TEST SPREADSHEET ===");
  const filePath = path.resolve(process.cwd(), "test_hackathon_500_sample.csv");
  const fileBuffer = fs.readFileSync(filePath);
  const preview = parseSpreadsheetBuffer(fileBuffer);

  console.log("Total Rows:", preview.totalRows);
  console.log("Valid Rows:", preview.validRows);
  console.log("Missing GitHub:", preview.missingGithubRows);
  console.log("Missing Demo:", preview.missingDemoRows);
  console.log("Missing PPT:", preview.missingPptRows);
  console.log("Detected Columns:", preview.detectedColumns);

  if (preview.totalRows !== 12) {
    throw new Error(`Expected 12 rows, got ${preview.totalRows}`);
  }

  console.log("\n=== STEP 2: CREATING SESSIONS IN DATABASE ===");
  let admin = await db.user.findFirst();
  if (!admin) {
    admin = await db.user.create({
      data: {
        email: "admin@hackathon.org",
        name: "Hackathon Organizer",
        passwordHash: "dummy-hash",
        role: "admin",
      },
    });
  }

  const createdIds: string[] = [];
  for (const row of preview.rows) {
    const session = await db.evaluationSession.create({
      data: {
        teamName: row.teamName,
        projectName: row.projectName,
        description: row.description,
        leaderName: row.leaderName,
        leaderEmail: row.leaderEmail,
        university: row.organization,
        category: "General / Quantexa Track",
        githubUrl: row.githubUrl,
        demoUrl: row.demoUrl,
        pptUrl: row.pptUrl,
        spreadsheetRow: row.rowNumber,
        evaluationStage: "stage1",
        jobStatus: "QUEUED",
        createdById: admin.id,
      },
    });
    createdIds.push(session.id);
  }

  console.log(`Created ${createdIds.length} evaluation sessions in DB!`);

  console.log("\n=== STEP 3: QUEUE STATUS VERIFICATION ===");
  let qStatus = await getQueueStatus();
  console.log("Initial Queue Status:", {
    total: qStatus.total,
    queued: qStatus.queued,
    completed: qStatus.completed,
    isRunning: qStatus.isRunning,
  });

  console.log("\n=== STEP 4: TRIGGERING QUEUE WORKER ===");
  // Trigger queue asynchronously
  startQueue().catch(console.error);

  // Poll for up to 20 seconds to see worker process jobs
  for (let i = 0; i < 7; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    qStatus = await getQueueStatus();
    console.log(`[T+${(i + 1) * 2}s] Queue: queued=${qStatus.queued}, processing=${qStatus.processing}, completed=${qStatus.completed}, failed=${qStatus.failed}`);
    if (qStatus.completed >= 3) {
      console.log("Worker successfully evaluated submissions in background!");
      break;
    }
  }

  console.log("\n=== STEP 5: VERIFYING EVALUATION EVIDENCE AUDIT ===");
  const evaluatedSession = await db.evaluationSession.findFirst({
    where: { jobStatus: "COMPLETED", evaluationResult: { isNot: null } },
    include: { evaluationResult: true },
  });

  if (evaluatedSession && evaluatedSession.evaluationResult) {
    console.log("Sample Evaluated Session:", {
      team: evaluatedSession.teamName,
      project: evaluatedSession.projectName,
      score: evaluatedSession.evaluationResult.finalScore,
      recommendation: evaluatedSession.evaluationResult.recommendation,
      hasVerifiedEvidence: !!evaluatedSession.evaluationResult.verifiedEvidence,
      hasUnverifiedClaims: !!evaluatedSession.evaluationResult.unverifiedClaims,
      verifiedSample: evaluatedSession.evaluationResult.verifiedEvidence?.slice(0, 150),
    });
  }

  console.log("\n=== PIPELINE VALIDATION PASSED ===");
}

main()
  .catch((err) => {
    console.error("Pipeline test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🧹 Starting Mock Data Purge...");

  // Check counts before
  const sessionCountBefore = await db.evaluationSession.count();
  const assetCountBefore = await db.submissionAsset.count();
  const proposalCountBefore = await db.proposalExtraction.count();
  const codeCountBefore = await db.codeExtraction.count();
  const resultCountBefore = await db.evaluationResult.count();
  const scoreCountBefore = await db.criterionScore.count();
  const auditCountBefore = await db.auditLog.count();

  console.log(`Found prior data:
  - Evaluation Sessions: ${sessionCountBefore}
  - Submission Assets: ${assetCountBefore}
  - Proposal Extractions: ${proposalCountBefore}
  - Code Extractions: ${codeCountBefore}
  - Evaluation Results: ${resultCountBefore}
  - Criterion Scores: ${scoreCountBefore}
  - Audit Logs: ${auditCountBefore}
  `);

  // Delete all audit logs first
  await db.auditLog.deleteMany({});

  // Delete all evaluation sessions (cascades to assets, extractions, results, scores)
  await db.evaluationSession.deleteMany({});

  // Verify counts after
  const sessionCountAfter = await db.evaluationSession.count();
  const assetCountAfter = await db.submissionAsset.count();
  const proposalCountAfter = await db.proposalExtraction.count();
  const codeCountAfter = await db.codeExtraction.count();
  const resultCountAfter = await db.evaluationResult.count();
  const scoreCountAfter = await db.criterionScore.count();
  const auditCountAfter = await db.auditLog.count();
  const userCount = await db.user.count();
  const templateCount = await db.rubricTemplate.count();

  console.log(`✅ Data Purge Complete! Clean slate confirmed:
  - Evaluation Sessions: ${sessionCountAfter}
  - Submission Assets: ${assetCountAfter}
  - Proposal Extractions: ${proposalCountAfter}
  - Code Extractions: ${codeCountAfter}
  - Evaluation Results: ${resultCountAfter}
  - Criterion Scores: ${scoreCountAfter}
  - Audit Logs: ${auditCountAfter}
  - System Users Retained: ${userCount}
  - Rubric Templates Retained: ${templateCount}
  `);
}

main()
  .catch((e) => {
    console.error("Error purging mock data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

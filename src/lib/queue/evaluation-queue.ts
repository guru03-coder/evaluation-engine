import { db } from "@/lib/db";
import { evaluateProposal } from "@/lib/evaluation/proposal-evaluator";
import { evaluateCode } from "@/lib/evaluation/code-evaluator";
import { evaluateHackdaySubmission } from "@/lib/evaluation/hackday-evaluator";
import { analyzeGitHubRepo } from "@/lib/parsers/github-parser";
import {
  computeGroupScore,
  computeFinalScore,
  generateFinalRecommendation,
} from "@/lib/evaluation/scoring-engine";
import type { CodeAnalysis } from "@/types";

export interface QueueStatus {
  isRunning: boolean;
  total: number;
  pending: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  retrying: number;
  progressPercent: number;
  stage1Completed: number;
  stage2Completed: number;
  shortlistedCount: number;
  currentJobs: { id: string; teamName: string; projectName: string }[];
}

let isQueueRunning = false;
let activeWorkers = 0;
const MAX_CONCURRENCY = 3;
const activeJobTracker = new Map<string, { id: string; teamName: string; projectName: string }>();
const claimedJobs = new Set<string>();

export function getQueueStatus(): Promise<QueueStatus> {
  return fetchQueueStatus();
}

async function fetchQueueStatus(): Promise<QueueStatus> {
  const [total, pending, queued, processing, completed, failed, retrying, shortlisted, stage2] =
    await Promise.all([
      db.evaluationSession.count(),
      db.evaluationSession.count({ where: { jobStatus: "PENDING" } }),
      db.evaluationSession.count({ where: { jobStatus: "QUEUED" } }),
      db.evaluationSession.count({ where: { jobStatus: "PROCESSING" } }),
      db.evaluationSession.count({ where: { jobStatus: "COMPLETED" } }),
      db.evaluationSession.count({ where: { jobStatus: "FAILED" } }),
      db.evaluationSession.count({ where: { jobStatus: "RETRYING" } }),
      db.evaluationSession.count({ where: { isShortlisted: true } }),
      db.evaluationSession.count({ where: { evaluationStage: "stage2", jobStatus: "COMPLETED" } }),
    ]);

  const finishedCount = completed;
  const targetTotal = total - pending;
  const progressPercent = targetTotal > 0 ? Math.round((finishedCount / targetTotal) * 100) : 0;

  return {
    isRunning: isQueueRunning,
    total,
    pending,
    queued,
    processing,
    completed,
    failed,
    retrying,
    progressPercent,
    stage1Completed: completed,
    stage2Completed: stage2,
    shortlistedCount: shortlisted,
    currentJobs: Array.from(activeJobTracker.values()),
  };
}

export async function startQueue(): Promise<void> {
  if (isQueueRunning) return;
  isQueueRunning = true;

  // Mark all PENDING jobs as QUEUED if user wants to run evaluation on all
  await db.evaluationSession.updateMany({
    where: { jobStatus: "PENDING" },
    data: { jobStatus: "QUEUED" },
  });

  // Spawn concurrency workers
  for (let i = 0; i < MAX_CONCURRENCY; i++) {
    spawnWorker();
  }
}

export function pauseQueue(): void {
  isQueueRunning = false;
}

export async function retryFailedJobs(): Promise<void> {
  await db.evaluationSession.updateMany({
    where: { jobStatus: "FAILED" },
    data: { jobStatus: "QUEUED", jobAttempts: 0, jobError: "" },
  });
  startQueue();
}

export async function triggerStage2ForShortlisted(): Promise<{ count: number }> {
  // Find all shortlisted or top-scoring sessions
  const result = await db.evaluationSession.updateMany({
    where: {
      OR: [
        { isShortlisted: true },
        { evaluationResult: { recommendation: { in: ["shortlist", "finalist", "winner_candidate"] } } },
      ],
    },
    data: {
      evaluationStage: "stage2",
      jobStatus: "QUEUED",
      jobAttempts: 0,
      jobError: "",
    },
  });

  startQueue();
  return { count: result.count };
}

async function spawnWorker(): Promise<void> {
  if (!isQueueRunning || activeWorkers >= MAX_CONCURRENCY) return;
  activeWorkers++;

  try {
    while (isQueueRunning) {
      // Pick next queued or retrying job not claimed by another worker
      const session = await db.evaluationSession.findFirst({
        where: {
          jobStatus: { in: ["QUEUED", "RETRYING"] },
          id: { notIn: Array.from(claimedJobs) },
        },
        orderBy: { spreadsheetRow: "asc" },
      });

      if (!session) {
        // No jobs remaining right now
        break;
      }

      claimedJobs.add(session.id);

      // Mark as PROCESSING
      await db.evaluationSession.update({
        where: { id: session.id },
        data: { jobStatus: "PROCESSING" },
      });

      activeJobTracker.set(session.id, {
        id: session.id,
        teamName: session.teamName,
        projectName: session.projectName || session.teamName,
      });

      try {
        await processSingleEvaluation(session.id);

        await db.evaluationSession.update({
          where: { id: session.id },
          data: {
            jobStatus: "COMPLETED",
            status: session.evaluationStage === "stage2" ? "reviewed" : "analyzed",
            jobError: "",
          },
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const nextAttempts = session.jobAttempts + 1;

        if (nextAttempts < 3) {
          await db.evaluationSession.update({
            where: { id: session.id },
            data: {
              jobStatus: "RETRYING",
              jobAttempts: nextAttempts,
              jobError: `Attempt ${nextAttempts} failed: ${errorMsg}`,
            },
          });
          // Rate-limit backoff: pause 2 seconds before retry
          await new Promise((res) => setTimeout(res, 2000));
        } else {
          await db.evaluationSession.update({
            where: { id: session.id },
            data: {
              jobStatus: "FAILED",
              jobAttempts: nextAttempts,
              jobError: `Failed after 3 attempts: ${errorMsg}`,
            },
          });
        }
      } finally {
        claimedJobs.delete(session.id);
        activeJobTracker.delete(session.id);
      }

      // Brief breather between jobs to respect rate limits
      await new Promise((res) => setTimeout(res, 300));
    }
  } finally {
    activeWorkers--;
    if (activeWorkers === 0) {
      isQueueRunning = false;
    }
  }
}

async function processSingleEvaluation(sessionId: string): Promise<void> {
  const session = await db.evaluationSession.findUnique({
    where: { id: sessionId },
    include: { assets: true },
  });

  if (!session) throw new Error("Session not found");

  const isStage2 = session.evaluationStage === "stage2";

  // Synthesize description & context
  const description = session.description || session.notes || "No description provided.";
  const pptContent = session.pptUrl ? `Pitch deck / presentation link: ${session.pptUrl}` : undefined;

  // Code repository analysis
  let codeAnalysis: CodeAnalysis = {
    fileTree: [],
    languages: [],
    frameworks: [],
    hasReadme: false,
    hasTests: false,
    hasDocker: false,
    hasCi: false,
    hasPackageJson: false,
    hasRequirements: false,
    totalFiles: 0,
    totalSize: 0,
    readmeContent: "",
    repoSummary: "No repository provided.",
  };

  const githubUrl = session.githubUrl;
  if (githubUrl) {
    try {
      codeAnalysis = await analyzeGitHubRepo(githubUrl);
    } catch (err) {
      codeAnalysis.repoSummary = `GitHub analysis note: ${err instanceof Error ? err.message : "Could not inspect repo"}`;
    }
  }

  // Run official HACKDAY 1.0 5-category evaluation (100 points total)
  const hackdayEval = await evaluateHackdaySubmission({
    projectName: session.projectName || session.teamName,
    teamName: session.teamName,
    organization: session.organization || session.university,
    description,
    pptContent,
    demoUrl: session.demoUrl,
    githubUrl,
    notes: session.notes,
    codeAnalysis,
  });

  const finalScore = hackdayEval.totalScore;
  const isShortlisted =
    finalScore >= 65 ||
    hackdayEval.recommendation === "shortlist" ||
    hackdayEval.recommendation === "finalist" ||
    hackdayEval.recommendation === "winner_candidate";

  const evalResult = await db.evaluationResult.upsert({
    where: { sessionId },
    update: {
      proposalSummary: hackdayEval.rationale,
      codeSummary: hackdayEval.categoryBreakdown.technicalImplementation.rationale,
      strengths: JSON.stringify(hackdayEval.strengths),
      weaknesses: JSON.stringify(hackdayEval.weaknesses),
      risks: JSON.stringify(hackdayEval.unverifiedClaims),
      missingInfo: JSON.stringify([]),
      verifiedEvidence: JSON.stringify(hackdayEval.verifiedEvidence),
      unverifiedClaims: JSON.stringify(hackdayEval.unverifiedClaims),
      recommendation: hackdayEval.recommendation,
      judgeScore: parseFloat((hackdayEval.problemImpactScore + hackdayEval.innovationScore).toFixed(1)),
      codeScore: hackdayEval.technicalImplementationScore,
      finalScore: hackdayEval.totalScore,
      aiConfidence: hackdayEval.aiConfidence,
      reviewerNotes: isStage2 ? "Completed Stage 2 Deep Evaluation" : "Completed Stage 1 Evaluation (HACKDAY 1.0 Rubric)",
    },
    create: {
      sessionId,
      proposalSummary: hackdayEval.rationale,
      codeSummary: hackdayEval.categoryBreakdown.technicalImplementation.rationale,
      strengths: JSON.stringify(hackdayEval.strengths),
      weaknesses: JSON.stringify(hackdayEval.weaknesses),
      risks: JSON.stringify(hackdayEval.unverifiedClaims),
      missingInfo: JSON.stringify([]),
      verifiedEvidence: JSON.stringify(hackdayEval.verifiedEvidence),
      unverifiedClaims: JSON.stringify(hackdayEval.unverifiedClaims),
      recommendation: hackdayEval.recommendation,
      judgeScore: parseFloat((hackdayEval.problemImpactScore + hackdayEval.innovationScore).toFixed(1)),
      codeScore: hackdayEval.technicalImplementationScore,
      finalScore: hackdayEval.totalScore,
      aiConfidence: hackdayEval.aiConfidence,
      reviewerNotes: isStage2 ? "Completed Stage 2 Deep Evaluation" : "Completed Stage 1 Evaluation (HACKDAY 1.0 Rubric)",
    },
  });

  // Load the official HACKDAY 1.0 template
  const officialTemplate = await db.rubricTemplate.findFirst({
    where: { id: "hackday-1-official" },
    include: { criteria: { orderBy: { sortOrder: "asc" } } },
  });

  // Clean up any prior criterion scores for this result
  try {
    await db.criterionScore.deleteMany({ where: { resultId: evalResult.id } });
  } catch (err) {
    console.warn("Could not clean old criterion scores:", err);
  }

  if (officialTemplate) {
    for (const criterion of officialTemplate.criteria) {
      let score = 0;
      let rationale = "";
      let evidenceList: string[] = [];

      const critNameLower = criterion.name.toLowerCase();
      if (critNameLower.includes("problem") || critNameLower.includes("impact")) {
        score = hackdayEval.problemImpactScore;
        rationale = hackdayEval.categoryBreakdown.problemImpact.rationale;
        evidenceList = hackdayEval.categoryBreakdown.problemImpact.evidence;
      } else if (critNameLower.includes("innovation")) {
        score = hackdayEval.innovationScore;
        rationale = hackdayEval.categoryBreakdown.innovation.rationale;
        evidenceList = hackdayEval.categoryBreakdown.innovation.evidence;
      } else if (critNameLower.includes("technical") || critNameLower.includes("implementation")) {
        score = hackdayEval.technicalImplementationScore;
        rationale = hackdayEval.categoryBreakdown.technicalImplementation.rationale;
        evidenceList = hackdayEval.categoryBreakdown.technicalImplementation.evidence;
      } else if (critNameLower.includes("user") || critNameLower.includes("experience")) {
        score = hackdayEval.userExperienceScore;
        rationale = hackdayEval.categoryBreakdown.userExperience.rationale;
        evidenceList = hackdayEval.categoryBreakdown.userExperience.evidence;
      } else if (critNameLower.includes("feasibility") || critNameLower.includes("scalability")) {
        score = hackdayEval.feasibilityScalabilityScore;
        rationale = hackdayEval.categoryBreakdown.feasibilityScalability.rationale;
        evidenceList = hackdayEval.categoryBreakdown.feasibilityScalability.evidence;
      }

      await db.criterionScore.create({
        data: {
          resultId: evalResult.id,
          criterionId: criterion.id,
          score,
          aiScore: score,
          rationale: rationale || `Evaluated against HACKDAY 1.0 ${criterion.name} criteria.`,
          evidence: JSON.stringify(evidenceList),
          confidence: hackdayEval.aiConfidence,
        },
      });
    }
  }

  // Update session shortlist flag
  await db.evaluationSession.update({
    where: { id: sessionId },
    data: {
      isShortlisted,
    },
  });
}

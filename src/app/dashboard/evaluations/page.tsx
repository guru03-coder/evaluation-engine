import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EvaluationsClient, type EvaluationItem } from "./evaluations-client";

export default async function EvaluationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sessions = await db.evaluationSession.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      evaluationResult: true,
      createdBy: { select: { name: true } },
    },
  });

  const formattedSessions: EvaluationItem[] = sessions.map((s) => ({
    id: s.id,
    teamName: s.teamName,
    projectName: s.projectName,
    leaderName: s.leaderName,
    university: s.university,
    category: s.category,
    status: s.status,
    jobStatus: s.jobStatus,
    evaluationStage: s.evaluationStage,
    isShortlisted: s.isShortlisted,
    githubUrl: s.githubUrl,
    demoUrl: s.demoUrl,
    pptUrl: s.pptUrl,
    updatedAt: s.updatedAt,
    evaluationResult: s.evaluationResult
      ? {
          finalScore: s.evaluationResult.finalScore,
          recommendation: s.evaluationResult.recommendation,
          verifiedEvidence: s.evaluationResult.verifiedEvidence,
          unverifiedClaims: s.evaluationResult.unverifiedClaims,
        }
      : null,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <EvaluationsClient initialSessions={formattedSessions} />
    </div>
  );
}

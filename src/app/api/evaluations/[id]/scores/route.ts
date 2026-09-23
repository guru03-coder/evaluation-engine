import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeFinalScore } from "@/lib/evaluation/scoring-engine";
import { calculateRecommendation } from "@/lib/utils";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  try {
    const { scores, reviewerNotes, finalize } = body as {
      scores?: { criterionScoreId: string; score: number; overrideComment: string }[];
      reviewerNotes?: string;
      finalize?: boolean;
    };

    const result = await db.evaluationResult.findUnique({
      where: { sessionId: id },
      include: { scores: { include: { criterion: { include: { template: true } } } } },
    });

    if (!result) {
      return NextResponse.json({ success: false, error: "No evaluation result found" }, { status: 404 });
    }

    // Update individual scores
    if (scores && scores.length > 0) {
      for (const scoreUpdate of scores) {
        const existing = result.scores.find((s) => s.id === scoreUpdate.criterionScoreId);
        if (existing) {
          const isOverride = scoreUpdate.score !== existing.aiScore;
          await db.criterionScore.update({
            where: { id: scoreUpdate.criterionScoreId },
            data: {
              score: scoreUpdate.score,
              isManualOverride: isOverride,
              overrideComment: isOverride ? scoreUpdate.overrideComment : "",
            },
          });

          if (isOverride) {
            await db.auditLog.create({
              data: {
                sessionId: id,
                userId: user.id,
                action: "score_override",
                details: JSON.stringify({
                  criterionId: existing.criterionId,
                  criterionName: existing.criterion.name,
                  oldScore: existing.score,
                  newScore: scoreUpdate.score,
                  comment: scoreUpdate.overrideComment,
                }),
              },
            });
          }
        }
      }
    }

    // Recalculate aggregate scores
    const updatedScores = await db.criterionScore.findMany({
      where: { resultId: result.id },
      include: { criterion: { include: { template: true } } },
    });

    const isHackdayOfficial = updatedScores.some(
      (s) => s.criterion.template.category === "hackday_official"
    );

    let finalScore: number;
    let judgeAvg = result.judgeScore;
    let codeAvg = result.codeScore;

    if (isHackdayOfficial) {
      finalScore = parseFloat(
        updatedScores.reduce((sum, s) => sum + s.score, 0).toFixed(1)
      );
      const problemCrit = updatedScores.find((s) => s.criterion.name.toLowerCase().includes("problem"));
      const innoCrit = updatedScores.find((s) => s.criterion.name.toLowerCase().includes("innovation"));
      const techCrit = updatedScores.find((s) => s.criterion.name.toLowerCase().includes("technical"));
      judgeAvg = parseFloat(((problemCrit?.score || 0) + (innoCrit?.score || 0)).toFixed(1));
      codeAvg = techCrit?.score || 0;
    } else {
      const judgeScores = updatedScores.filter(
        (s) => s.criterion.template.category === "judge_evaluation"
      );
      const codeScores = updatedScores.filter(
        (s) => s.criterion.template.category === "code_review"
      );

      judgeAvg = judgeScores.length > 0
        ? judgeScores.reduce((sum, s) => sum + s.score, 0) / judgeScores.length
        : result.judgeScore;

      codeAvg = codeScores.length > 0
        ? codeScores.reduce((sum, s) => sum + s.score, 0) / codeScores.length
        : result.codeScore;

      finalScore = computeFinalScore(judgeAvg, codeAvg, result.judgeWeight, result.codeWeight);
    }

    const recommendation = calculateRecommendation(finalScore);

    const updateData: Record<string, unknown> = {
      judgeScore: parseFloat(judgeAvg.toFixed(2)),
      codeScore: parseFloat(codeAvg.toFixed(2)),
      finalScore: parseFloat(finalScore.toFixed(2)),
      recommendation,
    };

    if (reviewerNotes !== undefined) {
      updateData.reviewerNotes = reviewerNotes;
    }

    if (finalize) {
      updateData.isFinalized = true;
      updateData.finalizedAt = new Date();

      await db.evaluationSession.update({
        where: { id },
        data: { status: "finalized" },
      });

      await db.auditLog.create({
        data: {
          sessionId: id,
          userId: user.id,
          action: "evaluation_finalized",
          details: JSON.stringify({ finalScore, recommendation }),
        },
      });
    } else {
      await db.evaluationSession.update({
        where: { id },
        data: { status: "reviewed" },
      });
    }

    await db.evaluationResult.update({
      where: { id: result.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: { judgeScore: judgeAvg, codeScore: codeAvg, finalScore, recommendation },
    });
  } catch (error) {
    console.error("Score update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update scores" },
      { status: 500 }
    );
  }
}

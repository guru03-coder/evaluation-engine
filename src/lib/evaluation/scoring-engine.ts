import { chatCompletion } from "@/lib/openai";
import {
  FINAL_RECOMMENDATION_SYSTEM_PROMPT,
  buildFinalRecommendationPrompt,
} from "./prompts";
import type {
  AIFinalRecommendation,
  AICriterionScore,
  Recommendation,
} from "@/types";
import { calculateRecommendation } from "@/lib/utils";

export function computeGroupScore(scores: AICriterionScore[]): number {
  if (scores.length === 0) return 0;
  const total = scores.reduce((sum, s) => sum + s.score, 0);
  return parseFloat((total / scores.length).toFixed(2));
}

export function computeFinalScore(
  judgeScore: number,
  codeScore: number,
  judgeWeight: number = 0.6,
  codeWeight: number = 0.4
): number {
  return parseFloat(
    (judgeScore * judgeWeight + codeScore * codeWeight).toFixed(2)
  );
}

export function computeHackday100Score(scores: {
  problemImpact: number;
  innovation: number;
  technicalImplementation: number;
  userExperience: number;
  feasibilityScalability: number;
}): number {
  return parseFloat(
    (
      scores.problemImpact +
      scores.innovation +
      scores.technicalImplementation +
      scores.userExperience +
      scores.feasibilityScalability
    ).toFixed(1)
  );
}

export function getRecommendation(finalScore: number): Recommendation {
  return calculateRecommendation(finalScore) as Recommendation;
}

export async function generateFinalRecommendation(
  proposalSummary: string,
  codeSummary: string,
  judgeScore: number,
  codeScore: number,
  strengths: string[],
  weaknesses: string[],
  risks: string[],
  submissionContext?: { demoUrl?: string; hasCode?: boolean; notes?: string }
): Promise<AIFinalRecommendation> {
  const userPrompt = buildFinalRecommendationPrompt(
    proposalSummary,
    codeSummary,
    judgeScore,
    codeScore,
    strengths,
    weaknesses,
    risks,
    submissionContext
  );

  const response = await chatCompletion({
    systemPrompt: FINAL_RECOMMENDATION_SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.3,
    maxTokens: 2048,
    jsonMode: true,
  });

  try {
    const recommendation = JSON.parse(response) as AIFinalRecommendation;
    return validateRecommendation(recommendation, judgeScore, codeScore, submissionContext);
  } catch {
    // Fallback to computed recommendation
    const finalScore = computeFinalScore(judgeScore, codeScore);
    const verified: string[] = [];
    const unverified: string[] = [];

    if (submissionContext?.hasCode) {
      verified.push("✓ Code repository submitted and parsed");
    } else {
      unverified.push("⚠ No codebase or repository provided for verification");
    }

    if (submissionContext?.demoUrl) {
      verified.push(`✓ Working demo URL provided: ${submissionContext.demoUrl}`);
    } else {
      unverified.push("⚠ No live deployment demo URL provided");
    }

    return {
      recommendation: getRecommendation(finalScore),
      finalScore,
      judgeScore,
      codeScore,
      rationale: "Recommendation based on computed scores and available submission artifacts.",
      topStrengths: strengths.slice(0, 3),
      topRisks: risks.slice(0, 3),
      verifiedEvidence: verified,
      unverifiedClaims: unverified,
      confidence: 0.6,
    };
  }
}

function validateRecommendation(
  rec: AIFinalRecommendation,
  judgeScore: number,
  codeScore: number,
  submissionContext?: { demoUrl?: string; hasCode?: boolean; notes?: string }
): AIFinalRecommendation {
  const finalScore = computeFinalScore(
    rec.judgeScore || judgeScore,
    rec.codeScore || codeScore
  );

  const defaultVerified: string[] = [];
  const defaultUnverified: string[] = [];

  if (submissionContext?.hasCode) defaultVerified.push("✓ Code repository submitted and verified");
  if (submissionContext?.demoUrl) defaultVerified.push("✓ Live prototype demo URL provided");
  if (!submissionContext?.hasCode) defaultUnverified.push("⚠ Code submission not available for deep verification");

  return {
    recommendation: rec.recommendation || getRecommendation(finalScore),
    finalScore,
    judgeScore: rec.judgeScore || judgeScore,
    codeScore: rec.codeScore || codeScore,
    rationale: rec.rationale || "",
    topStrengths: rec.topStrengths || [],
    topRisks: rec.topRisks || [],
    verifiedEvidence:
      rec.verifiedEvidence && rec.verifiedEvidence.length > 0
        ? rec.verifiedEvidence
        : defaultVerified,
    unverifiedClaims:
      rec.unverifiedClaims && rec.unverifiedClaims.length > 0
        ? rec.unverifiedClaims
        : defaultUnverified,
    confidence: Math.max(0, Math.min(1, rec.confidence || 0.7)),
  };
}

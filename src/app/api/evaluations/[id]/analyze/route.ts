import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readFile } from "fs/promises";
import { parsePdf } from "@/lib/parsers/pdf-parser";
import { parsePptx } from "@/lib/parsers/pptx-parser";
import { parseZip } from "@/lib/parsers/zip-parser";
import { analyzeGitHubRepo } from "@/lib/parsers/github-parser";
import { evaluateProposal } from "@/lib/evaluation/proposal-evaluator";
import { evaluateCode } from "@/lib/evaluation/code-evaluator";
import { evaluateHackdaySubmission } from "@/lib/evaluation/hackday-evaluator";
import {
  computeGroupScore,
  computeFinalScore,
  generateFinalRecommendation,
} from "@/lib/evaluation/scoring-engine";
import type { CodeAnalysis, ProposalSection } from "@/types";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Get session with assets
    const session = await db.evaluationSession.findUnique({
      where: { id },
      include: { assets: true },
    });

    if (!session) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    // Update status to analyzing
    await db.evaluationSession.update({
      where: { id },
      data: { status: "analyzing" },
    });

    // ============================
    // Step 1: Parse proposal
    // ============================
    let proposalText = "";
    let proposalSections: ProposalSection[] = [];
    let slideCount = 0;
    let proposalConfidence = 0;
    let proposalWarnings: string[] = [];

    const proposalAsset = session.assets.find(
      (a) => a.type === "proposal_pdf" || a.type === "proposal_pptx"
    );

    if (proposalAsset && proposalAsset.filepath) {
      try {
        const buffer = await readFile(proposalAsset.filepath);

        if (proposalAsset.type === "proposal_pdf") {
          const result = await parsePdf(buffer);
          proposalText = result.rawText;
          proposalSections = result.sections;
          slideCount = result.pageCount;
          proposalConfidence = result.confidence;
          proposalWarnings = result.warnings.map((w) => JSON.stringify(w));
        } else {
          const result = await parsePptx(buffer);
          proposalText = result.rawText;
          proposalSections = result.sections;
          slideCount = result.slideCount;
          proposalConfidence = result.confidence;
          proposalWarnings = result.warnings.map((w) => JSON.stringify(w));
        }
      } catch (error) {
        console.error("Proposal parsing error:", error);
        proposalWarnings.push(
          JSON.stringify({
            type: "parsing_error",
            message: `Failed to parse proposal: ${error instanceof Error ? error.message : "Unknown error"}`,
          })
        );
      }
    }

    // Save proposal extraction
    await db.proposalExtraction.upsert({
      where: { sessionId: id },
      create: {
        sessionId: id,
        rawText: proposalText.slice(0, 50000),
        sections: JSON.stringify(proposalSections),
        warnings: JSON.stringify(proposalWarnings),
        slideCount,
        confidence: proposalConfidence,
      },
      update: {
        rawText: proposalText.slice(0, 50000),
        sections: JSON.stringify(proposalSections),
        warnings: JSON.stringify(proposalWarnings),
        slideCount,
        confidence: proposalConfidence,
      },
    });

    // ============================
    // Step 2: Parse code
    // ============================
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
      repoSummary: "No code submission provided.",
    };

    const codeZipAsset = session.assets.find((a) => a.type === "code_zip");
    const codeGithubAsset = session.assets.find((a) => a.type === "code_github");

    if (codeZipAsset && codeZipAsset.filepath) {
      try {
        const buffer = await readFile(codeZipAsset.filepath);
        codeAnalysis = await parseZip(buffer);
      } catch (error) {
        console.error("ZIP parsing error:", error);
        codeAnalysis.repoSummary = `Failed to parse ZIP: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    } else if (codeGithubAsset && codeGithubAsset.githubUrl) {
      try {
        codeAnalysis = await analyzeGitHubRepo(codeGithubAsset.githubUrl);
      } catch (error) {
        console.error("GitHub analysis error:", error);
        codeAnalysis.repoSummary = `Failed to analyze GitHub repo: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    }

    // Save code extraction
    await db.codeExtraction.upsert({
      where: { sessionId: id },
      create: {
        sessionId: id,
        fileTree: JSON.stringify(codeAnalysis.fileTree),
        languages: JSON.stringify(codeAnalysis.languages),
        frameworks: JSON.stringify(codeAnalysis.frameworks),
        hasReadme: codeAnalysis.hasReadme,
        hasTests: codeAnalysis.hasTests,
        hasDocker: codeAnalysis.hasDocker,
        hasCi: codeAnalysis.hasCi,
        hasPackageJson: codeAnalysis.hasPackageJson,
        hasRequirements: codeAnalysis.hasRequirements,
        totalFiles: codeAnalysis.totalFiles,
        totalSize: codeAnalysis.totalSize,
        readmeContent: codeAnalysis.readmeContent.slice(0, 20000),
        repoSummary: codeAnalysis.repoSummary,
      },
      update: {
        fileTree: JSON.stringify(codeAnalysis.fileTree),
        languages: JSON.stringify(codeAnalysis.languages),
        frameworks: JSON.stringify(codeAnalysis.frameworks),
        hasReadme: codeAnalysis.hasReadme,
        hasTests: codeAnalysis.hasTests,
        hasDocker: codeAnalysis.hasDocker,
        hasCi: codeAnalysis.hasCi,
        hasPackageJson: codeAnalysis.hasPackageJson,
        hasRequirements: codeAnalysis.hasRequirements,
        totalFiles: codeAnalysis.totalFiles,
        totalSize: codeAnalysis.totalSize,
        readmeContent: codeAnalysis.readmeContent.slice(0, 20000),
        repoSummary: codeAnalysis.repoSummary,
      },
    });

    // ============================
    // Step 3: Official HACKDAY 1.0 AI Evaluation
    // ============================
    const hackdayEval = await evaluateHackdaySubmission({
      projectName: session.projectName || session.teamName,
      teamName: session.teamName,
      organization: session.organization || session.university,
      description: session.description || proposalText || session.notes || "No description provided.",
      pptContent: proposalText || (session.pptUrl ? `Presentation URL: ${session.pptUrl}` : undefined),
      demoUrl: session.demoUrl,
      githubUrl: codeGithubAsset?.githubUrl || session.githubUrl,
      notes: session.notes,
      codeAnalysis,
    });

    // ============================
    // Step 4: Map scores to official rubric criteria
    // ============================
    const officialTemplate = await db.rubricTemplate.findFirst({
      where: { id: "hackday-1-official" },
      include: { criteria: { orderBy: { sortOrder: "asc" } } },
    });

    // Delete existing result if re-analyzing
    await db.evaluationResult.deleteMany({ where: { sessionId: id } });

    const finalScore = hackdayEval.totalScore;

    const evalResult = await db.evaluationResult.create({
      data: {
        sessionId: id,
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
        finalScore,
        aiConfidence: hackdayEval.aiConfidence,
        reviewerNotes: "",
      },
    });

    // Map and save individual criterion scores (5 official criteria)
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

    // Update session status & shortlist flag
    await db.evaluationSession.update({
      where: { id },
      data: {
        status: "analyzed",
        isShortlisted:
          finalScore >= 65 ||
          hackdayEval.recommendation === "shortlist" ||
          hackdayEval.recommendation === "finalist" ||
          hackdayEval.recommendation === "winner_candidate",
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        sessionId: id,
        userId: user.id,
        action: "analysis_completed",
        details: JSON.stringify({
          problemImpact: hackdayEval.problemImpactScore,
          innovation: hackdayEval.innovationScore,
          technicalImplementation: hackdayEval.technicalImplementationScore,
          userExperience: hackdayEval.userExperienceScore,
          feasibilityScalability: hackdayEval.feasibilityScalabilityScore,
          finalScore,
          recommendation: hackdayEval.recommendation,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        problemImpactScore: hackdayEval.problemImpactScore,
        innovationScore: hackdayEval.innovationScore,
        technicalImplementationScore: hackdayEval.technicalImplementationScore,
        userExperienceScore: hackdayEval.userExperienceScore,
        feasibilityScalabilityScore: hackdayEval.feasibilityScalabilityScore,
        finalScore,
        recommendation: hackdayEval.recommendation,
        verifiedEvidence: hackdayEval.verifiedEvidence,
        unverifiedClaims: hackdayEval.unverifiedClaims,
      },
    });
  } catch (error) {
    console.error("Analysis error:", error);

    // Reset status on failure
    await db.evaluationSession.update({
      where: { id },
      data: { status: "draft" },
    }).catch(() => {});

    return NextResponse.json(
      { success: false, error: `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseJsonSafe } from "@/lib/utils";
import { generateCsvExport } from "@/lib/export/json-export";
import { generatePdfExport } from "@/lib/export/pdf-export";
import type { EvaluationExport } from "@/types";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "json";

  const session = await db.evaluationSession.findUnique({
    where: { id },
    include: {
      evaluationResult: {
        include: {
          scores: {
            include: { criterion: { include: { template: true } } },
          },
        },
      },
    },
  });

  if (!session || !session.evaluationResult) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const result = session.evaluationResult;

  const exportData: EvaluationExport = {
    teamName: session.teamName,
    teamId: session.teamId,
    university: session.university,
    category: session.category,
    status: session.status,
    proposalSummary: result.proposalSummary,
    codeSummary: result.codeSummary,
    judgeScore: result.judgeScore,
    codeScore: result.codeScore,
    finalScore: result.finalScore,
    recommendation: result.recommendation,
    strengths: parseJsonSafe(result.strengths, []),
    weaknesses: parseJsonSafe(result.weaknesses, []),
    risks: parseJsonSafe(result.risks, []),
    missingInfo: parseJsonSafe(result.missingInfo, []),
    verifiedEvidence: parseJsonSafe(result.verifiedEvidence || "[]", []),
    unverifiedClaims: parseJsonSafe(result.unverifiedClaims || "[]", []),
    reviewerNotes: result.reviewerNotes,
    scores: result.scores.map((s) => ({
      criterionName: s.criterion.name,
      category: s.criterion.template.category,
      score: s.score,
      aiScore: s.aiScore,
      rationale: s.rationale,
      evidence: parseJsonSafe(s.evidence, []),
      isManualOverride: s.isManualOverride,
    })),
    exportedAt: new Date().toISOString(),
  };

  // Log export
  await db.auditLog.create({
    data: {
      sessionId: id,
      userId: user.id,
      action: "export",
      details: JSON.stringify({ format }),
    },
  });

  if (format === "pdf") {
    const pdfBytes = generatePdfExport(exportData);
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${session.teamName.replace(/[^a-zA-Z0-9]/g, "_")}_evaluation.pdf"`,
      },
    });
  }

  if (format === "csv") {
    const csv = generateCsvExport(exportData);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${session.teamName.replace(/[^a-zA-Z0-9]/g, "_")}_evaluation.csv"`,
      },
    });
  }

  // Default: JSON
  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${session.teamName.replace(/[^a-zA-Z0-9]/g, "_")}_evaluation.json"`,
    },
  });
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseJsonSafe } from "@/lib/utils";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "csv";

  const sessions = await db.evaluationSession.findMany({
    orderBy: [
      { evaluationResult: { finalScore: "desc" } },
      { updatedAt: "desc" },
    ],
    include: {
      evaluationResult: true,
    },
  });

  const exportRows = sessions.map((session, index) => {
    const res = session.evaluationResult;
    const finalScore = res?.finalScore || 0;
    const totalScore100 = Math.round(finalScore * 10);
    const verified = parseJsonSafe<string[]>(res?.verifiedEvidence || "[]", []);
    const gaps = parseJsonSafe<string[]>(res?.unverifiedClaims || "[]", []);

    return {
      rank: res ? index + 1 : "",
      projectId: session.teamId,
      projectName: session.projectName || session.teamName,
      teamName: session.teamName,
      leaderName: session.leaderName || session.teamName,
      leaderEmail: session.leaderEmail,
      organization: session.organization || session.university,
      participationType: session.participationType,
      totalScore: totalScore100,
      finalScore: finalScore.toFixed(1),
      judgeScore: res?.judgeScore?.toFixed(1) || "",
      codeScore: res?.codeScore?.toFixed(1) || "",
      recommendation: res?.recommendation || "Pending",
      isShortlisted: session.isShortlisted ? "Yes" : "No",
      evaluationStage: session.evaluationStage,
      jobStatus: session.jobStatus,
      githubUrl: session.githubUrl,
      demoUrl: session.demoUrl,
      pptUrl: session.pptUrl,
      verifiedEvidence: verified.join(" | "),
      implementationGaps: gaps.join(" | "),
      evaluatedAt: res?.updatedAt ? new Date(res.updatedAt).toISOString() : "",
    };
  });

  if (format === "json") {
    return new NextResponse(JSON.stringify(exportRows, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="hackathon_all_submissions_${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  }

  // Generate CSV
  const headers = [
    "Rank",
    "Project ID",
    "Project Name",
    "Team Name",
    "Leader Name",
    "Leader Email",
    "Organization",
    "Participation Type",
    "Total Score (100)",
    "Final Score (10)",
    "Judge Score",
    "Code Score",
    "Recommendation",
    "Shortlisted",
    "Stage",
    "Job Status",
    "GitHub URL",
    "Demo URL",
    "PPT URL",
    "Verified Evidence",
    "Implementation Gaps",
    "Evaluated At",
  ];

  const escape = (val: unknown) => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escape).join(","),
    ...exportRows.map((r) =>
      [
        r.rank,
        r.projectId,
        r.projectName,
        r.teamName,
        r.leaderName,
        r.leaderEmail,
        r.organization,
        r.participationType,
        r.totalScore,
        r.finalScore,
        r.judgeScore,
        r.codeScore,
        r.recommendation,
        r.isShortlisted,
        r.evaluationStage,
        r.jobStatus,
        r.githubUrl,
        r.demoUrl,
        r.pptUrl,
        r.verifiedEvidence,
        r.implementationGaps,
        r.evaluatedAt,
      ]
        .map(escape)
        .join(",")
    ),
  ];

  return new NextResponse(csvLines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hackathon_master_rankings_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

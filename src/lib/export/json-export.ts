import type { EvaluationExport } from "@/types";

export function generateJsonExport(data: EvaluationExport): string {
  return JSON.stringify(data, null, 2);
}

export function generateCsvExport(data: EvaluationExport): string {
  const headers = [
    "Team Name",
    "Team ID",
    "University",
    "Category",
    "Status",
    "Total Score (100)",
    "Final Score (10)",
    "Judge Score",
    "Code Score",
    "Recommendation",
    "Verified Evidence",
    "Unverified Claims",
    "Strengths",
    "Weaknesses",
    "Risks",
    "Missing Info",
    "Reviewer Notes",
    "Exported At",
  ];

  const escape = (value: string) => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const row = [
    data.teamName,
    data.teamId,
    data.university,
    data.category,
    data.status,
    Math.round(data.finalScore * 10).toString(),
    data.finalScore.toString(),
    data.judgeScore.toString(),
    data.codeScore.toString(),
    data.recommendation,
    (data.verifiedEvidence || []).join("; "),
    (data.unverifiedClaims || []).join("; "),
    data.strengths.join("; "),
    data.weaknesses.join("; "),
    data.risks.join("; "),
    data.missingInfo.join("; "),
    data.reviewerNotes,
    data.exportedAt,
  ];

  return [headers.map(escape).join(","), row.map(escape).join(",")].join("\n");
}

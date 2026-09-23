import { jsPDF } from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import type { EvaluationExport } from "@/types";

// Apply the autoTable plugin to jsPDF prototype
applyPlugin(jsPDF);

interface AutoTableDoc extends jsPDF {
  autoTable: (options: unknown) => AutoTableDoc;
  lastAutoTable?: { finalY: number };
}

export function generatePdfExport(data: EvaluationExport): Uint8Array {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  }) as AutoTableDoc;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Colors
  const primaryColor: [number, number, number] = [30, 64, 175]; // deep blue #1e40af
  const secondaryColor: [number, number, number] = [59, 130, 246]; // blue #3b82f6
  const textColor: [number, number, number] = [30, 41, 59]; // slate-800
  const lightGray: [number, number, number] = [241, 245, 249]; // slate-100

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("HACKATHON EVALUATION REPORT", margin, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    "AI-Assisted Evaluation Platform • Challenge Judging Assessment",
    margin,
    18
  );

  doc.setFontSize(8);
  doc.text(`Generated: ${new Date(data.exportedAt).toLocaleString()}`, margin, 24);

  let currentY = 36;

  // Team & Metadata Block
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 26, 2, 2, "F");

  doc.setTextColor(...textColor);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(data.teamName, margin + 4, currentY + 8);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`University: ${data.university || "N/A"}`, margin + 4, currentY + 15);
  doc.text(`Category: ${data.category}`, margin + 4, currentY + 21);

  doc.text(`Team ID: ${data.teamId}`, pageWidth / 2 + 10, currentY + 15);
  doc.text(`Status: ${data.status.toUpperCase()}`, pageWidth / 2 + 10, currentY + 21);

  currentY += 32;

  // Score Summary Cards
  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const cardHeight = 22;

  const totalScoreVal = data.finalScore <= 10 ? data.finalScore * 10 : data.finalScore;

  const scoreCards = [
    { label: "TOTAL SCORE", value: `${totalScoreVal.toFixed(1)} / 100`, color: secondaryColor },
    { label: "RUBRIC", value: "HACKDAY 1.0", color: textColor },
    { label: "CRITERIA", value: "5 Official Categories", color: textColor },
    {
      label: "RECOMMENDATION",
      value: (data.recommendation || "Pending").toUpperCase().replace("_", " "),
      color: primaryColor,
    },
  ];

  scoreCards.forEach((card, idx) => {
    const x = margin + idx * (cardWidth + 3);
    doc.setFillColor(...lightGray);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 1.5, 1.5, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, x + cardWidth / 2, currentY + 6, { align: "center" });

    doc.setFontSize(card.label === "RECOMMENDATION" ? 8.5 : 11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...card.color);
    doc.text(card.value, x + cardWidth / 2, currentY + 16, { align: "center" });
  });

  currentY += 28;

  // Proposal Summary
  if (data.proposalSummary) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Executive & Proposal Summary", margin, currentY);
    currentY += 5;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textColor);
    const splitProposal = doc.splitTextToSize(data.proposalSummary, pageWidth - margin * 2);
    doc.text(splitProposal, margin, currentY);
    currentY += splitProposal.length * 4.2 + 4;
  }

  // Code Summary
  if (data.codeSummary) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Technical Implementation Summary", margin, currentY);
    currentY += 5;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textColor);
    const splitCode = doc.splitTextToSize(data.codeSummary, pageWidth - margin * 2);
    doc.text(splitCode, margin, currentY);
    currentY += splitCode.length * 4.2 + 5;
  }

  // Scoring Breakdown Table
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("Official 5-Category Scoring Breakdown", margin, currentY);
  currentY += 2;

  const tableRows = data.scores.map((s) => {
    const isHackday = s.category === "hackday_official";
    const critLower = s.criterionName.toLowerCase();
    let weightLabel = "20%";
    let max = 20;
    if (critLower.includes("problem") || critLower.includes("impact") || critLower.includes("technical")) {
      weightLabel = "25%";
      max = 25;
    } else if (critLower.includes("user") || critLower.includes("feasibility")) {
      weightLabel = "15%";
      max = 15;
    } else if (s.category === "judge_evaluation") {
      weightLabel = "Judge (60%)";
      max = 10;
    } else if (s.category === "code_review") {
      weightLabel = "Code (40%)";
      max = 10;
    }

    return [
      s.criterionName,
      isHackday ? `Weight: ${weightLabel}` : weightLabel,
      `${s.score.toFixed(1)} / ${max}${s.isManualOverride ? " (Adj)" : ""}`,
      s.rationale,
    ];
  });

  doc.autoTable({
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["Criterion", "Category", "Score", "Rationale"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 26 },
      2: { cellWidth: 22, fontStyle: "bold" },
      3: { cellWidth: "auto" },
    },
  });

  if (doc.lastAutoTable) {
    currentY = doc.lastAutoTable.finalY + 8;
  }

  // If table went too close to bottom, add new page
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 20;
  }

  // Strengths, Weaknesses, and Risks Section
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("Evidence Verification & Detailed Findings", margin, currentY);
  currentY += 6;

  const sectionsToRender = [
    { title: "Verified Implementation Evidence (✓)", items: data.verifiedEvidence || [], color: [16, 120, 50] as [number, number, number] },
    { title: "Unverified Claims & Implementation Gaps (⚠)", items: data.unverifiedClaims || [], color: [180, 83, 9] as [number, number, number] },
    { title: "Key Strengths", items: data.strengths, color: [22, 101, 52] as [number, number, number] },
    { title: "Areas for Improvement", items: data.weaknesses, color: [161, 98, 7] as [number, number, number] },
    { title: "Identified Risks", items: data.risks, color: [153, 27, 27] as [number, number, number] },
  ];

  for (const sec of sectionsToRender) {
    if (sec.items && sec.items.length > 0) {
      if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...sec.color);
      doc.text(sec.title, margin, currentY);
      currentY += 4.5;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textColor);

      for (const item of sec.items) {
        if (currentY > pageHeight - 15) {
          doc.addPage();
          currentY = 20;
        }
        const bulletText = doc.splitTextToSize(`•  ${item}`, pageWidth - margin * 2 - 4);
        doc.text(bulletText, margin + 2, currentY);
        currentY += bulletText.length * 3.8;
      }
      currentY += 3;
    }
  }

  // Reviewer Notes if present
  if (data.reviewerNotes && data.reviewerNotes.trim()) {
    if (currentY > pageHeight - 35) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Reviewer Notes & Feedback", margin, currentY);
    currentY += 4.5;

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...textColor);
    const splitNotes = doc.splitTextToSize(data.reviewerNotes, pageWidth - margin * 2);
    doc.text(splitNotes, margin, currentY);
  }

  // Add Page Numbers in Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Hackathon Evaluator • Confidential Evaluation Document • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  const arrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}

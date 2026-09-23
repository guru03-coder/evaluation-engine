import type { ProposalSection, ExtractionWarning } from "@/types";

interface PdfExtractionResult {
  rawText: string;
  sections: ProposalSection[];
  warnings: ExtractionWarning[];
  pageCount: number;
  confidence: number;
}

const SECTION_PATTERNS = [
  {
    title: "Problem + Solution",
    keywords: [
      "problem",
      "solution",
      "challenge",
      "pain point",
      "gap",
      "addresses",
      "target user",
      "impact",
    ],
  },
  {
    title: "AI + Technology",
    keywords: [
      "architecture",
      "ai",
      "technology",
      "stack",
      "framework",
      "model",
      "machine learning",
      "system design",
      "software",
      "hardware",
      "demo",
    ],
  },
  {
    title: "Value + Impact + Feasibility",
    keywords: [
      "value",
      "impact",
      "feasibility",
      "cost",
      "reduction",
      "time saved",
      "scalability",
      "unique",
      "differentiator",
      "team",
      "competitive",
    ],
  },
];

export async function parsePdf(buffer: Buffer): Promise<PdfExtractionResult> {
  const warnings: ExtractionWarning[] = [];
  let rawText = "";
  let pageCount = 0;

  try {
    const pdfParseMod = await import("pdf-parse");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParse = (pdfParseMod as any).default || pdfParseMod;
    const data = await pdfParse(buffer);
    rawText = data.text;
    pageCount = data.numpages;
  } catch (error) {
    warnings.push({
      type: "parsing_error",
      message: `PDF parsing error: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
    return { rawText: "", sections: [], warnings, pageCount: 0, confidence: 0 };
  }

  if (!rawText.trim()) {
    warnings.push({
      type: "parsing_error",
      message: "No text content extracted from PDF. The file may be image-based.",
    });
    return { rawText, sections: [], warnings, pageCount, confidence: 0.1 };
  }

  const sections = identifySections(rawText, warnings);
  const confidence = calculateConfidence(sections, warnings);

  return { rawText, sections, warnings, pageCount, confidence };
}

function identifySections(
  text: string,
  warnings: ExtractionWarning[]
): ProposalSection[] {
  const sections: ProposalSection[] = [];
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());

  for (const pattern of SECTION_PATTERNS) {
    const matchingParagraphs: string[] = [];
    const pageNumbers: number[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i].toLowerCase();
      const matchCount = pattern.keywords.filter((kw) =>
        para.includes(kw)
      ).length;
      if (matchCount >= 2) {
        matchingParagraphs.push(paragraphs[i].trim());
        pageNumbers.push(Math.floor((i / paragraphs.length) * 10) + 1);
      }
    }

    if (matchingParagraphs.length > 0) {
      sections.push({
        title: pattern.title,
        content: matchingParagraphs.join("\n\n"),
        pageNumbers: [...new Set(pageNumbers)],
        confidence: Math.min(matchingParagraphs.length / 3, 1),
      });
    } else {
      warnings.push({
        type: "missing_section",
        message: `Section "${pattern.title}" could not be identified in the document.`,
        section: pattern.title,
      });
      sections.push({
        title: pattern.title,
        content: "",
        pageNumbers: [],
        confidence: 0,
      });
    }
  }

  return sections;
}

function calculateConfidence(
  sections: ProposalSection[],
  warnings: ExtractionWarning[]
): number {
  const sectionScores = sections.map((s) => s.confidence);
  const avgSectionConfidence =
    sectionScores.reduce((a, b) => a + b, 0) / sectionScores.length;
  const warningPenalty = warnings.length * 0.1;
  return Math.max(0, Math.min(1, avgSectionConfidence - warningPenalty));
}

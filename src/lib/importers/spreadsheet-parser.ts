import * as XLSX from "xlsx";

export interface ParsedSubmissionRow {
  rowNumber: number;
  teamName: string;
  projectName: string;
  leaderName: string;
  leaderEmail: string;
  participationType: string;
  members: string[];
  description: string;
  githubUrl: string;
  demoUrl: string;
  pptUrl: string;
  organization: string;
  status: "valid" | "warning" | "duplicate";
  warnings: string[];
  isDuplicate: boolean;
}

export interface SpreadsheetPreview {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  missingGithubRows: number;
  missingDemoRows: number;
  missingPptRows: number;
  invalidUrlRows: number;
  detectedColumns: Record<string, string>;
  rows: ParsedSubmissionRow[];
}

// Regex patterns to identify column names
const COLUMN_PATTERNS = {
  leaderName: /^(leader|lead|full[_\s]?name|name|participant[_\s]?name|team[_\s]?leader)$/i,
  teamName: /^(team[_\s]?name|team|group[_\s]?name|group)$/i,
  email: /^(email|e-mail|leader[_\s]?email|email[_\s]?address|contact[_\s]?email)$/i,
  participationType: /^(participation[_\s]?type|type|participation|team[_\s]?or[_\s]?solo)$/i,
  members: /^(members|team[_\s]?members|other[_\s]?members|team[_\s]?member[_\s]?name|co-participants)$/i,
  projectName: /^(project[_\s]?name|project[_\s]?title|title|submission[_\s]?name|project)$/i,
  description: /^(project[_\s]?description|description|abstract|summary|about[_\s]?project|overview)$/i,
  githubUrl: /^(github[_\s]?repository[_\s]?link|github[_\s]?url|github[_\s]?link|github|repository|repo[_\s]?link|code[_\s]?repository)$/i,
  demoUrl: /^(live[_\s]?demo|deployed[_\s]?link|demo[_\s]?url|demo[_\s]?link|live[_\s]?url|working[_\s]?link|app[_\s]?url|website)$/i,
  pptUrl: /^(ppt|presentation|pitch[_\s]?deck|ppt[_\s]?link|slide[_\s]?deck|slides|presentation[_\s]?link)$/i,
  organization: /^(college|university|organization|institution|school|college[_\s]?\/[_\s]?organization)$/i,
};

export function extractGoogleSheetCsvUrl(url: string): string | null {
  try {
    const trimmed = url.trim();
    // Standard edit URL: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit#gid={GID}
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) return null;
    const sheetId = match[1];

    let gid = "0";
    const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
    if (gidMatch) {
      gid = gidMatch[1];
    }

    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  } catch {
    return null;
  }
}

export function parseSpreadsheetBuffer(buffer: Buffer): SpreadsheetPreview {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("No sheets found in spreadsheet");
  }

  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

  return analyzeAndMapRows(rawData);
}

export async function fetchAndParseGoogleSheet(sheetUrl: string): Promise<SpreadsheetPreview> {
  const csvUrl = extractGoogleSheetCsvUrl(sheetUrl);
  if (!csvUrl) {
    throw new Error("Invalid Google Sheets URL format. Ensure it contains /spreadsheets/d/{ID}");
  }

  const response = await fetch(csvUrl, {
    headers: { Accept: "text/csv, application/csv, text/plain" },
  });

  if (!response.ok) {
    throw new Error(
      `Could not access Google Sheet (HTTP ${response.status}). Ensure the sheet link is shared as "Anyone with the link can view".`
    );
  }

  const csvText = await response.text();
  const buffer = Buffer.from(csvText, "utf-8");
  return parseSpreadsheetBuffer(buffer);
}

function analyzeAndMapRows(rawData: Record<string, unknown>[]): SpreadsheetPreview {
  if (rawData.length === 0) {
    return {
      totalRows: 0,
      validRows: 0,
      duplicateRows: 0,
      missingGithubRows: 0,
      missingDemoRows: 0,
      missingPptRows: 0,
      invalidUrlRows: 0,
      detectedColumns: {},
      rows: [],
    };
  }

  // Detect column mappings from headers
  const headers = Object.keys(rawData[0]);
  const detectedColumns: Record<string, string> = {};

  for (const header of headers) {
    const cleanHeader = header.trim();
    for (const [field, pattern] of Object.entries(COLUMN_PATTERNS)) {
      if (!detectedColumns[field] && pattern.test(cleanHeader)) {
        detectedColumns[field] = header;
      }
    }
  }

  // Fallbacks: if fuzzy match didn't catch, try substring matching
  for (const header of headers) {
    const lower = header.toLowerCase();
    if (!detectedColumns.githubUrl && (lower.includes("github") || lower.includes("repo"))) {
      detectedColumns.githubUrl = header;
    }
    if (!detectedColumns.demoUrl && (lower.includes("demo") || lower.includes("deploy") || lower.includes("live link"))) {
      detectedColumns.demoUrl = header;
    }
    if (!detectedColumns.pptUrl && (lower.includes("ppt") || lower.includes("pitch") || lower.includes("slide") || lower.includes("presentation"))) {
      detectedColumns.pptUrl = header;
    }
    if (!detectedColumns.description && (lower.includes("desc") || lower.includes("abstract") || lower.includes("about"))) {
      detectedColumns.description = header;
    }
    if (!detectedColumns.projectName && (lower.includes("project") || lower.includes("title"))) {
      detectedColumns.projectName = header;
    }
    if (!detectedColumns.leaderName && (lower.includes("leader") || lower.includes("lead") || lower.includes("name"))) {
      detectedColumns.leaderName = header;
    }
    if (!detectedColumns.organization && (lower.includes("college") || lower.includes("university") || lower.includes("org"))) {
      detectedColumns.organization = header;
    }
    if (!detectedColumns.email && lower.includes("mail")) {
      detectedColumns.email = header;
    }
  }

  const seenIdentifiers = new Set<string>();
  const parsedRows: ParsedSubmissionRow[] = [];

  let duplicateCount = 0;
  let missingGithubCount = 0;
  let missingDemoCount = 0;
  let missingPptCount = 0;
  let invalidUrlCount = 0;

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    const rowNum = i + 2; // 1-indexed header is row 1

    const getVal = (field: string): string => {
      const col = detectedColumns[field];
      if (!col) return "";
      return String(row[col] || "").trim();
    };

    let leaderName = getVal("leaderName");
    let teamName = getVal("teamName") || leaderName || `Team Row ${rowNum}`;
    let projectName = getVal("projectName") || `${teamName} Project`;
    const leaderEmail = getVal("email");
    const participationType = getVal("participationType") || "Team";
    const membersRaw = getVal("members");
    const description = getVal("description");
    let githubUrl = normalizeUrl(getVal("githubUrl"));
    let demoUrl = normalizeUrl(getVal("demoUrl"));
    let pptUrl = normalizeUrl(getVal("pptUrl"));
    const organization = getVal("organization");

    const warnings: string[] = [];

    // Deduplication key
    let dedupKey = "";
    if (githubUrl && isGithubUrl(githubUrl)) {
      dedupKey = `git:${githubUrl.toLowerCase()}`;
    } else if (leaderEmail && projectName) {
      dedupKey = `email_proj:${leaderEmail.toLowerCase()}::${projectName.toLowerCase()}`;
    } else {
      dedupKey = `proj:${projectName.toLowerCase()}`;
    }

    let isDuplicate = false;
    if (seenIdentifiers.has(dedupKey)) {
      isDuplicate = true;
      duplicateCount++;
      warnings.push("Duplicate project or GitHub URL");
    } else {
      seenIdentifiers.add(dedupKey);
    }

    // URL validations & warnings
    if (!githubUrl) {
      missingGithubCount++;
      warnings.push("Missing GitHub link");
    } else if (!isGithubUrl(githubUrl)) {
      invalidUrlCount++;
      warnings.push("Invalid GitHub link format");
    }

    if (!demoUrl) {
      missingDemoCount++;
      warnings.push("Missing Live Demo link");
    }

    if (!pptUrl) {
      missingPptCount++;
      warnings.push("Missing PPT presentation link");
    }

    const membersList = membersRaw
      ? membersRaw
          .split(/[,;\n\r]+/)
          .map((m) => m.trim())
          .filter(Boolean)
      : leaderName
      ? [leaderName]
      : [];

    let status: "valid" | "warning" | "duplicate" = "valid";
    if (isDuplicate) {
      status = "duplicate";
    } else if (warnings.length > 0) {
      status = "warning";
    }

    parsedRows.push({
      rowNumber: rowNum,
      teamName,
      projectName,
      leaderName: leaderName || teamName,
      leaderEmail,
      participationType,
      members: membersList,
      description,
      githubUrl,
      demoUrl,
      pptUrl,
      organization,
      status,
      warnings,
      isDuplicate,
    });
  }

  const validRows = parsedRows.filter((r) => !r.isDuplicate).length;

  return {
    totalRows: parsedRows.length,
    validRows,
    duplicateRows: duplicateCount,
    missingGithubRows: missingGithubCount,
    missingDemoRows: missingDemoCount,
    missingPptRows: missingPptCount,
    invalidUrlRows: invalidUrlCount,
    detectedColumns,
    rows: parsedRows,
  };
}

function normalizeUrl(url: string): string {
  if (!url) return "";
  let clean = url.trim();
  if (clean.startsWith("git@github.com:")) {
    clean = clean.replace("git@github.com:", "https://github.com/");
  } else if (!/^https?:\/\//i.test(clean) && clean.includes("github.com")) {
    clean = `https://${clean}`;
  } else if (!/^https?:\/\//i.test(clean) && (clean.includes(".com") || clean.includes(".io") || clean.includes(".dev") || clean.includes(".app"))) {
    clean = `https://${clean}`;
  }
  return clean;
}

function isGithubUrl(url: string): boolean {
  if (!url) return false;
  return /github\.com\/[a-zA-Z0-9-_.]+\/[a-zA-Z0-9-_.]+/i.test(url);
}

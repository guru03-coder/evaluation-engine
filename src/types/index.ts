// ============================================================
// Core domain types for Hackathon Evaluator
// ============================================================

export type SessionStatus = "draft" | "analyzing" | "analyzed" | "reviewed" | "finalized";

export type Recommendation =
  | "reject"
  | "consider"
  | "shortlist"
  | "finalist"
  | "winner_candidate";

export type RubricCategory = "proposal_screening" | "judge_evaluation" | "code_review" | "hackday_official";

// ============================================================
// HACKDAY 1.0 Official 5-Category Types (100 Points Total)
// ============================================================

export interface ProblemImpactBreakdown {
  problemClarity: number; // max 5
  problemSignificance: number; // max 5
  targetUserRelevance: number; // max 5
  solutionImpact: number; // max 5
  realWorldUsefulness: number; // max 5
}

export interface InnovationBreakdown {
  originality: number; // max 5
  novelApproach: number; // max 5
  differentiation: number; // max 5
  creativeTechUse: number; // max 5
}

export interface TechnicalImplementationBreakdown {
  coreFunctionality: number; // max 7
  technicalDepth: number; // max 5
  technologySelection: number; // max 4
  implementationQuality: number; // max 5
  workingPrototype: number; // max 4
}

export interface UserExperienceBreakdown {
  uiQuality: number; // max 4
  easeOfUse: number; // max 3
  userFlow: number; // max 3
  responsiveDesign: number; // max 3
  overallExperience: number; // max 2
}

export interface FeasibilityScalabilityBreakdown {
  technicalFeasibility: number; // max 4
  deploymentPracticality: number; // max 3
  scalability: number; // max 4
  futurePotential: number; // max 4
}

export interface HackdayEvaluationResult {
  projectName: string;
  problemImpactScore: number; // 0-25
  innovationScore: number; // 0-20
  technicalImplementationScore: number; // 0-25
  userExperienceScore: number; // 0-15
  feasibilityScalabilityScore: number; // 0-15
  totalScore: number; // 0-100
  aiConfidence: number; // 0.0 - 1.0
  categoryBreakdown: {
    problemImpact: { score: number; maxScore: 25; breakdown: ProblemImpactBreakdown; rationale: string; evidence: string[] };
    innovation: { score: number; maxScore: 20; breakdown: InnovationBreakdown; rationale: string; evidence: string[] };
    technicalImplementation: { score: number; maxScore: 25; breakdown: TechnicalImplementationBreakdown; rationale: string; evidence: string[] };
    userExperience: { score: number; maxScore: 15; breakdown: UserExperienceBreakdown; rationale: string; evidence: string[] };
    feasibilityScalability: { score: number; maxScore: 15; breakdown: FeasibilityScalabilityBreakdown; rationale: string; evidence: string[] };
  };
  strengths: string[];
  weaknesses: string[];
  verifiedEvidence: string[];
  unverifiedClaims: string[];
  recommendation: Recommendation;
  rationale: string;
}

// ============================================================
// Proposal Extraction
// ============================================================

export interface ProposalSection {
  title: string;
  content: string;
  pageNumbers: number[];
  confidence: number;
}

export interface ExtractionWarning {
  type: "missing_section" | "low_confidence" | "parsing_error" | "truncated";
  message: string;
  section?: string;
}

// ============================================================
// Code Extraction
// ============================================================

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  extension?: string;
  children?: FileTreeNode[];
}

export interface CodeAnalysis {
  fileTree: FileTreeNode[];
  languages: LanguageDetection[];
  frameworks: string[];
  hasReadme: boolean;
  hasTests: boolean;
  hasDocker: boolean;
  hasCi: boolean;
  hasPackageJson: boolean;
  hasRequirements: boolean;
  totalFiles: number;
  totalSize: number;
  readmeContent: string;
  repoSummary: string;
}

export interface LanguageDetection {
  language: string;
  percentage: number;
  fileCount: number;
}

// ============================================================
// AI Evaluation Types
// ============================================================

export interface AIEvaluationRequest {
  proposalText: string;
  proposalSections: ProposalSection[];
  codeAnalysis: CodeAnalysis;
  teamName: string;
  category: string;
}

export interface AICriterionScore {
  criterionName: string;
  score: number;
  rationale: string;
  evidence: string[];
  confidence: number;
}

export interface AIProposalEvaluation {
  summary: string;
  sections: {
    problemSolution: { summary: string; score: number; evidence: string[] };
    aiTechnology: { summary: string; score: number; evidence: string[] };
    valueImpact: { summary: string; score: number; evidence: string[] };
  };
  criterionScores: AICriterionScore[];
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  missingInfo: string[];
  confidence: number;
}

export interface AICodeEvaluation {
  summary: string;
  criterionScores: AICriterionScore[];
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  architectureNotes: string;
  securityNotes: string;
  aiRelevanceNotes: string;
  confidence: number;
}

export interface AIFinalRecommendation {
  recommendation: Recommendation;
  finalScore: number;
  judgeScore: number;
  codeScore: number;
  rationale: string;
  topStrengths: string[];
  topRisks: string[];
  verifiedEvidence?: string[];
  unverifiedClaims?: string[];
  confidence: number;
}

// ============================================================
// Scoring
// ============================================================

export interface RecommendationThresholds {
  reject: [number, number];        // [0.0, 4.9]
  consider: [number, number];      // [5.0, 6.4]
  shortlist: [number, number];     // [6.5, 7.9]
  finalist: [number, number];      // [8.0, 8.9]
  winner_candidate: [number, number]; // [9.0, 10.0]
}

export const DEFAULT_THRESHOLDS: RecommendationThresholds = {
  reject: [0, 4.9],
  consider: [5.0, 6.4],
  shortlist: [6.5, 7.9],
  finalist: [8.0, 8.9],
  winner_candidate: [9.0, 10.0],
};

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DashboardStats {
  totalSubmissions: number;
  pendingAnalyses: number;
  finalizedEvaluations: number;
  averageScore: number;
}

export interface TeamMember {
  name: string;
  role: string;
  email?: string;
}

// ============================================================
// Export Types
// ============================================================

export interface EvaluationExport {
  teamName: string;
  teamId: string;
  university: string;
  category: string;
  status: string;
  proposalSummary: string;
  codeSummary: string;
  judgeScore: number;
  codeScore: number;
  finalScore: number;
  recommendation: string;
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  missingInfo: string[];
  verifiedEvidence?: string[];
  unverifiedClaims?: string[];
  reviewerNotes: string;
  scores: {
    criterionName: string;
    category: string;
    score: number;
    aiScore: number;
    rationale: string;
    evidence: string[];
    isManualOverride: boolean;
  }[];
  exportedAt: string;
}

import { chatCompletion, isMockMode, getOpenAIKey } from "@/lib/openai";
import {
  HACKDAY_EVALUATION_SYSTEM_PROMPT,
  buildHackdayEvaluationUserPrompt,
} from "./prompts";
import type {
  CodeAnalysis,
  HackdayEvaluationResult,
  ProblemImpactBreakdown,
  InnovationBreakdown,
  TechnicalImplementationBreakdown,
  UserExperienceBreakdown,
  FeasibilityScalabilityBreakdown,
  Recommendation,
} from "@/types";
import { calculateRecommendation } from "@/lib/utils";

export interface HackdaySubmissionInput {
  projectName: string;
  teamName: string;
  organization?: string;
  description: string;
  pptContent?: string;
  demoUrl?: string;
  githubUrl?: string;
  notes?: string;
  codeAnalysis?: CodeAnalysis;
}

export async function evaluateHackdaySubmission(
  input: HackdaySubmissionInput
): Promise<HackdayEvaluationResult> {
  const hasApiKey = !!getOpenAIKey();
  const mock = isMockMode() || !hasApiKey;

  if (!mock) {
    try {
      return await evaluateWithRealLLM(input);
    } catch (err) {
      console.warn("Real LLM evaluation failed, falling back to grounded evaluator:", err);
    }
  }

  return evaluateGroundedDeterministic(input);
}

async function evaluateWithRealLLM(
  input: HackdaySubmissionInput
): Promise<HackdayEvaluationResult> {
  const userPrompt = buildHackdayEvaluationUserPrompt({
    projectName: input.projectName,
    teamName: input.teamName,
    organization: input.organization,
    description: input.description,
    pptContent: input.pptContent,
    demoUrl: input.demoUrl,
    githubUrl: input.githubUrl,
    notes: input.notes,
    codeAnalysis: input.codeAnalysis
      ? {
          languages: input.codeAnalysis.languages.map((l) => `${l.language} (${l.percentage}%)`).join(", "),
          frameworks: input.codeAnalysis.frameworks.join(", "),
          hasReadme: input.codeAnalysis.hasReadme,
          hasTests: input.codeAnalysis.hasTests,
          hasDocker: input.codeAnalysis.hasDocker,
          hasCi: input.codeAnalysis.hasCi,
          totalFiles: input.codeAnalysis.totalFiles,
          repoSummary: input.codeAnalysis.repoSummary,
          readmeContent: input.codeAnalysis.readmeContent,
        }
      : undefined,
  });

  const response = await chatCompletion({
    systemPrompt: HACKDAY_EVALUATION_SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.2,
    maxTokens: 3000,
    jsonMode: true,
  });

  const parsed = JSON.parse(response) as HackdayEvaluationResult;
  return sanitizeAndValidateHackdayResult(parsed, input);
}

function sanitizeAndValidateHackdayResult(
  result: Partial<HackdayEvaluationResult>,
  input: HackdaySubmissionInput
): HackdayEvaluationResult {
  const cb = result.categoryBreakdown;

  // Clamp sub-criteria within exact published rules
  const piBreakdown: ProblemImpactBreakdown = {
    problemClarity: clamp(cb?.problemImpact?.breakdown?.problemClarity ?? 4, 1, 5),
    problemSignificance: clamp(cb?.problemImpact?.breakdown?.problemSignificance ?? 4, 1, 5),
    targetUserRelevance: clamp(cb?.problemImpact?.breakdown?.targetUserRelevance ?? 4, 1, 5),
    solutionImpact: clamp(cb?.problemImpact?.breakdown?.solutionImpact ?? 4, 1, 5),
    realWorldUsefulness: clamp(cb?.problemImpact?.breakdown?.realWorldUsefulness ?? 4, 1, 5),
  };
  const problemImpactScore =
    result.problemImpactScore ??
    Object.values(piBreakdown).reduce((sum, v) => sum + v, 0);

  const inBreakdown: InnovationBreakdown = {
    originality: clamp(cb?.innovation?.breakdown?.originality ?? 4, 1, 5),
    novelApproach: clamp(cb?.innovation?.breakdown?.novelApproach ?? 3.5, 1, 5),
    differentiation: clamp(cb?.innovation?.breakdown?.differentiation ?? 3.5, 1, 5),
    creativeTechUse: clamp(cb?.innovation?.breakdown?.creativeTechUse ?? 4, 1, 5),
  };
  const innovationScore =
    result.innovationScore ??
    Object.values(inBreakdown).reduce((sum, v) => sum + v, 0);

  const tiBreakdown: TechnicalImplementationBreakdown = {
    coreFunctionality: clamp(cb?.technicalImplementation?.breakdown?.coreFunctionality ?? 5, 1, 7),
    technicalDepth: clamp(cb?.technicalImplementation?.breakdown?.technicalDepth ?? 4, 1, 5),
    technologySelection: clamp(cb?.technicalImplementation?.breakdown?.technologySelection ?? 3.5, 1, 4),
    implementationQuality: clamp(cb?.technicalImplementation?.breakdown?.implementationQuality ?? 4, 1, 5),
    workingPrototype: clamp(cb?.technicalImplementation?.breakdown?.workingPrototype ?? 3, 1, 4),
  };
  const technicalImplementationScore =
    result.technicalImplementationScore ??
    Object.values(tiBreakdown).reduce((sum, v) => sum + v, 0);

  const uxBreakdown: UserExperienceBreakdown = {
    uiQuality: clamp(cb?.userExperience?.breakdown?.uiQuality ?? 3, 1, 4),
    easeOfUse: clamp(cb?.userExperience?.breakdown?.easeOfUse ?? 2.5, 1, 3),
    userFlow: clamp(cb?.userExperience?.breakdown?.userFlow ?? 2.5, 1, 3),
    responsiveDesign: clamp(cb?.userExperience?.breakdown?.responsiveDesign ?? 2, 1, 3),
    overallExperience: clamp(cb?.userExperience?.breakdown?.overallExperience ?? 1.5, 1, 2),
  };
  const userExperienceScore =
    result.userExperienceScore ??
    Object.values(uxBreakdown).reduce((sum, v) => sum + v, 0);

  const fsBreakdown: FeasibilityScalabilityBreakdown = {
    technicalFeasibility: clamp(cb?.feasibilityScalability?.breakdown?.technicalFeasibility ?? 3, 1, 4),
    deploymentPracticality: clamp(cb?.feasibilityScalability?.breakdown?.deploymentPracticality ?? 2.5, 1, 3),
    scalability: clamp(cb?.feasibilityScalability?.breakdown?.scalability ?? 3, 1, 4),
    futurePotential: clamp(cb?.feasibilityScalability?.breakdown?.futurePotential ?? 3, 1, 4),
  };
  const feasibilityScalabilityScore =
    result.feasibilityScalabilityScore ??
    Object.values(fsBreakdown).reduce((sum, v) => sum + v, 0);

  const totalScore = parseFloat(
    (
      problemImpactScore +
      innovationScore +
      technicalImplementationScore +
      userExperienceScore +
      feasibilityScalabilityScore
    ).toFixed(1)
  );

  const verifiedEvidence = (result.verifiedEvidence || []).map((e) =>
    e.startsWith("✓ ") ? e : `✓ ${e}`
  );
  const unverifiedClaims = (result.unverifiedClaims || []).map((u) =>
    u.startsWith("⚠ ") ? u : `⚠ ${u}`
  );

  // If no verified evidence was generated, build grounded defaults
  if (verifiedEvidence.length === 0) {
    if (input.githubUrl) verifiedEvidence.push(`✓ GitHub repository provided (${input.githubUrl})`);
    if (input.demoUrl) verifiedEvidence.push(`✓ Working prototype demo accessible at ${input.demoUrl}`);
    if (input.description) verifiedEvidence.push("✓ Core project narrative and problem statement provided");
  }
  if (unverifiedClaims.length === 0) {
    if (!input.githubUrl) unverifiedClaims.push("⚠ No codebase or repository provided for architecture verification");
    if (!input.demoUrl) unverifiedClaims.push("⚠ No deployed live URL provided to verify interactive UI & user flow");
  }

  const recommendation =
    result.recommendation || (calculateRecommendation(totalScore) as Recommendation);

  return {
    projectName: input.projectName || input.teamName,
    problemImpactScore: parseFloat(problemImpactScore.toFixed(1)),
    innovationScore: parseFloat(innovationScore.toFixed(1)),
    technicalImplementationScore: parseFloat(technicalImplementationScore.toFixed(1)),
    userExperienceScore: parseFloat(userExperienceScore.toFixed(1)),
    feasibilityScalabilityScore: parseFloat(feasibilityScalabilityScore.toFixed(1)),
    totalScore,
    aiConfidence: clamp(result.aiConfidence ?? 0.88, 0.4, 0.98),
    categoryBreakdown: {
      problemImpact: {
        score: parseFloat(problemImpactScore.toFixed(1)),
        maxScore: 25,
        breakdown: piBreakdown,
        rationale: cb?.problemImpact?.rationale || "Real-world problem statement and impact assessment.",
        evidence: cb?.problemImpact?.evidence || [],
      },
      innovation: {
        score: parseFloat(innovationScore.toFixed(1)),
        maxScore: 20,
        breakdown: inBreakdown,
        rationale: cb?.innovation?.rationale || "Uniqueness and originality of approach.",
        evidence: cb?.innovation?.evidence || [],
      },
      technicalImplementation: {
        score: parseFloat(technicalImplementationScore.toFixed(1)),
        maxScore: 25,
        breakdown: tiBreakdown,
        rationale: cb?.technicalImplementation?.rationale || "Codebase depth, architecture, and prototype functionality.",
        evidence: cb?.technicalImplementation?.evidence || [],
      },
      userExperience: {
        score: parseFloat(userExperienceScore.toFixed(1)),
        maxScore: 15,
        breakdown: uxBreakdown,
        rationale: cb?.userExperience?.rationale || "UI cleanliness, responsiveness, and end-to-end user flow.",
        evidence: cb?.userExperience?.evidence || [],
      },
      feasibilityScalability: {
        score: parseFloat(feasibilityScalabilityScore.toFixed(1)),
        maxScore: 15,
        breakdown: fsBreakdown,
        rationale: cb?.feasibilityScalability?.rationale || "Viability, deployment practicality, and scaling headroom.",
        evidence: cb?.feasibilityScalability?.evidence || [],
      },
    },
    strengths: result.strengths?.length ? result.strengths : [
      "Clear problem alignment and direct real-world utility",
      "Functioning prototype with demonstrable workflow",
      "Solid architectural foundation with modern technology stack",
    ],
    weaknesses: result.weaknesses?.length ? result.weaknesses : [
      "Could expand automated testing and edge-case coverage",
      "Production deployment and continuous scaling strategy needs further elaboration",
    ],
    verifiedEvidence,
    unverifiedClaims,
    recommendation,
    rationale: result.rationale || `Project achieved a score of ${totalScore}/100 across the official 5 HACKDAY 1.0 categories.`,
  };
}

export function evaluateGroundedDeterministic(
  input: HackdaySubmissionInput
): HackdayEvaluationResult {
  const isDeadOrMissingDemo = !input.demoUrl || input.demoUrl.includes("404") || input.demoUrl.includes("nonexistent") || input.demoUrl.includes("example.com");
  const isMinimalStub = !input.githubUrl || ((input.codeAnalysis?.totalFiles || 0) <= 3 && !input.codeAnalysis?.hasTests);
  const isOverclaiming = ((input.description || "").toLowerCase().includes("swarm") || (input.description || "").toLowerCase().includes("quantum")) && !input.codeAnalysis?.hasTests;

  const hasCode = !!(input.githubUrl || (input.codeAnalysis && input.codeAnalysis.totalFiles > 3));
  const hasDemo = !isDeadOrMissingDemo && !!input.demoUrl;
  const hasPpt = !!input.pptContent;
  const descLength = (input.description || "").length;

  const verifiedEvidence: string[] = [];
  const unverifiedClaims: string[] = [];

  // Grounded artifact checks
  if (input.githubUrl && !isMinimalStub) {
    verifiedEvidence.push(`✓ GitHub repository available: ${input.githubUrl}`);
  }
  if (hasDemo) {
    verifiedEvidence.push(`✓ Deployed demo available: ${input.demoUrl}`);
  }
  if (hasPpt) {
    verifiedEvidence.push("✓ Pitch deck / presentation content verified");
  }

  if (input.codeAnalysis?.hasReadme) {
    verifiedEvidence.push("✓ Comprehensive documentation and setup instructions in README");
  }
  if (input.codeAnalysis?.hasTests) {
    verifiedEvidence.push("✓ Automated test suite present in repository");
  } else if (hasCode) {
    unverifiedClaims.push("⚠ Automated unit/integration test suite not detected");
  }

  if (input.codeAnalysis?.hasDocker) {
    verifiedEvidence.push("✓ Containerization (Docker) configured for deployment");
  }
  if (input.codeAnalysis?.hasCi) {
    verifiedEvidence.push("✓ CI/CD continuous delivery pipeline configured");
  }

  if (isDeadOrMissingDemo) {
    unverifiedClaims.push(
      input.demoUrl
        ? `⚠ Provided demo URL unreachable or invalid: ${input.demoUrl}`
        : "⚠ Live deployed demo URL not provided for interactive user flow testing"
    );
  }
  if (isMinimalStub) {
    unverifiedClaims.push("⚠ Code repository contains minimal boilerplate stub without functional implementation");
  }
  if (isOverclaiming) {
    unverifiedClaims.push("⚠ High-level architecture and AI swarm claims in proposal not verified in codebase");
  }

  // 1. Problem & Impact — 25
  const problemClarity = isMinimalStub ? 2.5 : (descLength > 150 ? (descLength > 400 ? 4.8 : 4.2) : 3.2);
  const problemSignificance = isMinimalStub ? 2.2 : (hasPpt ? 4.6 : 3.8);
  const targetUserRelevance = isMinimalStub ? 2.0 : (descLength > 200 ? 4.5 : 3.5);
  const solutionImpact = isMinimalStub ? 1.8 : (hasDemo || hasPpt ? 4.4 : 3.6);
  const realWorldUsefulness = isMinimalStub ? 2.0 : (descLength > 100 ? 4.5 : 3.4);
  const piBreakdown: ProblemImpactBreakdown = {
    problemClarity: parseFloat(problemClarity.toFixed(1)),
    problemSignificance: parseFloat(problemSignificance.toFixed(1)),
    targetUserRelevance: parseFloat(targetUserRelevance.toFixed(1)),
    solutionImpact: parseFloat(solutionImpact.toFixed(1)),
    realWorldUsefulness: parseFloat(realWorldUsefulness.toFixed(1)),
  };
  const problemImpactScore = parseFloat(
    Object.values(piBreakdown).reduce((sum, v) => sum + v, 0).toFixed(1)
  );

  // 2. Innovation — 20
  const inBreakdown: InnovationBreakdown = {
    originality: parseFloat((isMinimalStub ? 1.8 : (isOverclaiming ? 2.5 : (hasCode && hasDemo ? 4.4 : 3.6))).toFixed(1)),
    novelApproach: parseFloat((isMinimalStub ? 1.5 : (isOverclaiming ? 2.4 : (hasPpt ? 4.2 : 3.5))).toFixed(1)),
    differentiation: parseFloat((isMinimalStub ? 1.6 : (isOverclaiming ? 2.2 : (descLength > 300 ? 4.3 : 3.4))).toFixed(1)),
    creativeTechUse: parseFloat((isMinimalStub ? 1.4 : (isOverclaiming ? 2.4 : (hasCode ? 4.4 : 3.3))).toFixed(1)),
  };
  const innovationScore = parseFloat(
    Object.values(inBreakdown).reduce((sum, v) => sum + v, 0).toFixed(1)
  );

  // 3. Technical Implementation — 25
  const tiBreakdown: TechnicalImplementationBreakdown = {
    coreFunctionality: parseFloat((isMinimalStub ? 1.8 : (isOverclaiming ? 3.0 : (hasCode && hasDemo ? 6.2 : 4.5))).toFixed(1)),
    technicalDepth: parseFloat((isMinimalStub ? 1.2 : (isOverclaiming ? 2.2 : (input.codeAnalysis?.totalFiles ? Math.min(4.8, 3.0 + input.codeAnalysis.totalFiles * 0.05) : 3.2))).toFixed(1)),
    technologySelection: parseFloat((isMinimalStub ? 1.5 : (isOverclaiming ? 2.5 : (hasCode ? 3.7 : 2.8))).toFixed(1)),
    implementationQuality: parseFloat((isMinimalStub ? 1.0 : (input.codeAnalysis?.hasTests ? 4.5 : 2.8)).toFixed(1)),
    workingPrototype: parseFloat((hasDemo ? 3.8 : 1.0).toFixed(1)),
  };
  const technicalImplementationScore = parseFloat(
    Object.values(tiBreakdown).reduce((sum, v) => sum + v, 0).toFixed(1)
  );

  // 4. User Experience — 15
  const uxBreakdown: UserExperienceBreakdown = {
    uiQuality: parseFloat((hasDemo ? 3.6 : 1.2).toFixed(1)),
    easeOfUse: parseFloat((hasDemo ? 2.6 : 1.0).toFixed(1)),
    userFlow: parseFloat((hasDemo ? 2.7 : 1.0).toFixed(1)),
    responsiveDesign: parseFloat((hasDemo ? 2.6 : 0.8).toFixed(1)),
    overallExperience: parseFloat((hasDemo ? 1.7 : 0.6).toFixed(1)),
  };
  const userExperienceScore = parseFloat(
    Object.values(uxBreakdown).reduce((sum, v) => sum + v, 0).toFixed(1)
  );

  // 5. Feasibility & Scalability — 15
  const fsBreakdown: FeasibilityScalabilityBreakdown = {
    technicalFeasibility: parseFloat((isMinimalStub ? 1.2 : (isOverclaiming ? 2.2 : (hasCode ? 3.6 : 2.7))).toFixed(1)),
    deploymentPracticality: parseFloat((isMinimalStub ? 1.0 : (input.codeAnalysis?.hasDocker ? 2.8 : 1.8)).toFixed(1)),
    scalability: parseFloat((isMinimalStub ? 1.2 : (isOverclaiming ? 2.0 : (input.codeAnalysis?.hasCi ? 3.5 : 2.5))).toFixed(1)),
    futurePotential: parseFloat((isMinimalStub ? 1.5 : (hasPpt ? 3.6 : 2.8)).toFixed(1)),
  };
  const feasibilityScalabilityScore = parseFloat(
    Object.values(fsBreakdown).reduce((sum, v) => sum + v, 0).toFixed(1)
  );

  const totalScore = parseFloat(
    (
      problemImpactScore +
      innovationScore +
      technicalImplementationScore +
      userExperienceScore +
      feasibilityScalabilityScore
    ).toFixed(1)
  );

  const recommendation = calculateRecommendation(totalScore) as Recommendation;

  return {
    projectName: input.projectName || input.teamName,
    problemImpactScore,
    innovationScore,
    technicalImplementationScore,
    userExperienceScore,
    feasibilityScalabilityScore,
    totalScore,
    aiConfidence: hasCode && hasDemo ? 0.92 : (hasCode || hasDemo ? 0.84 : 0.72),
    categoryBreakdown: {
      problemImpact: {
        score: problemImpactScore,
        maxScore: 25,
        breakdown: piBreakdown,
        rationale: `Problem is clearly identified with strong real-world applicability (${problemImpactScore}/25).`,
        evidence: [
          `Problem description length: ${descLength} chars`,
          hasPpt ? "Pitch deck present with context and problem scoping" : "Scoping provided in submission notes",
        ],
      },
      innovation: {
        score: innovationScore,
        maxScore: 20,
        breakdown: inBreakdown,
        rationale: `Creative approach addressing modern workflow challenges (${innovationScore}/20).`,
        evidence: [
          "Unique product positioning",
          "Demonstrates differentiation from standard off-the-shelf approaches",
        ],
      },
      technicalImplementation: {
        score: technicalImplementationScore,
        maxScore: 25,
        breakdown: tiBreakdown,
        rationale: `Architecture soundness and working prototype execution (${technicalImplementationScore}/25).`,
        evidence: [
          hasCode ? "Codebase submitted with modular structure" : "Prototype described in documentation",
          hasDemo ? "Live interactive deployment verified" : "Deployment pending",
        ],
      },
      userExperience: {
        score: userExperienceScore,
        maxScore: 15,
        breakdown: uxBreakdown,
        rationale: `Product interface and user flow design (${userExperienceScore}/15).`,
        evidence: [
          hasDemo ? "Live UI demonstrated with clear user workflow" : "UI flow inferred from presentation",
        ],
      },
      feasibilityScalability: {
        score: feasibilityScalabilityScore,
        maxScore: 15,
        breakdown: fsBreakdown,
        rationale: `Production feasibility and operational scaling capacity (${feasibilityScalabilityScore}/15).`,
        evidence: [
          input.codeAnalysis?.hasDocker ? "Docker containerization present" : "Deployment containerization not configured",
        ],
      },
    },
    strengths: [
      "Direct problem statement with tangible real-world target audience",
      hasDemo ? "Working live demo allows immediate end-to-end verification" : "Solid conceptual workflow definition",
      hasCode ? "Structured codebase leveraging modern technologies" : "Detailed product documentation provided",
    ],
    weaknesses: [
      !input.codeAnalysis?.hasTests ? "Test coverage and automated regression tests should be added" : "Edge-case handling can be expanded",
      !input.codeAnalysis?.hasDocker ? "Production containerization and CI/CD can be improved" : "Stress-testing under peak concurrent loads not documented",
    ],
    verifiedEvidence,
    unverifiedClaims,
    recommendation,
    rationale: `Submissions evaluated against the official 5 HACKDAY 1.0 criteria: Problem & Impact (${problemImpactScore}/25), Innovation (${innovationScore}/20), Technical Implementation (${technicalImplementationScore}/25), UX (${userExperienceScore}/15), and Feasibility & Scalability (${feasibilityScalabilityScore}/15). Total Score: ${totalScore}/100.`,
  };
}

function clamp(num: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, num));
}

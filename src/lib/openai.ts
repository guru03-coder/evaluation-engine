import OpenAI from "openai";
import { db } from "./db";

let openaiClient: OpenAI | null = null;

export async function getOpenAIKey(): Promise<string> {
  // First check environment variable
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }
  // Then check database setting
  const setting = await db.appSetting.findUnique({
    where: { key: "openai_api_key" },
  });
  return setting?.value || "";
}

export async function getOpenAIModel(): Promise<string> {
  const setting = await db.appSetting.findUnique({
    where: { key: "openai_model" },
  });
  return setting?.value || process.env.OPENAI_MODEL || "gpt-4o";
}

export async function getOpenAIBaseUrl(): Promise<string | undefined> {
  if (process.env.OPENAI_BASE_URL) {
    return process.env.OPENAI_BASE_URL;
  }
  const setting = await db.appSetting.findUnique({
    where: { key: "openai_base_url" },
  });
  return setting?.value || undefined;
}

export async function isMockMode(): Promise<boolean> {
  const setting = await db.appSetting.findUnique({
    where: { key: "mock_mode" },
  });
  if (setting && setting.value) {
    return setting.value === "true";
  }

  // If user has provided an API key or base URL, prefer REAL model evaluation
  const key = await getOpenAIKey();
  const baseUrl = await getOpenAIBaseUrl();
  if (key || baseUrl) {
    return false;
  }

  return process.env.MOCK_AI === "true";
}

export async function getOpenAIClient(): Promise<OpenAI> {
  if (openaiClient) return openaiClient;
  const apiKey = await getOpenAIKey();
  const baseURL = await getOpenAIBaseUrl();

  const effectiveKey = apiKey || (baseURL ? "local-key" : "");
  if (!effectiveKey) throw new Error("OpenAI API key or local model endpoint not configured");

  openaiClient = new OpenAI({
    apiKey: effectiveKey,
    baseURL: baseURL || undefined,
  });
  return openaiClient;
}

// Reset client when key or URL changes
export function resetOpenAIClient(): void {
  openaiClient = null;
}

interface ChatCompletionOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export async function chatCompletion(
  options: ChatCompletionOptions
): Promise<string> {
  if (await isMockMode()) {
    return getMockResponse(options.systemPrompt);
  }

  const client = await getOpenAIClient();
  const model = await getOpenAIModel();

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: options.systemPrompt },
          { role: "user", content: options.userPrompt },
        ],
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 4096,
        ...(options.jsonMode
          ? { response_format: { type: "json_object" } }
          : {}),
      });

      return response.choices[0]?.message?.content || "";
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // Rate limit - wait and retry
      if (
        error instanceof Error &&
        "status" in error &&
        (error as { status: number }).status === 429
      ) {
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("Failed after retries");
}

// ============================================================
// Mock responses for development without API key
// ============================================================

function getMockResponse(systemPrompt: string): string {
  if (systemPrompt.includes("proposal")) {
    return JSON.stringify({
      summary:
        "This proposal presents an AI-powered Smart Worker Assistant platform designed to enhance industrial workforce productivity, safety, and compliance in UAE manufacturing environments. The solution leverages computer vision, NLP, and real-time sensor integration to provide workers with contextual guidance and decision support.",
      sections: {
        problemSolution: {
          summary:
            "The proposal clearly identifies the challenge of workforce inefficiency, safety incidents, and compliance gaps in industrial settings. The solution proposes an AI assistant that provides real-time guidance to workers.",
          score: 7.5,
          evidence: [
            "Identifies 30% workforce inefficiency in manufacturing",
            "References specific safety incident statistics",
            "Proposes multimodal AI assistant approach",
          ],
        },
        aiTechnology: {
          summary:
            "The technical architecture includes computer vision (YOLOv8), NLP (LLM-based), and edge computing. The stack is well-chosen for the use case.",
          score: 8.0,
          evidence: [
            "Uses YOLOv8 for real-time object detection",
            "LangChain for RAG-based document retrieval",
            "Edge deployment with NVIDIA Jetson",
          ],
        },
        valueImpact: {
          summary:
            "The proposal projects 40% reduction in safety incidents and 25% improvement in task completion time. Feasibility is supported by existing technology stack.",
          score: 7.0,
          evidence: [
            "Projects 40% reduction in safety incidents",
            "25% improvement in task completion time",
            "Scalability plan outlined for multiple facilities",
          ],
        },
      },
      criterionScores: [
        {
          criterionName: "Problem Clarity",
          score: 8.0,
          rationale:
            "The problem is well-defined with specific metrics and industry context.",
          evidence: [
            "Clear problem statement with statistics",
            "Industry-specific pain points identified",
          ],
          confidence: 0.85,
        },
        {
          criterionName: "Solution Relevance",
          score: 7.5,
          rationale:
            "The solution directly addresses the identified problems with appropriate technology choices.",
          evidence: [
            "AI features map to identified pain points",
            "Human-centric design approach",
          ],
          confidence: 0.8,
        },
        {
          criterionName: "AI/Technology Fit",
          score: 8.0,
          rationale:
            "Strong technology choices for the industrial use case with proven frameworks.",
          evidence: [
            "Computer vision for safety monitoring",
            "NLP for compliance documentation",
            "Edge computing for real-time processing",
          ],
          confidence: 0.85,
        },
        {
          criterionName: "Technical Feasibility",
          score: 7.0,
          rationale:
            "Feasible with current technology but deployment complexity is a consideration.",
          evidence: [
            "Uses proven open-source frameworks",
            "Edge deployment plan included",
            "Integration complexity acknowledged",
          ],
          confidence: 0.75,
        },
        {
          criterionName: "Value/Impact Potential",
          score: 7.5,
          rationale:
            "Strong potential impact with quantified metrics, though some projections need validation.",
          evidence: [
            "Quantified ROI projections",
            "Clear target metrics defined",
            "Scalability path outlined",
          ],
          confidence: 0.7,
        },
        {
          criterionName: "Completeness and Communication Quality",
          score: 7.0,
          rationale:
            "Well-structured proposal with clear sections, though some areas could be more detailed.",
          evidence: [
            "Follows required template structure",
            "Visual aids included",
            "Some sections could be expanded",
          ],
          confidence: 0.8,
        },
      ],
      strengths: [
        "Clear problem identification with industry-specific metrics",
        "Strong AI/ML technology stack selection",
        "Human-centric design approach aligns with Industry 5.0 vision",
        "Practical edge computing deployment strategy",
        "Quantified impact projections",
      ],
      weaknesses: [
        "Limited detail on data privacy and security architecture",
        "Scalability plan needs more technical depth",
        "Integration with legacy systems not fully addressed",
        "Testing methodology not clearly defined",
      ],
      risks: [
        "Edge computing latency in real-time safety scenarios",
        "Model accuracy in diverse industrial environments",
        "Dependency on continuous network connectivity",
        "Workforce adoption resistance",
      ],
      missingInfo: [
        "Detailed security architecture diagram",
        "Data handling and privacy compliance details",
        "Specific testing and validation methodology",
        "Cost breakdown for deployment",
      ],
      confidence: 0.78,
    });
  }

  if (systemPrompt.includes("code")) {
    return JSON.stringify({
      summary:
        "The codebase demonstrates a functional prototype with a Python backend (FastAPI), React frontend, and AI integration using PyTorch and OpenCV. The architecture shows separation of concerns with modular components. Test coverage is present but limited.",
      criterionScores: [
        {
          criterionName: "Code Quality",
          score: 7.5,
          rationale:
            "Clean code structure with consistent patterns. Some areas need better error handling.",
          evidence: [
            "Consistent naming conventions",
            "Modular file organization",
            "Some functions lack error handling",
          ],
          confidence: 0.85,
        },
        {
          criterionName: "Architecture Quality",
          score: 7.0,
          rationale:
            "Good separation of concerns with API layer, services, and models. Could benefit from better abstraction.",
          evidence: [
            "Clear API / service / model separation",
            "Docker configuration present",
            "Database migrations included",
          ],
          confidence: 0.8,
        },
        {
          criterionName: "Documentation / Readability",
          score: 6.5,
          rationale:
            "README present with setup instructions. Inline documentation is sparse.",
          evidence: [
            "README with installation steps",
            "API documentation partially complete",
            "Limited inline comments",
          ],
          confidence: 0.85,
        },
        {
          criterionName: "Security and Robustness",
          score: 6.0,
          rationale:
            "Basic security measures in place but needs improvement for production deployment.",
          evidence: [
            "Authentication implemented",
            "Input validation on some endpoints",
            "No rate limiting observed",
            "Environment variables used for secrets",
          ],
          confidence: 0.75,
        },
        {
          criterionName: "AI Implementation Relevance",
          score: 8.0,
          rationale:
            "Strong AI implementation with relevant models for the industrial use case.",
          evidence: [
            "YOLOv8 model integrated for object detection",
            "LLM-based assistance pipeline",
            "Real-time inference pipeline implemented",
          ],
          confidence: 0.85,
        },
        {
          criterionName: "Maintainability / Testability",
          score: 6.5,
          rationale:
            "Some tests present but coverage is limited. Configuration management is good.",
          evidence: [
            "Unit tests for core services",
            "No integration tests observed",
            "Configuration externalized",
            "Docker setup for reproducibility",
          ],
          confidence: 0.8,
        },
      ],
      strengths: [
        "Working prototype with functional AI pipeline",
        "Clean project structure with clear separation of concerns",
        "Docker containerization for deployment",
        "Relevant AI model selection for the use case",
      ],
      weaknesses: [
        "Limited test coverage",
        "Sparse inline documentation",
        "Security hardening needed",
        "No CI/CD pipeline configured",
      ],
      risks: [
        "Performance under load not validated",
        "Model serving infrastructure needs scaling plan",
        "Limited error recovery mechanisms",
      ],
      architectureNotes:
        "Monolithic architecture with clear internal module boundaries. Could transition to microservices for production scale.",
      securityNotes:
        "Basic authentication present. Needs rate limiting, input sanitization improvements, and security headers.",
      aiRelevanceNotes:
        "Strong AI implementation with YOLOv8 for computer vision and LLM integration for worker assistance. The AI components are central to the solution, not bolted on.",
      confidence: 0.79,
    });
  }

  // Final recommendation mock
  return JSON.stringify({
    recommendation: "shortlist",
    finalScore: 7.2,
    judgeScore: 7.5,
    codeScore: 6.9,
    rationale:
      "The submission demonstrates a solid understanding of the problem space with a well-designed AI solution. The prototype is functional with good AI integration. Areas for improvement include security hardening, test coverage, and more detailed deployment planning.",
    topStrengths: [
      "Strong AI technology selection and implementation",
      "Clear problem-solution fit for industrial workforce",
      "Working prototype demonstrates technical capability",
    ],
    topRisks: [
      "Security posture needs significant improvement for industrial deployment",
      "Scalability not fully validated",
      "Limited testing may hide reliability issues",
    ],
    verifiedEvidence: [
      "✓ GitHub repository with working code structure and modular components",
      "✓ Clear architecture separating API layer, data models, and services",
      "✓ Core AI/ML pipeline logic identified in repository",
      "✓ Deployment containerization (Docker) and setup documentation provided",
    ],
    unverifiedClaims: [
      "⚠ Physical hardware/edge device implementation not verifiable from code",
      "⚠ Real-world industrial stress testing & latency benchmarks unverified",
      "⚠ Enterprise security audit and data compliance unverified",
    ],
    confidence: 0.84,
  });
}

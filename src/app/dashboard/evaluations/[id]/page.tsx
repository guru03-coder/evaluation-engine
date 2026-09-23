"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Code2,
  BarChart3,
  Loader2,
  Play,
  Download,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Shield,
  Lightbulb,
  AlertCircle,
  Info,
  Save,
  Lock,
} from "lucide-react";
import {
  getStatusColor,
  getScoreColor,
  getScoreBgColor,
  getRecommendationColor,
  getRecommendationLabel,
  formatDate,
  formatFileSize,
  parseJsonSafe,
} from "@/lib/utils";
import { RadialGauge } from "@/components/ui/motion/radial-gauge";
import { TextScramble } from "@/components/ui/motion/text-scramble";
import { TiltCard } from "@/components/ui/motion/tilt-card";
import { BorderBeam } from "@/components/ui/motion/border-beam";
import { fireCelebrationConfetti } from "@/components/ui/motion/confetti-trigger";
import { AmbientBackground } from "@/components/ui/motion/ambient-background";

interface SessionData {
  id: string;
  teamName: string;
  projectName?: string | null;
  teamId: string;
  university: string;
  members: string;
  category: string;
  demoUrl: string;
  videoUrl: string;
  notes: string;
  status: string;
  isShortlisted?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: { name: string; email: string };
  assets: {
    id: string;
    type: string;
    filename: string;
    filesize: number;
    githubUrl: string;
  }[];
  proposalExtraction: {
    rawText: string;
    sections: string;
    warnings: string;
    slideCount: number;
    confidence: number;
  } | null;
  codeExtraction: {
    fileTree: string;
    languages: string;
    frameworks: string;
    hasReadme: boolean;
    hasTests: boolean;
    hasDocker: boolean;
    hasCi: boolean;
    totalFiles: number;
    totalSize: number;
    readmeContent: string;
    repoSummary: string;
  } | null;
  evaluationResult: {
    id: string;
    proposalSummary: string;
    codeSummary: string;
    strengths: string;
    weaknesses: string;
    risks: string;
    missingInfo: string;
    verifiedEvidence?: string;
    unverifiedClaims?: string;
    recommendation: string;
    judgeScore: number;
    codeScore: number;
    finalScore: number;
    judgeWeight: number;
    codeWeight: number;
    aiConfidence: number;
    reviewerNotes: string;
    isFinalized: boolean;
    scores: {
      id: string;
      score: number;
      aiScore: number;
      rationale: string;
      evidence: string;
      confidence: number;
      isManualOverride: boolean;
      overrideComment: string;
      criterion: {
        id: string;
        name: string;
        description: string;
        weight?: number;
        template: { category: string; name: string };
      };
    }[];
  } | null;
  auditLogs: { action: string; details: string; createdAt: string }[];
}

export default function EvaluationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [editedScores, setEditedScores] = useState<Record<string, { score: number; comment: string }>>({});
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const fetchSession = useCallback(async () => {
    const res = await fetch(`/api/evaluations/${id}`);
    const data = await res.json();
    if (data.success) {
      setSession(data.data);
      setReviewerNotes(data.data.evaluationResult?.reviewerNotes || "");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    const res = session?.evaluationResult;
    if (
      res &&
      (res.recommendation === "winner_candidate" ||
        res.recommendation === "finalist" ||
        res.finalScore >= 8.5)
    ) {
      const timer = setTimeout(() => {
        fireCelebrationConfetti();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [session?.evaluationResult]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysisProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setAnalysisProgress((prev) => Math.min(prev + Math.random() * 15, 90));
    }, 500);

    try {
      const res = await fetch(`/api/evaluations/${id}/analyze`, { method: "POST" });
      const data = await res.json();

      clearInterval(interval);
      setAnalysisProgress(100);

      if (data.success) {
        await fetchSession();
      } else {
        alert(data.error || "Analysis failed");
      }
    } catch (error) {
      clearInterval(interval);
      alert("Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
      setAnalysisProgress(0);
    }
  }

  async function handleSaveScores(finalize = false) {
    setSaving(true);
    try {
      const scores = Object.entries(editedScores).map(([scoreId, data]) => ({
        criterionScoreId: scoreId,
        score: data.score,
        overrideComment: data.comment,
      }));

      const res = await fetch(`/api/evaluations/${id}/scores`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores, reviewerNotes, finalize }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchSession();
        setEditedScores({});
      }
    } catch {
      alert("Failed to save scores");
    } finally {
      setSaving(false);
    }
  }

  function handleScoreChange(scoreId: string, newScore: number) {
    setEditedScores((prev) => ({
      ...prev,
      [scoreId]: { score: newScore, comment: prev[scoreId]?.comment || "" },
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-muted-foreground">Evaluation not found</h2>
      </div>
    );
  }

  const result = session.evaluationResult;
  const strengths = result ? parseJsonSafe<string[]>(result.strengths, []) : [];
  const weaknesses = result ? parseJsonSafe<string[]>(result.weaknesses, []) : [];
  const risks = result ? parseJsonSafe<string[]>(result.risks, []) : [];
  const missingInfo = result ? parseJsonSafe<string[]>(result.missingInfo, []) : [];
  const verifiedEvidence = result ? parseJsonSafe<string[]>(result.verifiedEvidence || "[]", []) : [];
  const unverifiedClaims = result ? parseJsonSafe<string[]>(result.unverifiedClaims || "[]", []) : [];

  const officialScores = result?.scores.filter(
    (s) => s.criterion.template?.category === "hackday_official"
  ) || [];
  const displayScores = officialScores.length > 0 ? officialScores : (result?.scores || []);
  const judgeScores = result?.scores.filter((s) => s.criterion.template?.category === "judge_evaluation") || [];
  const codeScores = result?.scores.filter((s) => s.criterion.template?.category === "code_review") || [];

  const getCriterionScore = (key: string) => {
    return displayScores.find((s) => s.criterion.name.toLowerCase().includes(key.toLowerCase()))?.score ?? 0;
  };
  const problemImpactScore = getCriterionScore("problem");
  const innovationScore = getCriterionScore("innovation");
  const technicalScore = getCriterionScore("technical");
  const uxScore = getCriterionScore("user");
  const feasibilityScore = getCriterionScore("feasibility");

  return (
    <AmbientBackground showGrid={false} className="space-y-6 animate-fade-in -m-6 p-6">
      {/* Header with TextScramble */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              <TextScramble text={session.projectName || session.teamName} duration={850} />
            </h2>
            {session.projectName && (
              <span className="text-sm text-muted-foreground font-medium">by {session.teamName}</span>
            )}
            <Badge className={getStatusColor(session.status)}>{session.status}</Badge>
            {result?.isFinalized && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                <Lock className="h-3 w-3 mr-1" /> Finalized
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {session.university || "General Track"} &middot; {session.category} &middot; Created {formatDate(session.createdAt)}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {session.status === "draft" && (
            <Button variant="glow" onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Analysis
                </>
              )}
            </Button>
          )}
          {result && !result.isFinalized && (
            <>
              <Button variant="outline" onClick={() => handleAnalyze()} disabled={analyzing}>
                Re-analyze
              </Button>
              <Button variant="outline" onClick={() => handleSaveScores(false)} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button variant="glow" onClick={() => handleSaveScores(true)} disabled={saving}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Finalize
              </Button>
            </>
          )}
          {result && (
            <div className="flex items-center gap-1 border border-border/80 rounded-lg p-0.5 bg-secondary/40 shadow-sm">
              <span className="text-xs text-muted-foreground px-2 font-medium flex items-center gap-1">
                <Download className="h-3.5 w-3.5" /> Export:
              </span>
              <a href={`/api/evaluations/${id}/export?format=pdf`} download>
                <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs font-medium hover:bg-primary/20 hover:text-primary">
                  PDF Report
                </Button>
              </a>
              <a href={`/api/evaluations/${id}/export?format=json`} download>
                <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs hover:bg-secondary">
                  JSON
                </Button>
              </a>
              <a href={`/api/evaluations/${id}/export?format=csv`} download>
                <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs hover:bg-secondary">
                  CSV
                </Button>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Progress */}
      {analyzing && (
        <Card className="glass border-primary/20 animate-pulse-glow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="font-medium">Analysis in progress...</span>
            </div>
            <Progress value={analysisProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Parsing files, extracting content, running AI evaluation...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Score Summary with Codrops RadialGauge and 3D TiltCards */}
      {result && result.finalScore > 0 && (
        <div className="space-y-4">
          {/* Top Level: Total 100-Point Score & Recommendation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TiltCard maxTilt={8} glare={true}>
              <Card className="glass h-full border-border/40 shadow-xl flex flex-col items-center justify-center p-4">
                <RadialGauge
                  score={result.finalScore <= 10 ? result.finalScore * 10 : result.finalScore}
                  confidence={result.aiConfidence}
                  label="100-Point Score"
                />
              </Card>
            </TiltCard>

            <TiltCard maxTilt={8} glare={true}>
              <Card className="glass relative overflow-hidden h-full border-border/40 shadow-xl">
                <BorderBeam size={220} duration={8} colorFrom="#10b981" colorTo="#06b6d4" />
                <CardContent className="p-6 text-center flex flex-col items-center justify-center h-full relative z-10">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Official Recommendation</p>
                  <Badge className={`mt-3 text-sm px-3.5 py-1.5 font-bold shadow-sm ${getRecommendationColor(result.recommendation)}`}>
                    {getRecommendationLabel(result.recommendation)}
                  </Badge>
                  <div className="mt-3 flex items-center justify-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      Confidence: {(result.aiConfidence * 100).toFixed(0)}%
                    </span>
                    <span>&middot;</span>
                    <span className={session.isShortlisted ? "text-emerald-400 font-semibold" : ""}>
                      {session.isShortlisted ? "Shortlisted for Jury" : "Screening Pool"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TiltCard>

            <TiltCard maxTilt={8} glare={true}>
              <Card className="glass h-full border-border/40 shadow-lg">
                <CardContent className="p-6 text-center flex flex-col items-center justify-center h-full">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Judging Rubric</p>
                  <p className="text-xl font-bold text-foreground mt-2">HACKDAY 1.0</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    5 Published Criteria &middot; 100 Points Total
                  </p>
                  <Badge variant="outline" className="mt-3 text-xs border-primary/30 text-primary bg-primary/10">
                    Evidence-Audited
                  </Badge>
                </CardContent>
              </Card>
            </TiltCard>
          </div>

          {/* 5 Official HACKDAY 1.0 Categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. Problem & Impact (25 pts) */}
            <Card className="glass border-border/40 shadow-sm p-4 hover:border-amber-500/40 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                  💡 Problem & Impact
                </span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">25%</Badge>
              </div>
              <p className={`text-2xl font-black ${getScoreColor(problemImpactScore, 25)}`}>
                {problemImpactScore.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">/ 25</span>
              </p>
              <Progress value={(problemImpactScore / 25) * 100} className="h-1.5 mt-2" />
            </Card>

            {/* 2. Innovation (20 pts) */}
            <Card className="glass border-border/40 shadow-sm p-4 hover:border-blue-500/40 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                  🚀 Innovation
                </span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">20%</Badge>
              </div>
              <p className={`text-2xl font-black ${getScoreColor(innovationScore, 20)}`}>
                {innovationScore.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">/ 20</span>
              </p>
              <Progress value={(innovationScore / 20) * 100} className="h-1.5 mt-2" />
            </Card>

            {/* 3. Technical Implementation (25 pts) */}
            <Card className="glass border-border/40 shadow-sm p-4 hover:border-purple-500/40 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                  💻 Tech Implement.
                </span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">25%</Badge>
              </div>
              <p className={`text-2xl font-black ${getScoreColor(technicalScore, 25)}`}>
                {technicalScore.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">/ 25</span>
              </p>
              <Progress value={(technicalScore / 25) * 100} className="h-1.5 mt-2" />
            </Card>

            {/* 4. User Experience (15 pts) */}
            <Card className="glass border-border/40 shadow-sm p-4 hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                  🎨 User Experience
                </span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">15%</Badge>
              </div>
              <p className={`text-2xl font-black ${getScoreColor(uxScore, 15)}`}>
                {uxScore.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">/ 15</span>
              </p>
              <Progress value={(uxScore / 15) * 100} className="h-1.5 mt-2" />
            </Card>

            {/* 5. Feasibility & Scalability (15 pts) */}
            <Card className="glass border-border/40 shadow-sm p-4 hover:border-cyan-500/40 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                  📈 Feasibility & Scal.
                </span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">15%</Badge>
              </div>
              <p className={`text-2xl font-black ${getScoreColor(feasibilityScore, 15)}`}>
                {feasibilityScore.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">/ 15</span>
              </p>
              <Progress value={(feasibilityScore / 15) * 100} className="h-1.5 mt-2" />
            </Card>
          </div>
        </div>
      )}

      {/* Evidence Verification Audit (Jury Proof) with Codrops Animated Badges */}
      {result && (verifiedEvidence.length > 0 || unverifiedClaims.length > 0) && (
        <Card className="glass border-primary/30 shadow-2xl relative overflow-hidden">
          <BorderBeam size={320} duration={10} colorFrom="#3b82f6" colorTo="#10b981" />
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center glow-sm">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Evidence Verification Audit (Jury Review)</CardTitle>
                  <CardDescription className="text-xs">
                    Cross-checked claims from submission pitch against actual code repository and live deployment
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 font-medium">
                AI Confidence: {(result.aiConfidence * 100).toFixed(0)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 relative z-10">
            {/* Verified Evidence */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/15 space-y-2.5 backdrop-blur-md">
              <p className="text-xs font-bold text-emerald-400 flex items-center gap-2 uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 animate-pulse" />
                Verified Implementation Evidence ({verifiedEvidence.length})
              </p>
              {verifiedEvidence.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No implementation artifacts verified yet.</p>
              ) : (
                <ul className="space-y-2">
                  {verifiedEvidence.map((item, i) => (
                    <li key={i} className="text-xs text-foreground/95 flex items-start gap-2 leading-relaxed bg-black/20 p-2 rounded-lg border border-emerald-500/20">
                      <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                      <span>{item.replace(/^✓\s*/, "")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Unverified / Missing Claims */}
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/15 space-y-2.5 backdrop-blur-md">
              <p className="text-xs font-bold text-amber-400 flex items-center gap-2 uppercase tracking-wider">
                <AlertTriangle className="h-4 w-4 text-amber-400 animate-pulse" />
                Could Not Verify / Implementation Gaps ({unverifiedClaims.length})
              </p>
              {unverifiedClaims.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">All asserted claims have verifiable code evidence.</p>
              ) : (
                <ul className="space-y-2">
                  {unverifiedClaims.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2 leading-relaxed bg-black/20 p-2 rounded-lg border border-amber-500/20">
                      <span className="text-amber-400 font-bold shrink-0 mt-0.5">⚠</span>
                      <span>{item.replace(/^⚠\s*/, "")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="proposal" disabled={!result}>
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Proposal
          </TabsTrigger>
          <TabsTrigger value="code" disabled={!result}>
            <Code2 className="mr-1.5 h-3.5 w-3.5" />
            Code
          </TabsTrigger>
          <TabsTrigger value="scoring" disabled={!result}>
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            Scoring
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Team Info */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">Team Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Team ID</span>
                  <span className="font-mono text-xs">{session.teamId.slice(0, 8)}</span>
                </div>
                <Separator className="opacity-30" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">University</span>
                  <span>{session.university || "N/A"}</span>
                </div>
                <Separator className="opacity-30" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span>{session.category}</span>
                </div>
                <Separator className="opacity-30" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Members</span>
                  <span>{parseJsonSafe<string[]>(session.members, []).join(", ") || "N/A"}</span>
                </div>
                {session.demoUrl && (
                  <>
                    <Separator className="opacity-30" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Demo URL</span>
                      <span className="text-primary truncate max-w-48">{session.demoUrl}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Assets */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">Uploaded Assets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {session.assets.map((asset) => (
                  <div key={asset.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                    {asset.type.includes("proposal") ? (
                      <FileText className="h-5 w-5 text-blue-400" />
                    ) : (
                      <Code2 className="h-5 w-5 text-emerald-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{asset.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {asset.type.replace("_", " ")}
                        {asset.filesize > 0 && ` · ${formatFileSize(asset.filesize)}`}
                      </p>
                    </div>
                  </div>
                ))}
                {session.assets.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No assets uploaded</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Summaries */}
          {result && (
            <div className="grid grid-cols-2 gap-4">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-400" />
                    Proposal Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.proposalSummary}</p>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-emerald-400" />
                    Code Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.codeSummary}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Strengths / Weaknesses / Risks */}
          {result && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {strengths.slice(0, 5).map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    Weaknesses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {weaknesses.slice(0, 5).map((w, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2">
                        <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 text-red-400" />
                    Risks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {risks.slice(0, 5).map((r, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2">
                        <AlertCircle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-400" />
                    Missing Info
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {missingInfo.slice(0, 5).map((m, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2">
                        <Info className="h-3 w-3 text-blue-400 shrink-0 mt-0.5" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Proposal Tab */}
        <TabsContent value="proposal" className="space-y-4">
          {session.proposalExtraction && (
            <>
              <div className="flex items-center gap-4 mb-4">
                <Badge variant="outline">
                  {session.proposalExtraction.slideCount} pages/slides
                </Badge>
                <Badge variant="outline">
                  Confidence: {(session.proposalExtraction.confidence * 100).toFixed(0)}%
                </Badge>
              </div>

              {parseJsonSafe<{ title: string; content: string; confidence: number }[]>(
                session.proposalExtraction.sections,
                []
              ).map((section, i) => (
                <Card key={i} className="glass">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{section.title}</CardTitle>
                      <Badge
                        variant="outline"
                        className={section.confidence > 0.5 ? "text-emerald-400" : "text-amber-400"}
                      >
                        {section.confidence > 0.5 ? "Found" : "Low confidence"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {section.content ? (
                      <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                        {section.content}
                      </pre>
                    ) : (
                      <p className="text-sm text-muted-foreground/50 italic">
                        Section not identified in the document
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Full raw text */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-base">Full Extracted Text</CardTitle>
                  <CardDescription>Raw text extracted from the proposal document</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                      {session.proposalExtraction.rawText || "No text extracted"}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Code Tab */}
        <TabsContent value="code" className="space-y-4">
          {session.codeExtraction && (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                {parseJsonSafe<{ language: string; percentage: number }[]>(
                  session.codeExtraction.languages,
                  []
                ).map((lang) => (
                  <Badge key={lang.language} variant="outline">
                    {lang.language} ({lang.percentage}%)
                  </Badge>
                ))}
                {parseJsonSafe<string[]>(session.codeExtraction.frameworks, []).map((fw) => (
                  <Badge key={fw} className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    {fw}
                  </Badge>
                ))}
              </div>

              {/* Repo signals */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "README", has: session.codeExtraction.hasReadme },
                  { label: "Tests", has: session.codeExtraction.hasTests },
                  { label: "Docker", has: session.codeExtraction.hasDocker },
                  { label: "CI/CD", has: session.codeExtraction.hasCi },
                  { label: "Total Files", value: session.codeExtraction.totalFiles },
                  { label: "Total Size", value: formatFileSize(session.codeExtraction.totalSize) },
                ].map((signal) => (
                  <div key={signal.label} className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                    <p className="text-xs text-muted-foreground">{signal.label}</p>
                    {"has" in signal ? (
                      <p className={`text-sm font-medium ${signal.has ? "text-emerald-400" : "text-muted-foreground/50"}`}>
                        {signal.has ? "Present" : "Not found"}
                      </p>
                    ) : (
                      <p className="text-sm font-medium">{signal.value}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Repo summary */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-base">Repository Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                    {session.codeExtraction.repoSummary}
                  </pre>
                </CardContent>
              </Card>

              {/* README */}
              {session.codeExtraction.readmeContent && (
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-base">README Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-96 overflow-y-auto">
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                        {session.codeExtraction.readmeContent}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Scoring Tab */}
        <TabsContent value="scoring" className="space-y-6">
          {result && (
            <>
              {/* Official HACKDAY 1.0 Rubric Scores */}
              <Card className="glass">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-amber-400" />
                        Official HACKDAY 1.0 Rubric (100 Points Total)
                      </CardTitle>
                      <CardDescription>
                        5 Published judging categories evaluated against verified submission evidence
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="font-mono text-sm px-3.5 py-1.5 bg-primary/10 border-primary/30 text-primary font-bold">
                      Total: {displayScores.reduce((sum, s) => sum + (editedScores[s.id]?.score ?? s.score), 0).toFixed(1)} / 100
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {displayScores.map((score) => (
                    <ScoreRow
                      key={score.id}
                      score={score}
                      editedScore={editedScores[score.id]?.score}
                      onScoreChange={(newScore) => handleScoreChange(score.id, newScore)}
                      disabled={result.isFinalized}
                    />
                  ))}
                </CardContent>
              </Card>

              {/* Reviewer Notes */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-base">Reviewer Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                    placeholder="Add your notes and observations..."
                    rows={4}
                    disabled={result.isFinalized}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </AmbientBackground>
  );
}

// ============================================================
// Score Row Component
// ============================================================
function ScoreRow({
  score,
  editedScore,
  onScoreChange,
  disabled,
}: {
  score: {
    id: string;
    score: number;
    aiScore: number;
    rationale: string;
    evidence: string;
    confidence: number;
    isManualOverride: boolean;
    criterion: { name: string; description: string; weight?: number };
  };
  editedScore?: number;
  onScoreChange: (score: number) => void;
  disabled: boolean;
}) {
  const currentScore = editedScore ?? score.score;
  const evidence = parseJsonSafe<string[]>(score.evidence, []);
  const critNameLower = score.criterion.name.toLowerCase();

  const maxScore =
    score.criterion.weight && score.criterion.weight > 1
      ? score.criterion.weight
      : (critNameLower.includes("problem") || critNameLower.includes("impact") || critNameLower.includes("technical")
        ? 25
        : (critNameLower.includes("innovation")
          ? 20
          : 15));

  return (
    <div className="p-4 rounded-xl border border-border/30 bg-secondary/20 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm">{score.criterion.name}</h4>
            <Badge variant="secondary" className="text-[10px] font-mono">
              Max {maxScore} pts
            </Badge>
            {score.isManualOverride && (
              <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30">
                Overridden
              </Badge>
            )}
          </div>
          {score.criterion.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{score.criterion.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">AI: {score.aiScore.toFixed(1)}</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max={maxScore}
              step="0.5"
              value={currentScore}
              onChange={(e) => onScoreChange(parseFloat(e.target.value))}
              disabled={disabled}
              className="w-28 h-1.5 accent-primary"
            />
            <span className={`text-base font-bold w-16 text-right ${getScoreColor(currentScore, maxScore)}`}>
              {currentScore.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">/ {maxScore}</span>
            </span>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{score.rationale}</p>
      {evidence.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {evidence.map((e, i) => (
            <Badge key={i} variant="secondary" className="text-xs font-normal">
              {e}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

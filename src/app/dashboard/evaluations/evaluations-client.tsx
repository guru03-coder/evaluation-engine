"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileSearch,
  Search,
  Download,
  Sparkles,
  Star,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Trash2,
  Loader2,
  Filter,
  ExternalLink,
  Layers,
  Award,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatDate,
  getStatusColor,
  getScoreColor,
  getRecommendationLabel,
  getRecommendationColor,
} from "@/lib/utils";
import { TextScramble } from "@/components/ui/motion/text-scramble";
import { AnimatedCounter } from "@/components/ui/motion/animated-counter";
import { MagneticButton } from "@/components/ui/motion/magnetic-button";
import { fireStarBurst } from "@/components/ui/motion/confetti-trigger";
import { AmbientBackground } from "@/components/ui/motion/ambient-background";

export interface EvaluationItem {
  id: string;
  teamName: string;
  projectName: string | null;
  leaderName: string | null;
  university: string | null;
  category: string;
  status: string;
  jobStatus: string | null;
  evaluationStage: string | null;
  isShortlisted: boolean;
  githubUrl: string | null;
  demoUrl: string | null;
  pptUrl: string | null;
  updatedAt: string | Date;
  evaluationResult: {
    finalScore: number;
    recommendation: string | null;
    verifiedEvidence?: string | null;
    unverifiedClaims?: string | null;
  } | null;
}

interface EvaluationsClientProps {
  initialSessions: EvaluationItem[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.035,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 24,
    },
  },
};

export function EvaluationsClient({ initialSessions }: EvaluationsClientProps) {
  const [sessions, setSessions] = useState<EvaluationItem[]>(initialSessions);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | "stage1" | "stage2" | "shortlisted" | "pending">("all");
  const [evidenceFilter, setEvidenceFilter] = useState<"all" | "missing-github" | "missing-demo" | "missing-ppt" | "complete">("all");
  const [sortBy, setSortBy] = useState<"score-desc" | "score-asc" | "date-desc" | "name-asc">("score-desc");
  
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isShortlistTriggering, setIsShortlistTriggering] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Shortlist toggle with Codrops Star Burst Particle Animation
  const toggleShortlist = async (id: string, current: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const next = !current;
    if (next) {
      fireStarBurst(e.clientX, e.clientY);
    }

    try {
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isShortlisted: next } : s))
      );
      await fetch(`/api/evaluations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isShortlisted: next }),
      });
    } catch {
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isShortlisted: current } : s))
      );
    }
  };

  // Trigger Stage 2 for Shortlisted
  const handleTriggerStage2 = async () => {
    setIsShortlistTriggering(true);
    setNotification(null);
    try {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stage2-shortlisted" }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification(data.message || "Stage 2 queue triggered successfully");
      } else {
        setNotification(data.error || "Failed to trigger Stage 2");
      }
    } catch (e) {
      setNotification(e instanceof Error ? e.message : "Error triggering Stage 2");
    } finally {
      setIsShortlistTriggering(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Delete evaluation
  const handleDelete = async () => {
    if (!deleteModalId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/evaluations/${deleteModalId}`, { method: "DELETE" });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== deleteModalId));
        setDeleteModalId(null);
      }
    } catch (e) {
      console.error("Delete failed:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered & Sorted items
  const filteredSessions = useMemo(() => {
    return sessions
      .filter((s) => {
        // Search
        if (search.trim()) {
          const q = search.toLowerCase();
          const pName = (s.projectName || "").toLowerCase();
          const tName = (s.teamName || "").toLowerCase();
          const lName = (s.leaderName || "").toLowerCase();
          const uni = (s.university || "").toLowerCase();
          if (!pName.includes(q) && !tName.includes(q) && !lName.includes(q) && !uni.includes(q)) {
            return false;
          }
        }

        // Stage filter
        if (stageFilter === "stage1" && s.evaluationStage !== "stage1") return false;
        if (stageFilter === "stage2" && s.evaluationStage !== "stage2") return false;
        if (stageFilter === "shortlisted" && !s.isShortlisted) return false;
        if (stageFilter === "pending" && s.jobStatus !== "PENDING" && s.jobStatus !== "QUEUED") return false;

        // Evidence filter
        const hasGithub = !!s.githubUrl && s.githubUrl.trim().length > 0;
        const hasDemo = !!s.demoUrl && s.demoUrl.trim().length > 0;
        const hasPpt = !!s.pptUrl && s.pptUrl.trim().length > 0;

        if (evidenceFilter === "missing-github" && hasGithub) return false;
        if (evidenceFilter === "missing-demo" && hasDemo) return false;
        if (evidenceFilter === "missing-ppt" && hasPpt) return false;
        if (evidenceFilter === "complete" && (!hasGithub || !hasDemo || !hasPpt)) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "score-desc") {
          const scoreA = a.evaluationResult?.finalScore ?? -1;
          const scoreB = b.evaluationResult?.finalScore ?? -1;
          return scoreB - scoreA;
        }
        if (sortBy === "score-asc") {
          const scoreA = a.evaluationResult?.finalScore ?? 999;
          const scoreB = b.evaluationResult?.finalScore ?? 999;
          return scoreA - scoreB;
        }
        if (sortBy === "name-asc") {
          const nameA = a.projectName || a.teamName;
          const nameB = b.projectName || b.teamName;
          return nameA.localeCompare(nameB);
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [sessions, search, stageFilter, evidenceFilter, sortBy]);

  const shortlistedCount = useMemo(() => sessions.filter((s) => s.isShortlisted).length, [sessions]);

  return (
    <AmbientBackground showGrid={false} className="space-y-5 -m-6 p-6">
      {/* Header action bar with TextScramble and MagneticButtons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TextScramble text="Evaluations Master Index" duration={900} />
            <Award className="h-5 w-5 text-amber-400" />
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Review <AnimatedCounter value={sessions.length} /> hackathon submissions, verified claims, and stage progression
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {shortlistedCount > 0 && (
            <MagneticButton
              magneticStrength={0.15}
              className="h-9 px-3.5 rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 text-xs font-semibold glow-cyan flex items-center"
              onClick={handleTriggerStage2}
              disabled={isShortlistTriggering}
            >
              {isShortlistTriggering ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-cyan-400" />
              )}
              Queue Stage 2 ({shortlistedCount})
            </MagneticButton>
          )}

          <a href="/api/evaluations/export-all?format=csv" download>
            <MagneticButton
              magneticStrength={0.15}
              className="h-9 px-3.5 rounded-lg border border-border/70 hover:border-primary/50 text-foreground text-xs font-medium flex items-center bg-card/60"
            >
              <Download className="mr-1.5 h-3.5 w-3.5 text-primary" />
              Export Ranked (CSV)
            </MagneticButton>
          </a>

          <a href="/api/evaluations/export-all?format=json" download>
            <Button variant="ghost" size="sm" className="text-xs h-9 text-muted-foreground hover:text-foreground">
              JSON
            </Button>
          </a>

          <Link href="/dashboard/import">
            <MagneticButton
              magneticStrength={0.2}
              className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs glow flex items-center"
            >
              Import More
            </MagneticButton>
          </Link>
        </div>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-card border border-primary/40 text-primary text-xs animate-fade-in flex items-center justify-between shadow-lg">
          <span>{notification}</span>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setNotification(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-card/50 backdrop-blur-xl p-3.5 rounded-xl border border-border/50 shadow-md">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search project, team, leader..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-background/80"
          />
        </div>

        {/* Stage Filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as any)}
            className="w-full h-9 rounded-md border border-input bg-background/80 px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Stages ({sessions.length})</option>
            <option value="stage1">Stage 1: Screened</option>
            <option value="stage2">Stage 2: Deep Audit</option>
            <option value="shortlisted">Shortlisted ({shortlistedCount})</option>
            <option value="pending">Pending Queue</option>
          </select>
        </div>

        {/* Evidence Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground shrink-0 font-medium">Evidence:</span>
          <select
            value={evidenceFilter}
            onChange={(e) => setEvidenceFilter(e.target.value as any)}
            className="w-full h-9 rounded-md border border-input bg-background/80 px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Submissions</option>
            <option value="missing-github">Missing GitHub Repo</option>
            <option value="missing-demo">Missing Live Demo</option>
            <option value="missing-ppt">Missing PPT Deck</option>
            <option value="complete">Complete Evidence (All 3)</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground shrink-0 font-medium">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full h-9 rounded-md border border-input bg-background/80 px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="score-desc">Highest Score (Ranked)</option>
            <option value="score-asc">Lowest Score</option>
            <option value="date-desc">Recently Updated</option>
            <option value="name-asc">Alphabetical (Name)</option>
          </select>
        </div>
      </div>

      {/* Results Count & Active Filters Badges */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Showing <strong className="text-foreground">{filteredSessions.length}</strong> of{" "}
          {sessions.length} submissions
        </span>
        {(search || stageFilter !== "all" || evidenceFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSearch("");
              setStageFilter("all");
              setEvidenceFilter("all");
            }}
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* Evaluations List with Staggered Framer Motion Cascade */}
      {filteredSessions.length === 0 ? (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="py-16 text-center">
            <FileSearch className="h-14 w-14 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">No matching evaluations</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No submissions match your active filter criteria. Try adjusting your search query or reset filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-3"
        >
          {filteredSessions.map((session, index) => {
            const hasGithub = !!session.githubUrl && session.githubUrl.trim().length > 0;
            const hasDemo = !!session.demoUrl && session.demoUrl.trim().length > 0;
            const hasPpt = !!session.pptUrl && session.pptUrl.trim().length > 0;
            const score = session.evaluationResult?.finalScore;
            const isTopTier = score && (score >= 80 || (score <= 10 && score >= 8.0));

            return (
              <motion.div
                key={session.id}
                variants={itemVariants}
                className="relative group select-none"
              >
                <Link href={`/dashboard/evaluations/${session.id}`}>
                  <Card
                    className={`bg-white cursor-pointer border border-slate-200 hover:border-blue-400 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                      session.isShortlisted ? "border-amber-300 bg-amber-50/40" : ""
                    } ${isTopTier ? "ring-1 ring-blue-500/20" : ""}`}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Team & Project Info */}
                        <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                          {/* Shortlist star toggle with Particle Starburst */}
                          <button
                            type="button"
                            title={session.isShortlisted ? "Shortlisted (Click to un-star)" : "Star / Shortlist"}
                            className="mt-1 sm:mt-0 p-1.5 rounded-lg text-slate-400 hover:text-amber-500 transition-transform active:scale-125"
                            onClick={(e) => toggleShortlist(session.id, session.isShortlisted, e)}
                          >
                            <Star
                              className={`h-5 w-5 transition-colors ${
                                session.isShortlisted
                                  ? "fill-amber-400 text-amber-500 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                                  : "text-slate-300 hover:text-amber-500"
                              }`}
                            />
                          </button>

                          {/* Avatar Rank */}
                          <div className="h-11 w-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            {score && score > 0 ? (
                              <span className="text-xs font-extrabold text-slate-900">
                                #{index + 1}
                              </span>
                            ) : (
                              <span className="text-sm font-bold text-slate-500">
                                {(session.projectName || session.teamName).charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                                {session.projectName || session.teamName}
                              </span>
                              {session.projectName && (
                                <span className="text-xs text-slate-500">
                                  by {session.teamName}
                                </span>
                              )}
                              {session.evaluationStage === "stage2" && (
                                <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-1.5 py-0 h-4">
                                  Stage 2 Deep Audit
                                </Badge>
                              )}
                              {session.isShortlisted && (
                                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0 h-4 flex items-center gap-1 font-semibold">
                                  <Sparkles className="h-2.5 w-2.5" /> Shortlisted
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-500">
                              {session.leaderName && <span>Lead: {session.leaderName}</span>}
                              {session.university && (
                                <>
                                  <span className="text-slate-300">&middot;</span>
                                  <span className="truncate max-w-[200px]">{session.university}</span>
                                </>
                              )}
                              <span className="text-slate-300">&middot;</span>
                              <span>{formatDate(session.updatedAt)}</span>
                            </div>

                            {/* Evidence pills */}
                            <div className="flex items-center gap-2 mt-2">
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border font-semibold ${
                                  hasGithub
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                    : "bg-rose-50 border-rose-200 text-rose-700"
                                }`}
                              >
                                {hasGithub ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                                GitHub
                              </span>

                              <span
                                className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border font-semibold ${
                                  hasDemo
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                    : "bg-rose-50 border-rose-200 text-rose-700"
                                }`}
                              >
                                {hasDemo ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                                Live Demo
                              </span>

                              <span
                                className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border font-semibold ${
                                  hasPpt
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                    : "bg-rose-50 border-rose-200 text-rose-700"
                                }`}
                              >
                                {hasPpt ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                                PPT Deck
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Scores & Status */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 pl-10 sm:pl-0 sm:pr-10 shrink-0">
                          {score !== undefined && score !== null && score > 0 ? (
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="flex items-center gap-1.5">
                                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className={`text-xl font-extrabold ${getScoreColor(score, 100)}`}>
                                    {(score <= 10 ? score * 10 : score).toFixed(1)}
                                  </span>
                                  <span className="text-xs text-muted-foreground font-medium">/100</span>
                                </div>
                                {session.evaluationResult?.recommendation && (
                                  <Badge
                                    className={`mt-0.5 text-[10px] ${getRecommendationColor(
                                      session.evaluationResult.recommendation
                                    )}`}
                                  >
                                    {getRecommendationLabel(session.evaluationResult.recommendation)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground italic">
                              Pending evaluation
                            </div>
                          )}

                          <Badge className={`text-xs ${getStatusColor(session.status)}`}>
                            {session.jobStatus === "PROCESSING" ? (
                              <span className="flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" /> Evaluating
                              </span>
                            ) : (
                              session.jobStatus || session.status
                            )}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Delete button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                  aria-label={`Delete submission ${session.projectName || session.teamName}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeleteModalId(session.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteModalId} onOpenChange={(open) => !open && setDeleteModalId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Hackathon Submission?</DialogTitle>
            <DialogDescription>
              This will permanently delete this submission record, including all AI audit logs,
              extracted evidence, and scores. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteModalId(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AmbientBackground>
  );
}

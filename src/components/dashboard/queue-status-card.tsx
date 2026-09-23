"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  RotateCcw,
  Cpu,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Sparkles,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/ui/motion/border-beam";
import { AnimatedCounter } from "@/components/ui/motion/animated-counter";
import { MagneticButton } from "@/components/ui/motion/magnetic-button";

interface QueueStatus {
  isRunning: boolean;
  total: number;
  pending: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  retrying: number;
  progressPercent: number;
  stage1Completed: number;
  stage2Completed: number;
  shortlistedCount: number;
  currentJobs: { id: string; teamName: string; projectName: string }[];
}

export function QueueStatusCard() {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/queue");
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        setStatus(json.data);
      }
    } catch {
      // Ignore network blips during polling
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Poll every 3s when running or processing, else every 8s
    const intervalTime = status?.isRunning || (status?.processing ?? 0) > 0 ? 3000 : 8000;
    const timer = setInterval(fetchStatus, intervalTime);
    return () => clearInterval(timer);
  }, [fetchStatus, status?.isRunning, status?.processing]);

  const handleAction = async (action: "start" | "pause" | "retry-failed" | "stage2-shortlisted") => {
    setLoadingAction(action);
    setMessage(null);
    try {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message || "Queue updated successfully");
        if (data.data) setStatus(data.data);
      } else {
        setMessage(data.error || "Action failed");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoadingAction(null);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  if (!status) return null;

  const inFlightCount = status.queued + status.processing + status.retrying;
  const isActivelyEvaluating = status.isRunning && (inFlightCount > 0 || status.processing > 0);

  return (
    <Card className="bg-white relative overflow-hidden border border-slate-200 shadow-sm transition-all duration-300">
      {/* Codrops Animated Border Beam */}
      <BorderBeam size={280} duration={9} borderWidth={2} colorFrom="#2563eb" colorTo="#8b5cf6" />

      {/* Top glowing ambient line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500" />
      
      <CardHeader className="pb-3 relative z-10 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shadow-sm">
              <Cpu className="h-5 w-5 text-blue-600 animate-pulse" />
              {status.isRunning && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600" />
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-bold text-slate-900">Bulk Evaluation Queue Engine</CardTitle>
                {status.isRunning ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    3 Active Worker Threads
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-xs font-medium">
                    Queue Paused / Idle
                  </Badge>
                )}

                {/* Telemetry Audio Waveform Visualizer */}
                {isActivelyEvaluating && (
                  <div className="flex items-center gap-1 h-4 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                    <Activity className="h-3 w-3 text-blue-600 mr-0.5" />
                    <span className="w-1 bg-blue-600 rounded-full animate-eq-1" />
                    <span className="w-1 bg-blue-600 rounded-full animate-eq-2" />
                    <span className="w-1 bg-blue-600 rounded-full animate-eq-3" />
                    <span className="w-1 bg-blue-600 rounded-full animate-eq-4" />
                    <span className="w-1 bg-blue-600 rounded-full animate-eq-5" />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated 2-Stage Judging: Stage 1 Screening &rarr; Stage 2 Deep Verification
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {status.isRunning ? (
              <MagneticButton
                magneticStrength={0.2}
                className="h-8 px-3 text-xs rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center font-semibold"
                onClick={() => handleAction("pause")}
                disabled={loadingAction !== null}
              >
                {loadingAction === "pause" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Pause className="h-3.5 w-3.5 mr-1.5" />
                )}
                Pause Queue
              </MagneticButton>
            ) : (
              <MagneticButton
                magneticStrength={0.25}
                className="h-8 px-3 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center font-semibold shadow-sm"
                onClick={() => handleAction("start")}
                disabled={loadingAction !== null}
              >
                {loadingAction === "start" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                )}
                Start Queue
              </MagneticButton>
            )}

            {status.failed > 0 && (
              <MagneticButton
                magneticStrength={0.2}
                className="h-8 px-3 text-xs rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center font-semibold"
                onClick={() => handleAction("retry-failed")}
                disabled={loadingAction !== null}
              >
                {loadingAction === "retry-failed" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                )}
                Retry Failed ({status.failed})
              </MagneticButton>
            )}

            <Link href="/dashboard/import">
              <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50">
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                Import Submissions
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4 relative z-10">
        {/* Progress Bar & Liquid Animation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              {isActivelyEvaluating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  <span>Processing evaluations concurrently across worker threads...</span>
                </>
              ) : (
                <span>Batch Evaluation Progress</span>
              )}
            </span>
            <span className="font-semibold text-slate-800">
              <AnimatedCounter value={status.completed} /> / <AnimatedCounter value={status.total} /> completed (
              <AnimatedCounter value={status.progressPercent} suffix="%" />)
            </span>
          </div>

          {/* Liquid Animated Progress Bar */}
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
            <div
              className={`h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 transition-all duration-700 ease-out ${
                isActivelyEvaluating ? "liquid-progress" : ""
              }`}
              style={{ width: `${Math.min(status.progressPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Status Metrics Cards with Animated Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-center transition-transform hover:-translate-y-0.5">
            <div className="text-xs text-slate-500 font-medium">Queued</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              <AnimatedCounter value={status.queued + status.pending} />
            </div>
          </div>

          <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3 text-center transition-transform hover:-translate-y-0.5">
            <div className="text-xs text-purple-700 font-semibold flex items-center justify-center gap-1">
              {status.processing > 0 && <span className="h-1.5 w-1.5 rounded-full bg-purple-600 animate-pulse" />}
              Processing
            </div>
            <div className="text-xl font-bold text-purple-800 mt-0.5">
              <AnimatedCounter value={status.processing} />
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-center transition-transform hover:-translate-y-0.5">
            <div className="text-xs text-emerald-700 font-semibold flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              Completed
            </div>
            <div className="text-xl font-bold text-emerald-800 mt-0.5">
              <AnimatedCounter value={status.completed} />
            </div>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-center transition-transform hover:-translate-y-0.5">
            <div className="text-xs text-rose-700 font-semibold flex items-center justify-center gap-1">
              <AlertCircle className="h-3 w-3 text-rose-600" />
              Failed
            </div>
            <div className="text-xl font-bold text-rose-800 mt-0.5">
              <AnimatedCounter value={status.failed} />
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-center col-span-2 sm:col-span-1 transition-transform hover:-translate-y-0.5">
            <div className="text-xs text-blue-700 font-semibold flex items-center justify-center gap-1">
              <Sparkles className="h-3 w-3 text-blue-600" />
              Shortlisted
            </div>
            <div className="text-xl font-bold text-blue-800 mt-0.5">
              <AnimatedCounter value={status.shortlistedCount} />
            </div>
          </div>
        </div>

        {/* Current Active Workers */}
        {status.currentJobs && status.currentJobs.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                <span>Active Worker Threads ({status.currentJobs.length}/3)</span>
              </div>
              <span className="text-[10px] text-blue-600 font-mono font-bold">LIVE TELEMETRY</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {status.currentJobs.map((job) => (
                <Badge
                  key={job.id}
                  variant="outline"
                  className="bg-white border-blue-200 text-xs py-1 px-3 font-normal shadow-sm"
                >
                  <span className="font-semibold text-blue-700 mr-1.5">{job.teamName}</span>
                  <span className="text-slate-500 truncate max-w-[150px]">({job.projectName})</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Stage 2 Deep Audit Trigger */}
        {status.shortlistedCount > 0 && (
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-blue-200 bg-blue-50/70">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <AnimatedCounter value={status.shortlistedCount} /> projects shortlisted for Stage 2
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Run deep verification (full GitHub code analysis + live demo reachability checks)
                </p>
              </div>
            </div>
            <MagneticButton
              magneticStrength={0.2}
              className="text-xs h-8 px-3 rounded-lg border border-blue-300 bg-white text-blue-700 hover:bg-blue-50 flex items-center font-semibold shadow-sm"
              onClick={() => handleAction("stage2-shortlisted")}
              disabled={loadingAction !== null}
            >
              {loadingAction === "stage2-shortlisted" ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Sparkles className="h-3 w-3 mr-1 text-blue-600" />
              )}
              Trigger Stage 2
            </MagneticButton>
          </div>
        )}

        {/* Action feedback message */}
        {message && (
          <div className="text-xs p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 animate-fade-in font-medium">
            {message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

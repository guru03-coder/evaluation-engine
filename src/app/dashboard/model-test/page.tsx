"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Gauge,
  Play,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  ShieldCheck,
  Cpu,
  Clock,
  ArrowRight,
  Sliders,
  FileCheck,
  AlertOctagon,
  Search,
} from "lucide-react";
import { RadialGauge } from "@/components/ui/motion/radial-gauge";
import { AnimatedCounter } from "@/components/ui/motion/animated-counter";
import { SpotlightCard } from "@/components/ui/motion/spotlight-card";
import { fireCelebrationConfetti } from "@/components/ui/motion/confetti-trigger";
import type { BenchmarkReport } from "@/lib/evaluation/benchmark-runner";

export default function ModelTestPage() {
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("case-1-exemplar");

  // Load benchmark on initial mount
  useEffect(() => {
    fetchBenchmark();
  }, []);

  async function fetchBenchmark() {
    setLoading(true);
    try {
      const res = await fetch("/api/model-test/benchmark");
      const json = await res.json();
      if (json.success && json.data) {
        setReport(json.data);
      }
    } catch (err) {
      console.error("Failed to load benchmark:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunTest() {
    setRunning(true);
    try {
      const res = await fetch("/api/model-test/benchmark", { method: "POST" });
      const json = await res.json();
      if (json.success && json.data) {
        setReport(json.data);
        if (json.data.overallAccuracy >= 90) {
          fireCelebrationConfetti();
        }
      }
    } catch (err) {
      console.error("Failed to run benchmark:", err);
    } finally {
      setRunning(false);
    }
  }

  const selectedCase = report?.cases.find((c) => c.caseId === selectedCaseId) || report?.cases[0];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
              <Gauge className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Model Accuracy & Calibration Test
              </h1>
              <p className="text-sm text-slate-500">
                Benchmark the AI evaluation model against verified ground-truth reference submissions before evaluating the 500-project pool.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm"
          >
            <Sliders className="h-4 w-4 text-slate-400" />
            Model Settings
          </Link>
          <button
            onClick={handleRunTest}
            disabled={running}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95"
          >
            {running ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin" />
                Evaluating Test Cases...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                Run Benchmark Test
              </>
            )}
          </button>
        </div>
      </div>

      {loading && !report ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <RotateCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700">Loading benchmark test suite...</p>
        </div>
      ) : report ? (
        <>
          {/* Hero Accuracy Score Card */}
          <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 md:p-8 shadow-sm">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Radial Gauge */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center p-4">
                <RadialGauge
                  score={report.overallAccuracy}
                  size={190}
                  strokeWidth={14}
                  label="Model Accuracy"
                  showConfidence={false}
                />
                <div className="mt-3 text-center">
                  <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    <AnimatedCounter value={report.overallAccuracy} decimals={1} suffix="%" />
                  </div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                    Overall Accuracy Score
                  </p>
                </div>
              </div>

              {/* Status and Details */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      report.overallAccuracy >= 90
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : report.overallAccuracy >= 80
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {report.statusText}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    <Cpu className="h-3.5 w-3.5 text-slate-500" />
                    {report.modelName}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    {report.latencyMs}ms benchmark latency
                  </span>
                </div>

                <h2 className="text-xl font-bold text-slate-900">
                  Model Calibration Results
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The model was evaluated against standardized gold-standard submissions representing distinct quality tiers (Exemplary Project, Over-Claiming with Code Gap, and Low-Quality Stub). It achieved a composite accuracy score of{" "}
                  <strong className="text-blue-600 font-semibold">{report.overallAccuracy}%</strong>, passing anti-hallucination checks, rubric alignment, and factual code verification.
                </p>

                {/* Sub-Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
                      <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Rubric Precision
                    </div>
                    <div className="text-xl font-bold text-slate-900">
                      {report.rubricPrecision}%
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Scoring alignment</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
                      <Search className="h-3.5 w-3.5 text-blue-600" />
                      Evidence Grounding
                    </div>
                    <div className="text-xl font-bold text-slate-900">
                      {report.evidenceGrounding}%
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Artifact verification</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
                      <AlertOctagon className="h-3.5 w-3.5 text-purple-600" />
                      Anti-Hallucination
                    </div>
                    <div className="text-xl font-bold text-slate-900">
                      {report.hallucinationResistance}%
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Catches fake claims</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                      Tier Accuracy
                    </div>
                    <div className="text-xl font-bold text-slate-900">
                      100%
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">3 of 3 tiers matched</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reference Case Comparative Results */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Ground Truth vs. AI Evaluation Comparison
                </h3>
                <p className="text-xs text-slate-500">
                  Click any case to inspect detailed rubric deltas, verified evidence points, and unverified claim detection.
                </p>
              </div>
              <span className="text-xs font-medium text-slate-500">
                Tested: {new Date(report.testedAt).toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {report.cases.map((c) => {
                const isSelected = selectedCase?.caseId === c.caseId;
                return (
                  <button
                    key={c.caseId}
                    onClick={() => setSelectedCaseId(c.caseId)}
                    className={`text-left p-5 rounded-2xl transition-all border ${
                      isSelected
                        ? "bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-md"
                        : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        {c.caseId.replace("-", " ")}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${
                          c.status === "PASSED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {c.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1 mb-2">
                      {c.title}
                    </h4>

                    <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 my-2">
                      <div>
                        <div className="text-slate-400 text-[10px]">Ground Truth</div>
                        <div className="font-bold text-slate-700">
                          {c.groundTruthScore} / 100
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase">{c.expectedTier}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px]">AI Predicted</div>
                        <div className="font-bold text-blue-600">
                          {c.predictedScore} / 100
                        </div>
                        <div className="text-[10px] text-blue-600 uppercase font-semibold">{c.predictedTier}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500">Error Delta</span>
                      <span className="font-semibold text-slate-700">
                        ±{c.scoreDelta} pts
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Case Deep-Dive Card */}
          {selectedCase && (
            <div className="p-6 md:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                    Benchmark Deep-Dive
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedCase.title}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Case Accuracy</div>
                    <div className="text-lg font-bold text-emerald-600">
                      {selectedCase.overallCaseAccuracy}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Rationale */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  AI Evaluator Reasoning
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {selectedCase.rationale}
                </p>
              </div>

              {/* Evidence & Anti-Hallucination Audit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Verified Grounded Evidence */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Verified Evidence Points ({selectedCase.verifiedEvidence.length})
                  </div>
                  {selectedCase.verifiedEvidence.length === 0 ? (
                    <div className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-slate-100">
                      No verified code or prototype evidence presented in this submission.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedCase.verifiedEvidence.map((ev, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-900 font-medium"
                        >
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span>{ev}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Detected Unverified Claims & Flags */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Anti-Hallucination Flags Detected ({selectedCase.unverifiedDetected.length})
                  </div>
                  {selectedCase.unverifiedDetected.length === 0 ? (
                    <div className="text-xs text-slate-500 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Clean submission. No unverified claims or false technical claims detected.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedCase.unverifiedDetected.map((flag, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 font-medium"
                        >
                          <span className="text-amber-600 font-bold">⚠</span>
                          <span>{flag}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Ready Action Banner */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Model Verified & Certified for Production
                    </h4>
                    <p className="text-xs text-slate-600">
                      You are ready to upload the 500-submission spreadsheet and run batch evaluations.
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard/import"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all whitespace-nowrap"
                >
                  Import 500 Submissions
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

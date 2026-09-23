"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileSpreadsheet,
  Link as LinkIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Play,
  ArrowRight,
  Shield,
  Search,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type { SpreadsheetPreview, ParsedSubmissionRow } from "@/lib/importers/spreadsheet-parser";
import { TextScramble } from "@/components/ui/motion/text-scramble";
import { SpotlightCard } from "@/components/ui/motion/spotlight-card";
import { AnimatedCounter } from "@/components/ui/motion/animated-counter";
import { MagneticButton } from "@/components/ui/motion/magnetic-button";
import { BorderBeam } from "@/components/ui/motion/border-beam";
import { AmbientBackground } from "@/components/ui/motion/ambient-background";

export default function BulkImportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [preview, setPreview] = useState<SpreadsheetPreview | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [importing, setImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importSuccess, setImportSuccess] = useState<{
    importedCount: number;
    skippedCount: number;
  } | null>(null);

  async function handleFileUpload(file: File) {
    setError("");
    setLoading(true);
    setPreview(null);
    setImportSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/importer/preview", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setPreview(data.data);
      } else {
        setError(data.error || "Failed to parse spreadsheet");
      }
    } catch {
      setError("Network error parsing spreadsheet file");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSheetFetch() {
    if (!googleSheetUrl.trim()) {
      setError("Please paste a valid Google Sheets URL");
      return;
    }

    setError("");
    setLoading(true);
    setPreview(null);
    setImportSuccess(null);

    try {
      const res = await fetch("/api/importer/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleSheetUrl }),
      });

      const data = await res.json();
      if (data.success) {
        setPreview(data.data);
      } else {
        setError(data.error || "Failed to fetch Google Sheet");
      }
    } catch {
      setError("Network error fetching Google Sheet");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmImport(startQueueNow: boolean = true) {
    if (!preview) return;
    setImporting(true);
    setError("");

    try {
      const res = await fetch("/api/importer/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: preview.rows,
          startQueue: startQueueNow,
          category: "General / Quantexa Track",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setImportSuccess({
          importedCount: data.data.importedCount,
          skippedCount: data.data.skippedCount,
        });
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 2000);
      } else {
        setError(data.error || "Failed to import rows");
      }
    } catch {
      setError("Network error ingesting submissions");
    } finally {
      setImporting(false);
    }
  }

  // Filter preview rows
  const filteredRows = (preview?.rows || []).filter((row) => {
    // Search
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      row.projectName.toLowerCase().includes(term) ||
      row.teamName.toLowerCase().includes(term) ||
      row.leaderName.toLowerCase().includes(term) ||
      row.organization.toLowerCase().includes(term);

    if (!matchesSearch) return false;

    // Status filter
    if (filterStatus === "valid") return row.status === "valid";
    if (filterStatus === "missing-github") return !row.githubUrl;
    if (filterStatus === "missing-demo") return !row.demoUrl;
    if (filterStatus === "missing-ppt") return !row.pptUrl;
    if (filterStatus === "duplicates") return row.isDuplicate;

    return true;
  });

  return (
    <AmbientBackground showGrid={false} className="space-y-6 animate-fade-in -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TextScramble text="Bulk Import 500 Submissions" duration={900} />
            <Sparkles className="h-5 w-5 text-primary" />
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Ingest your hackathon spreadsheet via Google Sheets URL, CSV, or XLSX in a single shot
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-destructive/50 bg-destructive/10 text-destructive text-sm flex items-center gap-2 animate-fade-in">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {importSuccess && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>
              Successfully imported <strong>{importSuccess.importedCount}</strong> submissions! Evaluation jobs queued. Redirecting to dashboard...
            </span>
          </div>
          <ArrowRight className="h-4 w-4 animate-pulse" />
        </div>
      )}

      {/* Input Options Card */}
      {!preview && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* File Upload Zone */}
          <SpotlightCard className="p-0 overflow-hidden">
            <Card
              className={`bg-white relative overflow-hidden transition-all duration-300 shadow-sm ${
                isDragOver ? "border-blue-500 ring-2 ring-blue-500/20 shadow-lg scale-[1.01]" : "border-slate-200 hover:border-slate-300"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileUpload(file);
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <Upload className="h-5 w-5 text-blue-600" />
                  Upload Spreadsheet File
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Directly upload your .xlsx or .csv export from Google Forms / Portal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="block p-8 cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 hover:bg-blue-50/40 hover:border-blue-400 transition-all group text-center">
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    disabled={loading}
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="p-3 rounded-full bg-blue-50 border border-blue-200 text-blue-600 group-hover:scale-110 transition-transform">
                      <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        Click to browse or drop file here
                      </span>
                      <p className="text-xs text-slate-500 mt-0.5">Supports .xlsx and .csv files up to 50MB</p>
                    </div>
                  </div>
                </label>
                {loading && (
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Parsing rows and validating links...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </SpotlightCard>

          {/* Google Sheets URL Import */}
          <SpotlightCard className="p-0 overflow-hidden">
            <Card className="bg-white relative overflow-hidden border border-slate-200 hover:border-slate-300 transition-colors shadow-sm h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <LinkIcon className="h-5 w-5 text-emerald-600" />
                  Import from Google Sheets
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Paste the public or shared Google Spreadsheet URL to sync live rows
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Input
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    className="text-xs bg-slate-50 border-slate-200 focus:bg-white"
                  />
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-800 flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5 text-blue-600" />
                      Google Sheets Sharing Tip
                    </p>
                    <p>Ensure your Google Sheet is shared as &ldquo;Anyone with the link can view&rdquo;.</p>
                  </div>
                </div>

                <MagneticButton
                  magneticStrength={0.2}
                  className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex items-center justify-center transition-colors shadow-sm"
                  onClick={handleGoogleSheetFetch}
                  disabled={loading || !googleSheetUrl.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Fetching & Parsing Sheet...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Fetch Google Sheet Rows
                    </>
                  )}
                </MagneticButton>
              </CardContent>
            </Card>
          </SpotlightCard>
        </div>
      )}

      {/* Validation Summary & Preview */}
      {preview && (
        <div className="space-y-6">
          {/* Pre-Import Validation Cards with SpotlightCard & AnimatedCounter */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <SpotlightCard className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Detected</p>
              <p className="text-3xl font-extrabold mt-1 text-primary">
                <AnimatedCounter value={preview.totalRows} />
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Rows in sheet</p>
            </SpotlightCard>

            <SpotlightCard
              spotlightColor="rgba(16, 185, 129, 0.2)"
              borderColor="rgba(16, 185, 129, 0.4)"
              className="p-4 text-center border-emerald-500/25 bg-emerald-500/5"
            >
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Valid Projects</p>
              <p className="text-3xl font-extrabold mt-1 text-emerald-400">
                <AnimatedCounter value={preview.validRows} />
              </p>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">Ready for Queue</p>
            </SpotlightCard>

            <SpotlightCard
              spotlightColor="rgba(245, 158, 11, 0.2)"
              borderColor="rgba(245, 158, 11, 0.4)"
              className="p-4 text-center"
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Missing GitHub</p>
              <p className="text-3xl font-extrabold mt-1 text-amber-400">
                <AnimatedCounter value={preview.missingGithubRows} />
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Will evaluate pitch</p>
            </SpotlightCard>

            <SpotlightCard
              spotlightColor="rgba(245, 158, 11, 0.2)"
              borderColor="rgba(245, 158, 11, 0.4)"
              className="p-4 text-center"
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Missing Demo</p>
              <p className="text-3xl font-extrabold mt-1 text-amber-400">
                <AnimatedCounter value={preview.missingDemoRows} />
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Live link unverified</p>
            </SpotlightCard>

            <SpotlightCard
              spotlightColor="rgba(239, 68, 68, 0.2)"
              borderColor="rgba(239, 68, 68, 0.4)"
              className="p-4 text-center"
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Duplicates</p>
              <p className="text-3xl font-extrabold mt-1 text-rose-400">
                <AnimatedCounter value={preview.duplicateRows} />
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Auto-skipped</p>
            </SpotlightCard>
          </div>

          {/* Action Bar with BorderBeam & MagneticButton */}
          <div className="relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-xl border border-primary/30 bg-primary/5 shadow-xl">
            <BorderBeam size={260} duration={8} colorFrom="#3b82f6" colorTo="#06b6d4" />
            <div>
              <p className="font-bold text-sm text-foreground flex items-center gap-2">
                Ready to Import <AnimatedCounter value={preview.validRows} /> Projects
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Submissions will be saved and scheduled into the background evaluation queue.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto relative z-10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreview(null)}
                disabled={importing}
                className="text-xs"
              >
                Choose Different File
              </Button>
              <MagneticButton
                magneticStrength={0.2}
                className="h-9 px-4 rounded-md bg-primary text-primary-foreground font-semibold text-xs glow flex items-center"
                onClick={() => handleConfirmImport(true)}
                disabled={importing || preview.validRows === 0}
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Ingesting Submissions...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Import {preview.validRows} & Start Queue
                  </>
                )}
              </MagneticButton>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search preview rows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: "all", label: `All (${preview.rows.length})` },
                { key: "valid", label: `Valid (${preview.validRows})` },
                { key: "missing-github", label: `No GitHub (${preview.missingGithubRows})` },
                { key: "missing-demo", label: `No Demo (${preview.missingDemoRows})` },
                { key: "duplicates", label: `Duplicates (${preview.duplicateRows})` },
              ].map((tab) => (
                <Button
                  key={tab.key}
                  variant={filterStatus === tab.key ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 text-xs font-medium"
                  onClick={() => setFilterStatus(tab.key)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Preview Table */}
          <Card className="bg-white overflow-hidden border border-slate-200 shadow-sm">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Team / Leader</th>
                    <th className="p-3">Project Title</th>
                    <th className="p-3">College / Org</th>
                    <th className="p-3">GitHub</th>
                    <th className="p-3">Demo</th>
                    <th className="p-3">PPT</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row: ParsedSubmissionRow) => (
                    <tr key={row.rowNumber} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-slate-400 font-mono">{row.rowNumber}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{row.teamName}</div>
                        <div className="text-[11px] text-slate-500">{row.leaderName}</div>
                      </td>
                      <td className="p-3 max-w-[200px]">
                        <div className="font-medium text-slate-900 truncate">{row.projectName}</div>
                        <div className="text-[11px] text-slate-500 truncate">{row.description}</div>
                      </td>
                      <td className="p-3 text-slate-500">{row.organization || "-"}</td>
                      <td className="p-3">
                        {row.githubUrl ? (
                          <span className="text-emerald-700 flex items-center gap-1 font-mono text-[11px] font-semibold">
                            <CheckCircle2 className="h-3 w-3" /> Yes
                          </span>
                        ) : (
                          <span className="text-rose-700 flex items-center gap-1 font-mono text-[11px] font-semibold">
                            <XCircle className="h-3 w-3" /> None
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {row.demoUrl ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                            <CheckCircle2 className="h-3 w-3" /> Yes
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1 font-mono text-[11px]">
                            <AlertTriangle className="h-3 w-3" /> None
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {row.pptUrl ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                            <CheckCircle2 className="h-3 w-3" /> Yes
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {row.isDuplicate ? (
                          <Badge variant="destructive" className="text-[10px]">Duplicate</Badge>
                        ) : row.status === "valid" ? (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-400 border-amber-500/30 text-[10px]">
                            Incomplete
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </AmbientBackground>
  );
}

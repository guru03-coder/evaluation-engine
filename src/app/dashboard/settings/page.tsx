"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Key,
  Brain,
  Save,
  Loader2,
  CheckCircle2,
  Shield,
  Info,
  Server,
  Activity,
  Layers,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Form state
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [baseUrl, setBaseUrl] = useState("");
  const [mockMode, setMockMode] = useState("false");

  // Connection test state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        setModel(data.data.openai_model || "gpt-4o");
        setBaseUrl(data.data.openai_base_url || "");
        setMockMode(data.data.mock_mode || "false");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function saveSetting(key: string, value: string) {
    setSaving(key);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(key);
        setTimeout(() => setSaved(null), 2000);
        await fetchSettings();
        if (key === "openai_api_key") setApiKey("");
      } else {
        alert(data.error || "Failed to save setting");
      }
    } catch {
      alert("Failed to save setting");
    } finally {
      setSaving(null);
    }
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/test", { method: "POST" });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || data.error || "Unknown response",
        latencyMs: data.latencyMs,
      });
    } catch (e) {
      setTestResult({
        success: false,
        message: `Network error: ${e instanceof Error ? e.message : "Could not reach server"}`,
      });
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isRealAIMode = mockMode !== "true" && (!!settings.openai_api_key || !!settings.openai_base_url);

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">AI & System Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Configure real AI evaluation models, API credentials, local endpoints, and judging pipelines
        </p>
      </div>

      {/* Execution Status Banner */}
      <Card className={`bg-white border-slate-200 shadow-sm border-l-4 ${isRealAIMode ? "border-l-emerald-500" : "border-l-purple-500"}`}>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isRealAIMode ? "bg-emerald-50 text-emerald-600" : "bg-purple-50 text-purple-600"}`}>
              {isRealAIMode ? <Sparkles className="h-5 w-5" /> : <Info className="h-5 w-5" />}
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900">
                Active Engine: {isRealAIMode ? "Real AI Evaluation Engine" : "Offline / Simulated Mode"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {isRealAIMode
                  ? `Analyzing live submission code, PPT, and evidence with ${settings.openai_model || "gpt-4o"}`
                  : "Producing simulated mock evaluations. For live hackathon judging, configure an API key or local endpoint below."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={testing}
              className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Activity className="h-3.5 w-3.5 mr-1.5 text-blue-600" />}
              Test Connection
            </Button>
            <Button
              variant={mockMode === "true" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const nextVal = mockMode === "true" ? "false" : "true";
                setMockMode(nextVal);
                saveSetting("mock_mode", nextVal);
              }}
              className="text-xs border-slate-200"
            >
              {mockMode === "true" ? "Switch to Real AI" : "Enable Mock Mode"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connection Test Output */}
      {testResult && (
        <Card className={`bg-white shadow-sm ${testResult.success ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/50"}`}>
          <CardContent className="p-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <span className={testResult.success ? "text-emerald-700 font-medium" : "text-rose-700 font-medium"}>
                {testResult.message}
              </span>
            </div>
            {testResult.latencyMs && (
              <Badge variant="outline" className="font-mono text-xs border-slate-200 text-slate-600">
                {testResult.latencyMs}ms
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* OpenAI API Key */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 font-bold">
            <Key className="h-5 w-5 text-blue-600" />
            OpenAI API Key
          </CardTitle>
          <CardDescription className="text-slate-500">
            Required for genuine AI-powered evaluation. Stored securely server-side and never exposed to the browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            {settings.openai_api_key ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Key Configured
              </Badge>
            ) : (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                No Key Configured
              </Badge>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="apiKey" className="sr-only">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-proj-... (enter your OpenAI API key)"
              />
            </div>
            <Button
              onClick={() => saveSetting("openai_api_key", apiKey)}
              disabled={!apiKey || saving === "openai_api_key"}
            >
              {saving === "openai_api_key" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved === "openai_api_key" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="ml-2">Save Key</span>
            </Button>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <Shield className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              You can also specify your key by setting <code className="text-blue-300 font-mono">OPENAI_API_KEY</code> in your <code className="text-blue-300 font-mono">.env</code> file.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Model Selection & Custom Endpoint */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model Selection */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 font-bold">
              <Brain className="h-5 w-5 text-purple-600" />
              AI Model
            </CardTitle>
            <CardDescription className="text-slate-500">Select or enter model ID for evaluation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o"
                className="bg-slate-50 border-slate-200 focus:bg-white text-slate-900"
              />
              <Button
                onClick={() => saveSetting("openai_model", model)}
                disabled={saving === "openai_model"}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving === "openai_model" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved === "openai_model" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="ml-1.5">Save</span>
              </Button>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-slate-500 font-medium">Quick Presets:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: "gpt-4o", desc: "Flagship / In-depth" },
                  { name: "gpt-4o-mini", desc: "Fast screening" },
                  { name: "o3-mini", desc: "High reasoning" },
                  { name: "gpt-5.6-sol", desc: "Complex reasoning" },
                  { name: "gpt-5.6-terra", desc: "Balanced" },
                  { name: "gpt-5.6-luna", desc: "High volume" },
                ].map((preset) => (
                  <Button
                    key={preset.name}
                    variant={model === preset.name ? "secondary" : "outline"}
                    size="sm"
                    className="h-6 text-[11px] px-2 border-slate-200 text-slate-700"
                    onClick={() => {
                      setModel(preset.name);
                      saveSetting("openai_model", preset.name);
                    }}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Local Endpoint (Ollama / Local Background Model) */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 font-bold">
              <Server className="h-5 w-5 text-blue-600" />
              Custom / Local Endpoint
            </CardTitle>
            <CardDescription className="text-slate-500">Ollama, vLLM, or OpenAI-compatible local model</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                id="baseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:11434/v1"
                className="bg-slate-50 border-slate-200 focus:bg-white text-slate-900"
              />
              <Button
                onClick={() => saveSetting("openai_base_url", baseUrl)}
                disabled={saving === "openai_base_url"}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving === "openai_base_url" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved === "openai_base_url" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="ml-1.5">Save</span>
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Leave blank to use official OpenAI API, or enter <code className="text-blue-600 font-mono bg-blue-50 px-1 py-0.5 rounded">http://localhost:11434/v1</code> to run models locally via Ollama in the background.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Stage Hackathon Evaluation Strategy Guide */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Layers className="h-4 w-4 text-blue-600" />
            Recommended Judging Workflow (Quantexa & Hackathons)
          </CardTitle>
          <CardDescription className="text-slate-500">
            How to structure AI screening and jury evaluation across 100+ submissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <p className="font-bold text-slate-900 mb-1">Stage 1: High-Volume Screening</p>
              <p>Model: <code className="text-blue-600 font-mono">gpt-4o-mini</code> / Luna</p>
              <p className="mt-1 text-slate-500">Quickly scores problem clarity, innovation, relevance, impact, and completeness across all submissions to shortlist top ~30%.</p>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <p className="font-bold text-slate-900 mb-1">Stage 2: Deep Evidence Verification</p>
              <p>Model: <code className="text-blue-600 font-mono">gpt-4o</code> / Sol</p>
              <p className="mt-1 text-slate-500">Performs in-depth analysis of GitHub repository, architecture, AI/ML claims, and produces the Verified Evidence vs Missing Claims audit.</p>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <p className="font-bold text-slate-900 mb-1">Stage 3: Human Jury Final</p>
              <p>Format: Live Demo + Q&A</p>
              <p className="mt-1 text-slate-500">Human judges use the generated PDF / Evidence Audit reports to cross-examine finalists and make final prize determinations.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { ParticleNetwork } from "@/components/ui/motion/particle-network";
import { TiltCard } from "@/components/ui/motion/tilt-card";
import { BorderBeam } from "@/components/ui/motion/border-beam";
import { TextScramble } from "@/components/ui/motion/text-scramble";
import { MagneticButton } from "@/components/ui/motion/magnetic-button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@hackeval.dev");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden">
      {/* Codrops Interactive Particle Canvas Background */}
      <ParticleNetwork particleCount={65} connectDistance={130} />

      {/* Cyberpunk Grid Floor */}
      <div className="pointer-events-none absolute inset-0 grid-floor opacity-50" />

      {/* Ambient Radial Blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-blue-600/15 blur-[140px] animate-pulse-glow" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-purple-600/15 blur-[160px] animate-float" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and Text Scramble */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative h-16 w-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-4 glow shadow-2xl transition-transform hover:scale-105 duration-300">
            <Shield className="h-8 w-8 text-primary" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400" />
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <TextScramble text="Hackathon Evaluator" duration={1000} />
            <Sparkles className="h-5 w-5 text-cyan-400" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Autonomous AI Judging & Verification Engine</p>
        </div>

        {/* 3D Tilt Card with Codrops BorderBeam & Glare */}
        <TiltCard maxTilt={7} glare={true}>
          <Card className="relative overflow-hidden bg-white/95 border border-slate-200/90 shadow-xl backdrop-blur-2xl">
            <BorderBeam size={220} duration={8} colorFrom="#2563eb" colorTo="#8b5cf6" />

            <CardHeader className="text-center pb-2 relative z-10">
              <CardTitle className="text-lg font-bold">Organizer Access</CardTitle>
              <CardDescription className="text-xs">
                Enter your credentials to access the 500-submission evaluation suite
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="bg-background/80"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="bg-background/80"
                  />
                </div>
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 animate-fade-in">
                    {error}
                  </div>
                )}

                <MagneticButton
                  type="submit"
                  magneticStrength={0.2}
                  disabled={loading}
                  className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm glow hover:bg-primary/90 flex items-center justify-center transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <span>Sign In to Command Center</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </MagneticButton>
              </form>
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center">
                  Pre-configured demo: <code className="text-primary font-mono">admin@hackeval.dev</code> / <code className="text-primary font-mono">admin123</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </TiltCard>
      </div>
    </div>
  );
}

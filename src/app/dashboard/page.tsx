import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileSearch,
  PlusCircle,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { formatDate, getStatusColor, getScoreColor, getRecommendationLabel, getRecommendationColor } from "@/lib/utils";
import { QueueStatusCard } from "@/components/dashboard/queue-status-card";
import { DashboardClientStats } from "@/components/dashboard/dashboard-client-stats";
import { AmbientBackground } from "@/components/ui/motion/ambient-background";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [totalSubmissions, pendingAnalyses, finalized, sessions] = await Promise.all([
    db.evaluationSession.count(),
    db.evaluationSession.count({ where: { status: { in: ["draft", "analyzing"] } } }),
    db.evaluationSession.count({ where: { status: "finalized" } }),
    db.evaluationSession.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        evaluationResult: true,
        createdBy: { select: { name: true } },
      },
    }),
  ]);

  const avgResult = await db.evaluationResult.aggregate({
    _avg: { finalScore: true },
    where: { finalScore: { gt: 0 } },
  });
  const averageScore = avgResult._avg.finalScore || 0;

  const statItems = [
    {
      label: "Total Submissions",
      value: totalSubmissions,
      iconName: "FileSearch" as const,
      color: "text-blue-600",
      bg: "bg-blue-50 border-blue-200",
    },
    {
      label: "Pending Analysis",
      value: pendingAnalyses,
      iconName: "Clock" as const,
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
    },
    {
      label: "Finalized",
      value: finalized,
      iconName: "CheckCircle2" as const,
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-200",
    },
    {
      label: "Average Score",
      value: Number(averageScore.toFixed(1)),
      decimals: 1,
      iconName: "BarChart3" as const,
      color: "text-purple-600",
      bg: "bg-purple-50 border-purple-200",
    },
  ];

  const recent = sessions.map((s) => ({
    id: s.id,
    teamName: s.teamName,
    projectName: s.projectName || s.teamName,
    score: s.evaluationResult?.finalScore || 0,
    recommendation: s.evaluationResult?.recommendation || "",
  }));

  return (
    <AmbientBackground showGrid={true} className="space-y-6 animate-fade-in -m-6 p-6">
      {/* Ticker, Header & 3D Tilt Cards */}
      <DashboardClientStats stats={statItems} recentSubmissions={recent} />

      {/* Live Queue Progress & Worker Controls */}
      <QueueStatusCard />

      {/* Recent Evaluations */}
      <Card className="bg-white border-slate-200 relative overflow-hidden shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">Recent Evaluations</CardTitle>
            <p className="text-sm text-slate-500 mt-0.5">Latest submission evaluations with verified audits</p>
          </div>
          <Link href="/dashboard/evaluations">
            <Button variant="ghost" size="sm" className="hover:text-blue-600 font-medium">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="pt-6">
          {sessions.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="h-14 w-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <FileSearch className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Ready for Submissions</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
                All mock test data has been purged. Benchmark your model accuracy first, or upload your 500-submission spreadsheet to begin automated evaluations.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/dashboard/model-test">
                  <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 hover:bg-slate-50">
                    Test Model Accuracy
                  </Button>
                </Link>
                <Link href="/dashboard/import">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Import Submissions
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/dashboard/evaluations/${session.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:bg-white/[0.03] hover:border-primary/30 transition-all duration-300 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center border border-border/40 group-hover:scale-105 transition-transform">
                      <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">
                        {(session.projectName || session.teamName).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium group-hover:text-primary transition-colors text-sm">
                        {session.projectName || session.teamName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.teamName} &middot; {session.university || "General Track"} &middot; {formatDate(session.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {session.evaluationResult && session.evaluationResult.finalScore > 0 && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={`text-sm font-bold ${getScoreColor(session.evaluationResult.finalScore)}`}>
                          {(session.evaluationResult.finalScore * 10).toFixed(0)}/100
                        </span>
                        {session.evaluationResult.recommendation && (
                          <Badge className={getRecommendationColor(session.evaluationResult.recommendation)}>
                            {getRecommendationLabel(session.evaluationResult.recommendation)}
                          </Badge>
                        )}
                      </div>
                    )}
                    <Badge className={getStatusColor(session.status)}>
                      {session.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AmbientBackground>
  );
}

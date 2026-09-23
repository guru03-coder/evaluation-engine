"use client";

import React from "react";
import Link from "next/link";
import {
  FileSearch,
  Clock,
  CheckCircle2,
  BarChart3,
  PlusCircle,
  FileSpreadsheet,
  Sparkles,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TiltCard } from "@/components/ui/motion/tilt-card";
import { AnimatedCounter } from "@/components/ui/motion/animated-counter";
import { TextScramble } from "@/components/ui/motion/text-scramble";
import { MarqueeTicker } from "@/components/ui/motion/marquee-ticker";
import { MagneticButton } from "@/components/ui/motion/magnetic-button";

interface StatItem {
  label: string;
  value: number;
  decimals?: number;
  iconName: "FileSearch" | "Clock" | "CheckCircle2" | "BarChart3";
  color: string;
  bg: string;
}

interface RecentSubmission {
  id: string;
  teamName: string;
  projectName: string;
  score: number;
  recommendation: string;
}

interface DashboardClientStatsProps {
  stats: StatItem[];
  recentSubmissions: RecentSubmission[];
}

export function DashboardClientStats({
  stats,
  recentSubmissions,
}: DashboardClientStatsProps) {
  const getIcon = (name: string) => {
    switch (name) {
      case "FileSearch":
        return FileSearch;
      case "Clock":
        return Clock;
      case "CheckCircle2":
        return CheckCircle2;
      case "BarChart3":
        return BarChart3;
      default:
        return FileSearch;
    }
  };

  // Build marquee items
  const marqueeItems = [
    <div key="mq-1" className="flex items-center gap-2 text-xs font-medium text-slate-800">
      <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
      <span>AI Evaluation Pipeline: Background Workers Active</span>
    </div>,
    <div key="mq-2" className="flex items-center gap-2 text-xs text-slate-500">
      <span>Two-Stage Pipeline: Fast Screening &rarr; Deep Code Verification</span>
    </div>,
    <div key="mq-3" className="flex items-center gap-2 text-xs font-semibold text-blue-600">
      <Sparkles className="h-3.5 w-3.5" />
      <span>Evidence Verification: Inspecting Pitch Claims vs Repository Code</span>
    </div>,
    ...recentSubmissions.slice(0, 4).map((sub, i) => (
      <div key={`mq-sub-${i}`} className="flex items-center gap-2 text-xs">
        <span className="font-semibold text-blue-600">{sub.teamName}</span>
        <span className="text-slate-500 truncate max-w-[120px]">({sub.projectName})</span>
        {sub.score > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
            {(sub.score * 10).toFixed(0)}/100
          </span>
        )}
      </div>
    )),
  ];

  return (
    <div className="space-y-6">
      {/* Infinite Smooth Marquee Ticker */}
      <div className="-mx-6">
        <MarqueeTicker items={marqueeItems} speed={28} />
      </div>

      {/* Header with TextScramble and Magnetic CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              <TextScramble text="Hackathon Evaluation Command Center" duration={1000} />
            </h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 border border-blue-200 text-blue-700">
              Active Suite
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Automated spreadsheet parsing, concurrent background queue, and evidence verification audits
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/import">
            <MagneticButton
              magneticStrength={0.2}
              className="h-10 px-4 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 flex items-center shadow-sm transition-all"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Import Submissions
            </MagneticButton>
          </Link>
          <Link href="/dashboard/evaluations/new">
            <MagneticButton
              magneticStrength={0.15}
              className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-sm flex items-center shadow-sm transition-all"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Single Evaluation
            </MagneticButton>
          </Link>
        </div>
      </div>

      {/* 3D Tilt Cards Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = getIcon(stat.iconName);
          return (
            <TiltCard key={stat.label} maxTilt={8} glare={true}>
              <Card className="bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-md transition-all h-full shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium tracking-wide">
                        {stat.label}
                      </p>
                      <p className={`text-3xl font-extrabold mt-1 tracking-tight ${stat.color}`}>
                        <AnimatedCounter
                          value={stat.value}
                          decimals={stat.decimals || 0}
                          duration={1400}
                        />
                      </p>
                    </div>
                    <div
                      className={`h-12 w-12 rounded-xl ${stat.bg} border flex items-center justify-center transition-transform hover:scale-110 duration-200`}
                    >
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TiltCard>
          );
        })}
      </div>
    </div>
  );
}

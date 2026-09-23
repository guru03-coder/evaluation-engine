import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    analyzing: "bg-amber-50 text-amber-700 border-amber-200",
    analyzed: "bg-blue-50 text-blue-700 border-blue-200",
    reviewed: "bg-purple-50 text-purple-700 border-purple-200",
    finalized: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return colors[status] || colors.draft;
}

export function getRecommendationColor(recommendation: string): string {
  const colors: Record<string, string> = {
    reject: "bg-red-50 text-red-700 border-red-200",
    consider: "bg-amber-50 text-amber-700 border-amber-200",
    shortlist: "bg-blue-50 text-blue-700 border-blue-200",
    finalist: "bg-purple-50 text-purple-700 border-purple-200",
    winner_candidate: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return colors[recommendation] || colors.consider;
}

export function getRecommendationLabel(recommendation: string): string {
  const labels: Record<string, string> = {
    reject: "Reject",
    consider: "Consider",
    shortlist: "Shortlist",
    finalist: "Finalist",
    winner_candidate: "Winner Candidate",
  };
  return labels[recommendation] || "Pending";
}

export function getScoreColor(score: number, maxScore: number = 10): string {
  const normalized = maxScore > 10 ? (score / maxScore) * 10 : (score > 10 ? score / 10 : score);
  if (normalized >= 9) return "text-emerald-700";
  if (normalized >= 8) return "text-emerald-600";
  if (normalized >= 6.5) return "text-blue-600";
  if (normalized >= 5) return "text-amber-600";
  return "text-red-600";
}

export function getScoreBgColor(score: number, maxScore: number = 10): string {
  const normalized = maxScore > 10 ? (score / maxScore) * 10 : (score > 10 ? score / 10 : score);
  if (normalized >= 8) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (normalized >= 6.5) return "bg-blue-50 text-blue-700 border-blue-200";
  if (normalized >= 5) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

export function calculateRecommendation(finalScore: number): string {
  const normalized100 = finalScore <= 10 ? finalScore * 10 : finalScore;
  if (normalized100 >= 90.0) return "winner_candidate";
  if (normalized100 >= 80.0) return "finalist";
  if (normalized100 >= 65.0) return "shortlist";
  if (normalized100 >= 50.0) return "consider";
  return "reject";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

export function parseJsonSafe<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

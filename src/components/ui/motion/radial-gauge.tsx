"use client";

import { useEffect, useState } from "react";

interface RadialGaugeProps {
  score: number; // 0 - 100
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
  showConfidence?: boolean;
  confidence?: number;
}

export function RadialGauge({
  score,
  size = 140,
  strokeWidth = 10,
  className = "",
  label = "Total Score",
  showConfidence = true,
  confidence = 0.85,
}: RadialGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 150);
    return () => clearTimeout(timer);
  }, [score]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Sweep across 270 degrees
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (arcLength * Math.min(Math.max(animatedScore, 0), 100)) / 100;

  // Determine color scheme based on 100-point score
  const getGradient = () => {
    if (score >= 80) return { id: "gauge-high", from: "#10b981", to: "#06b6d4" };
    if (score >= 65) return { id: "gauge-med", from: "#3b82f6", to: "#8b5cf6" };
    if (score >= 50) return { id: "gauge-borderline", from: "#f59e0b", to: "#f97316" };
    return { id: "gauge-low", from: "#ef4444", to: "#f43f5e" };
  };

  const grad = getGradient();

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      <svg width={size} height={size} className="transform rotate-[135deg]">
        <defs>
          <linearGradient id={grad.id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={grad.from} />
            <stop offset="100%" stopColor={grad.to} />
          </linearGradient>
          <filter id="gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={grad.from} floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />

        {/* Animated Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${grad.id})`}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          filter="url(#gauge-glow)"
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>

      {/* Central Metrics */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-extrabold tracking-tight text-foreground">
          {score.toFixed(1)}
        </span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">
          / 100
        </span>
        <span className="text-[10px] text-muted-foreground font-semibold -mt-0.5">
          {label}
        </span>
      </div>

      {showConfidence && (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span>AI Confidence: {Math.round(confidence * 100)}%</span>
        </div>
      )}
    </div>
  );
}

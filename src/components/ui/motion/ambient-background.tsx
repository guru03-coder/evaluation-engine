"use client";

interface AmbientBackgroundProps {
  showGrid?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function AmbientBackground({
  showGrid = false,
  className = "",
  children,
}: AmbientBackgroundProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Dynamic Ambient Gradient Blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-600/15 blur-[120px] animate-pulse-glow" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-purple-600/15 blur-[140px] animate-float" />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-cyan-600/10 blur-[120px]" />

      {/* Cyberpunk Grid Floor */}
      {showGrid && (
        <div className="pointer-events-none absolute inset-0 grid-floor opacity-40" />
      )}

      {children}
    </div>
  );
}

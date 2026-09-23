"use client";

import React from "react";

interface MarqueeTickerProps {
  items: React.ReactNode[];
  speed?: number; // seconds
  className?: string;
}

export function MarqueeTicker({
  items,
  speed = 30,
  className = "",
}: MarqueeTickerProps) {
  return (
    <div
      className={`relative overflow-hidden w-full py-2.5 bg-secondary/30 border-y border-border/40 backdrop-blur-md ${className}`}
    >
      {/* Gradient fade masks on left and right */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10" />

      <div
        className="animate-marquee flex items-center gap-8"
        style={{ animationDuration: `${speed}s` }}
      >
        {/* Set 1 */}
        {items.map((item, i) => (
          <div key={`m1-${i}`} className="shrink-0 flex items-center gap-8">
            {item}
            <span className="text-muted-foreground/30 select-none">&bull;</span>
          </div>
        ))}
        {/* Duplicate Set 2 for seamless infinite loop */}
        {items.map((item, i) => (
          <div key={`m2-${i}`} className="shrink-0 flex items-center gap-8">
            {item}
            <span className="text-muted-foreground/30 select-none">&bull;</span>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface TextScrambleProps {
  text: string;
  className?: string;
  scrambleOnHover?: boolean;
  duration?: number;
  as?: "span" | "h1" | "h2" | "h3" | "p" | "div";
}

const GLYPHS = "!<>-_\\/[]{}—=+*^?#________01010101";

export function TextScramble({
  text,
  className = "",
  scrambleOnHover = true,
  duration = 800,
  as: Component = "span",
}: TextScrambleProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isScrambling, setIsScrambling] = useState(false);
  const frameRef = useRef<number | null>(null);

  const startScramble = useCallback(() => {
    if (isScrambling) return;
    setIsScrambling(true);

    const length = text.length;
    const startTime = Date.now();

    const update = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Number of characters resolved
      const resolvedCount = Math.floor(progress * length);

      let scrambled = "";
      for (let i = 0; i < length; i++) {
        if (i < resolvedCount) {
          scrambled += text[i];
        } else {
          scrambled += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
      }

      setDisplayText(scrambled);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(update);
      } else {
        setDisplayText(text);
        setIsScrambling(false);
      }
    };

    frameRef.current = requestAnimationFrame(update);
  }, [text, duration, isScrambling]);

  useEffect(() => {
    startScramble();
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [text]);

  return (
    <Component
      className={className}
      onMouseEnter={scrambleOnHover ? startScramble : undefined}
    >
      {displayText}
    </Component>
  );
}

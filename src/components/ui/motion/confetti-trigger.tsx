"use client";

import confetti from "canvas-confetti";

export function fireCelebrationConfetti() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors: ["#3b82f6", "#a855f7", "#06b6d4"],
  });
  fire(0.2, {
    spread: 60,
    colors: ["#10b981", "#f59e0b", "#ec4899"],
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    colors: ["#ffffff", "#60a5fa"],
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}

export function fireStarBurst(x?: number, y?: number) {
  const origin = x !== undefined && y !== undefined 
    ? { x: x / window.innerWidth, y: y / window.innerHeight }
    : { x: 0.5, y: 0.5 };

  confetti({
    particleCount: 35,
    spread: 50,
    origin,
    zIndex: 9999,
    ticks: 150,
    gravity: 1.2,
    scalar: 0.7,
    colors: ["#fbbf24", "#f59e0b", "#d97706", "#ffffff"],
    shapes: ["star"],
  });
}

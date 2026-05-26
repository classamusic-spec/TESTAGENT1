"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect } from "react";

import { EASE_OUT } from "@/lib/motion";

/** Counts up to `value` on mount / change. Collapses to the final value under
 * prefers-reduced-motion. Pass `format` to control rendering (separators, etc). */
export function AnimatedNumber({
  value,
  format,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  duration = 0.9,
}: {
  value: number;
  format?: (v: number) => string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (v) => {
    const body = format ? format(v) : v.toFixed(decimals);
    return `${prefix}${body}${suffix}`;
  });

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration, ease: EASE_OUT });
    return () => controls.stop();
  }, [value, reduce, mv, duration]);

  return <motion.span className={className}>{text}</motion.span>;
}

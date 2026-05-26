import type { Variants } from "framer-motion";

/**
 * Shared motion vocabulary so animations feel consistent across the app.
 * Easing and timing follow the frontend-design skill: eased (never linear),
 * entrances 300-600ms, micro-interactions 120-200ms, lists staggered ~50ms.
 */

export const EASE_OUT = [0.21, 0.47, 0.32, 0.98] as const;

export const SPRING = { type: "spring", stiffness: 380, damping: 30 } as const;

/** Fade + small rise. Use for elements appearing on mount. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

/** Container that staggers its children's entrance. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

/** Child item paired with `staggerContainer`. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

/** Hover-lift / press-depress for interactive surfaces. */
export const hoverLift = {
  whileHover: { y: -3, transition: { duration: 0.18, ease: EASE_OUT } },
  whileTap: { scale: 0.985 },
} as const;

---
name: frontend-design
description: >-
  Craft polished, modern web UI. Use when building or refining frontend
  interfaces, design systems, layouts, motion/animation, or when a screen looks
  generic, flat, or unfinished and needs visual and interaction polish.
---

# Frontend Design

Build interfaces that feel considered, alive, and trustworthy. This skill is a
craft checklist for taking UI from "functional" to "polished."

## Operating principles

1. **Hierarchy first.** Every screen has exactly one primary action and one
   focal element. Establish it with size, weight, color, and whitespace before
   adding anything decorative. If everything is emphasized, nothing is.
2. **Whitespace is a feature.** Generous, consistent spacing reads as premium.
   Crowding reads as cheap. When in doubt, add space and remove elements.
3. **Restraint.** A tight palette, one or two font families, and a single accent
   color outperform a busy design. Polish is subtraction as much as addition.
4. **Motion has meaning.** Animation should explain a change (where something
   came from, what just happened), not decorate. Gratuitous motion is noise.
5. **Respect the user.** Honor `prefers-reduced-motion`, keyboard focus, contrast,
   and touch targets. Accessibility is part of polish, not a tax on it.

## Visual system

- **Spacing scale.** Use a consistent scale (4 / 8 / 12 / 16 / 24 / 32 / 48).
  Never hand-pick arbitrary pixel values. Align everything to the grid.
- **Type scale.** A clear ramp (e.g. 12 / 14 / 16 / 20 / 24 / 32 / 48) with
  deliberate weights. Body 14–16px, generous line-height (1.5–1.6). Tighten
  tracking on large headings, loosen on uppercase labels.
- **Color.** Define semantic tokens (background, surface, border, muted,
  primary, success, danger) as CSS variables — never hardcode hex in components.
  Keep one accent. Use tints/alpha of the accent for emphasis, not new hues.
- **Depth.** Layer with subtle borders (1px, low-alpha white on dark UIs),
  soft shadows, and translucency (glassmorphism) rather than heavy drop shadows.
  Shadows should match the accent's hue for cohesion.
- **Radius.** Pick one base radius and derive the rest. Consistent rounding is a
  strong, cheap signal of quality.
- **Borders & dividers.** Prefer low-contrast hairlines. Loud dividers fragment a
  layout; quiet ones organize it.

## Motion & micro-interactions

- **Easing.** Use custom cubic-beziers or springs, never linear. A good default
  ease-out: `cubic-bezier(0.21, 0.47, 0.32, 0.98)`. Springs feel best for
  interactive/physical elements (drag, toggles, layout shifts).
- **Duration.** Entrances 300–600ms, micro-interactions 120–200ms. Faster than
  it feels "slow," slower than it feels "jumpy." Stagger lists by 40–80ms/item.
- **Entrance.** Fade + small rise (12–24px) on mount or scroll-into-view. Animate
  once; don't re-trigger on every scroll.
- **Hover/press.** Interactive elements lift slightly on hover (translateY -1 to
  -2px or scale 1.02) and depress on press (scale 0.97–0.99). Always transition
  both directions.
- **Numbers.** Count up animated values (prices, percentages, PnL) — it draws the
  eye to what changed and feels live.
- **Layout transitions.** Use shared-element / layout animations (e.g. an active
  nav pill that slides between items) instead of hard cut state changes.
- **Loading.** Prefer skeletons/shimmer over spinners for content; reserve
  spinners for indeterminate actions. Never layout-shift when content arrives.
- **Reduced motion.** Wrap non-essential motion so it collapses to instant/opacity
  when `prefers-reduced-motion: reduce` is set.

## Layout

- Anchor on a max-width container with comfortable gutters. Full-bleed only for
  intentional hero/background moments.
- Build with a consistent grid; let cards span columns deliberately (e.g. a 2-col
  feature beside a 1-col sidebar) rather than uniform tiling.
- Maintain vertical rhythm: consistent gaps between sections, aligned baselines.
- Design the empty, loading, and error states — not just the happy path.

## Polish checklist (run before calling UI "done")

- [ ] One clear focal point and primary action per screen.
- [ ] Spacing and radii are on-scale and consistent everywhere.
- [ ] Hover, focus-visible, active, disabled, loading, and empty states all exist.
- [ ] Motion is purposeful, eased, and respects `prefers-reduced-motion`.
- [ ] Text contrast meets WCAG AA; focus rings are visible on keyboard nav.
- [ ] Touch targets ≥ 44px; nothing important relies on hover alone.
- [ ] No layout shift on load; images/charts reserve their space.
- [ ] Looks right at mobile, tablet, and desktop widths.

## Anti-patterns

- Default browser styling, unstyled focus outlines removed without replacement.
- Linear easing, uniform 1s fades, animations that block interaction.
- Pure-black on pure-white, or many competing accent colors.
- Decorative motion that distracts from the task or re-fires constantly.
- Tight, cramped layouts that fill every pixel.

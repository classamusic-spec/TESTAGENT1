"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/analytics", label: "Analytics" },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <a
            key={link.href}
            href={link.href}
            className={cn(
              "relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="dashboard-nav-pill"
                transition={SPRING}
                className="absolute inset-0 -z-10 rounded-lg bg-secondary"
              />
            )}
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "all", label: "All Calls", href: "/" },
  { id: "needs_review", label: "Needs Review", href: "/?filter=needs_review" },
  { id: "high", label: "High Performers", href: "/?filter=high" },
  { id: "flagged", label: "Flagged", href: "/?filter=flagged" },
];

export function DashboardFilterTabs() {
  const sp = useSearchParams();
  const cur = sp.get("filter") ?? "all";
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tabs.map((t) => {
        const active = t.id === cur;
        return (
          <Link
            key={t.id}
            href={t.href}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-muted/50"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

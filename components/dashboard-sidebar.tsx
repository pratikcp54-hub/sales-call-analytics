"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Upload, Phone, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload Call", icon: Upload },
  { href: "/calls", label: "All Calls", icon: Phone },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 px-4 py-5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Sales Analytics</p>
        <p className="mt-1 text-lg font-semibold text-white">Call Insights</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : href === "/calls"
                ? pathname === "/calls" || pathname.startsWith("/calls/")
                : href === "/leaderboard"
                  ? pathname.startsWith("/leaderboard")
                  : pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-white"
              )}
            >
              <Icon className="size-4 shrink-0 opacity-80" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-4 text-xs text-slate-500">
        AI-powered call review
      </div>
    </aside>
  );
}

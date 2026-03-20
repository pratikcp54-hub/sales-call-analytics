export function overallScoreClass(score: number): string {
  if (score <= 4) return "bg-red-500/15 text-red-700 border-red-500/40 dark:text-red-400";
  if (score <= 7) return "bg-amber-500/15 text-amber-800 border-amber-500/40 dark:text-amber-300";
  return "bg-emerald-500/15 text-emerald-800 border-emerald-500/40 dark:text-emerald-300";
}

export function dimensionBarColor(score: number): string {
  if (score <= 3) return "bg-red-500";
  if (score <= 6) return "bg-amber-500";
  return "bg-emerald-500";
}

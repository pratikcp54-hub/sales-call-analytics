"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  sortKey: string;
  activeKey: string;
  direction: "asc" | "desc";
  onSort: (key: string) => void;
  className?: string;
};

export function SortableTableHead({ children, sortKey, activeKey, direction, onSort, className }: Props) {
  const active = activeKey === sortKey;
  return (
    <TableHead
      className={cn("cursor-pointer select-none hover:bg-muted/60", className)}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active ? (
          direction === "asc" ? (
            <ArrowUp className="size-3.5 shrink-0 opacity-80" aria-hidden />
          ) : (
            <ArrowDown className="size-3.5 shrink-0 opacity-80" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="size-3.5 shrink-0 opacity-35" aria-hidden />
        )}
      </span>
    </TableHead>
  );
}

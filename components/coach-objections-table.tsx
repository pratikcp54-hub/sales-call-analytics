"use client";

import { useMemo, useState, useCallback } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/sortable-table-head";
import type { ObjectionInsight } from "@/lib/types";

type SortKey = "type" | "customer" | "agent" | "handled";

export function CoachObjectionsTable({ rows }: { rows: ObjectionInsight[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("type");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");

  const onSort = useCallback((key: string) => {
    const k = key as SortKey;
    setSortKey((prev) => {
      if (prev === k) {
        setDirection((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setDirection("asc");
      return k;
    });
  }, []);

  const sorted = useMemo(() => {
    const arr = [...rows];
    const dir = direction === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "type":
          cmp = (a.type || "").localeCompare(b.type || "");
          break;
        case "customer":
          cmp = a.customer_text.localeCompare(b.customer_text);
          break;
        case "agent":
          cmp = a.agent_response.localeCompare(b.agent_response);
          break;
        case "handled":
          cmp = Number(a.handled_well) - Number(b.handled_well);
          break;
        default:
          cmp = 0;
      }
      return cmp * dir;
    });
    return arr;
  }, [rows, sortKey, direction]);

  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <SortableTableHead sortKey="type" activeKey={sortKey} direction={direction} onSort={onSort} className="w-[12%] align-bottom">
            Type
          </SortableTableHead>
          <SortableTableHead sortKey="customer" activeKey={sortKey} direction={direction} onSort={onSort} className="min-w-0 w-[38%] whitespace-normal align-bottom">
            Customer
          </SortableTableHead>
          <SortableTableHead sortKey="agent" activeKey={sortKey} direction={direction} onSort={onSort} className="min-w-0 w-[38%] whitespace-normal align-bottom">
            Agent response
          </SortableTableHead>
          <SortableTableHead sortKey="handled" activeKey={sortKey} direction={direction} onSort={onSort} className="w-[12%] text-right align-bottom">
            Handled
          </SortableTableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((o, i) => (
          <TableRow key={i}>
            <TableCell className="align-top font-medium capitalize">{o.type}</TableCell>
            <TableCell className="min-w-0 align-top whitespace-normal break-words py-3 text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {o.customer_text}
            </TableCell>
            <TableCell className="min-w-0 align-top whitespace-normal break-words py-3 text-sm [overflow-wrap:anywhere]">{o.agent_response}</TableCell>
            <TableCell className="align-top text-right whitespace-nowrap">
              {o.handled_well ? (
                <span className="text-[#22c55e]">Yes</span>
              ) : (
                <span className="text-[#f59e0b]">No</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

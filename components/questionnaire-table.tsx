"use client";

import { useMemo, useState, useCallback } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/sortable-table-head";
import type { QuestionnaireRow } from "@/lib/types";

type SortKey = "topic" | "asked";

export function QuestionnaireTable({ rows }: { rows: QuestionnaireRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("topic");
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
      if (sortKey === "topic") {
        cmp = a.question_topic.localeCompare(b.question_topic);
      } else {
        cmp = Number(a.was_asked) - Number(b.was_asked);
      }
      return cmp * dir;
    });
    return arr;
  }, [rows, sortKey, direction]);

  if (rows.length === 0) {
    return (
      <Table>
        <TableBody>
          <TableRow>
            <TableCell colSpan={2} className="text-muted-foreground">
              No questionnaire rows stored for this call.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableTableHead sortKey="topic" activeKey={sortKey} direction={direction} onSort={onSort}>
            Question topic
          </SortableTableHead>
          <SortableTableHead sortKey="asked" activeKey={sortKey} direction={direction} onSort={onSort} className="w-[100px] text-right">
            Asked?
          </SortableTableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">{row.question_topic}</TableCell>
            <TableCell className="text-right">
              {row.was_asked ? <span className="text-[#22c55e]">Yes</span> : <span className="text-[#ef4444]">No</span>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

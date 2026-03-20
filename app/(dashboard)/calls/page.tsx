import Link from "next/link";
import { listCalls } from "@/lib/calls-server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { AllCallsTable } from "@/components/all-calls-table";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AllCallsPage() {
  const calls = await listCalls();

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">All calls</h1>
          <p className="text-sm text-muted-foreground">{calls.length} recording(s)</p>
        </div>
        <Link href="/upload" className={cn(buttonVariants())}>
          <Upload className="mr-2 size-4" />
          Upload new call
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Call list</CardTitle>
          <CardDescription>Every uploaded file and its analysis state</CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <AllCallsTable calls={calls} />
        </CardContent>
      </Card>
    </div>
  );
}

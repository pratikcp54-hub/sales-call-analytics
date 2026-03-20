import { notFound } from "next/navigation";
import { getCallBundle } from "@/lib/calls-server";
import { CallDetailClient } from "@/components/call-detail-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bundle = await getCallBundle(id);
  return {
    title: bundle?.call.file_name ?? "Call analysis",
  };
}

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bundle = await getCallBundle(id);
  if (!bundle) notFound();

  return <CallDetailClient callId={id} initial={bundle} />;
}

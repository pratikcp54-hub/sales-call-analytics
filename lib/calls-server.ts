import { getCallBundle as getCallBundleDb, listCalls as listCallsDb } from "@/lib/db";
import type { CallRow } from "@/lib/types";

export async function listCalls(): Promise<CallRow[]> {
  try {
    return listCallsDb();
  } catch {
    return [];
  }
}

export async function getCallBundle(callId: string) {
  try {
    return getCallBundleDb(callId);
  } catch {
    return null;
  }
}

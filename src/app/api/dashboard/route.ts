import { NextResponse } from "next/server";
import { fetchGroups, fetchAttendance } from "@/lib/ccb";
import { latestUpdates, lastNoteDates } from "@/lib/data";
import type { DashboardPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [groups, updates, lastNotes, att] = await Promise.all([fetchGroups(), latestUpdates(), lastNoteDates(), fetchAttendance()]);
    const body: DashboardPayload = {
      groups, updates, lastNoteDates: lastNotes,
      attendance: att.monthly, weeklyAttendance: att.weekly, generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(body);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

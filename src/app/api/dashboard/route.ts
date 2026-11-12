import { NextResponse } from "next/server";
import { fetchGroups, fetchAttendance } from "@/lib/ccb";
import { latestUpdates, lastNoteDates } from "@/lib/data";
import type { DashboardPayload } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // first attendance load takes ~10s, then it is cached for an hour

export async function GET() {
  try {
    const [groups, updates, lastNotes] = await Promise.all([fetchGroups(), latestUpdates(), lastNoteDates()]);
    // Attendance is slow and optional: if it fails the rest of the dashboard still loads.
    let att: Awaited<ReturnType<typeof fetchAttendance>> | null = null, attendanceError: string | null = null;
    try { att = await fetchAttendance(groups); } catch (e) { attendanceError = (e as Error).message; }
    const body: DashboardPayload = {
      groups, updates, lastNoteDates: lastNotes,
      attendance: att?.monthly ?? null, weeklyAttendance: att?.weekly ?? null, weekOf: att?.weekOf ?? null, attendanceError,
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(body);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

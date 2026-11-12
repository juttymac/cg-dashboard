import { after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { computeAttendance, type AttendanceResult } from "./ccb.ts";
import type { Group } from "./types.ts";

const FRESH_MS = 60 * 60 * 1000;
const KEY = "attendance";

function db() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

async function refresh(groups: Group[]): Promise<AttendanceResult> {
  const value = await computeAttendance(groups, new Date(), true);
  await db().from("attendance_cache").upsert({ key: KEY, value, updated_at: new Date().toISOString() }); // best effort
  return value;
}

/**
 * Attendance takes ~10s to compute from CCB, so it is stored in Supabase (attendance_cache).
 * Fresh copy: returned as is. Stale copy: returned right away while a background refresh runs.
 * No copy (or the table is missing): computed on the spot.
 */
export async function getAttendance(groups: Group[]): Promise<AttendanceResult> {
  const { data, error } = await db().from("attendance_cache").select("value,updated_at").eq("key", KEY).maybeSingle();
  if (error || !data) return error ? computeAttendance(groups) : refresh(groups);
  const age = Date.now() - new Date(data.updated_at).getTime();
  if (age > FRESH_MS) after(() => refresh(groups).catch(() => {}));
  return data.value as AttendanceResult;
}

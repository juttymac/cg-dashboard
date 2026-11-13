import { createClient } from "@supabase/supabase-js";
import type { Note, NoteType, PastoralUpdate } from "./types.ts";

function db() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase is not configured");
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

export async function latestUpdates(): Promise<PastoralUpdate[]> {
  const { data, error } = await db().from("pastoral_updates").select("*").order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  const seen = new Set<string>();
  return (data as PastoralUpdate[]).filter((u) => (seen.has(u.group_id) ? false : (seen.add(u.group_id), true)));
}

export async function lastNoteDates(): Promise<Record<string, string>> {
  const { data, error } = await db().from("notes").select("group_id,date").order("date", { ascending: false });
  if (error) throw new Error(error.message);
  const out: Record<string, string> = {};
  for (const r of data as { group_id: string; date: string }[]) if (!(r.group_id in out)) out[r.group_id] = r.date;
  return out;
}

export async function notesFor(groupId: string): Promise<Note[]> {
  const { data, error } = await db().from("notes").select("*").eq("group_id", groupId)
    .order("date", { ascending: false }).order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Note[];
}

export async function addNote(n: { group_id: string; type: NoteType; author: string; text: string; date?: string }): Promise<Note> {
  const row = { ...n, date: n.date || new Date().toISOString().slice(0, 10) };
  const { data, error } = await db().from("notes").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data as Note;
}

export async function updatesFor(groupId: string): Promise<PastoralUpdate[]> {
  const { data, error } = await db().from("pastoral_updates").select("*").eq("group_id", groupId)
    .order("submitted_at", { ascending: false }).limit(5);
  if (error) throw new Error(error.message);
  return data as PastoralUpdate[];
}

/** Returns true if a note was removed. */
export async function deleteNote(id: number): Promise<boolean> {
  const { error, count } = await db().from("notes").delete({ count: "exact" }).eq("id", id);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

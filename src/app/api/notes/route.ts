import { NextResponse, type NextRequest } from "next/server";
import { addNote, notesFor, updatesFor } from "@/lib/data";
import { NOTE_TYPES, type NoteType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const groupId = req.nextUrl.searchParams.get("group_id");
  if (!groupId) return NextResponse.json({ error: "group_id required" }, { status: 400 });
  try {
    const [notes, updates] = await Promise.all([notesFor(groupId), updatesFor(groupId)]);
    return NextResponse.json({ notes, updates });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  const group_id = String(b?.group_id ?? "").trim();
  const author = String(b?.author ?? "").trim().slice(0, 80);
  const text = String(b?.text ?? "").trim().slice(0, 5000);
  const type = b?.type as NoteType;
  if (!group_id || !author || !text || !NOTE_TYPES.includes(type))
    return NextResponse.json({ error: "group_id, author, text and a valid type are required" }, { status: 400 });
  try {
    return NextResponse.json(await addNote({ group_id, author, text, type }), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

"use client";
import { useEffect, useState } from "react";
import { NOTE_TYPES, type Group, type Note, type NoteType, type PastoralUpdate } from "@/lib/types";
import { lastContactLabel, needsContact, spotsOpen, submissionStatus } from "@/lib/rules";

const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

export default function GroupDetail({ group, update, onClose, onNoteAdded }: {
  group: Group; update?: PastoralUpdate; onClose: () => void; onNoteAdded: (groupId: string, date: string) => void;
}) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [err, setErr] = useState("");
  const [type, setType] = useState<NoteType>("Call");
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { try { setAuthor(localStorage.getItem("cg-author") ?? ""); } catch {} }, []);
  useEffect(() => {
    let live = true;
    fetch(`/api/notes?group_id=${encodeURIComponent(group.id)}`).then((r) => r.json()).then((j) => {
      if (!live) return;
      if (j.error) setErr(j.error); else setNotes(j.notes);
    }).catch((e) => live && setErr(String(e)));
    return () => { live = false; };
  }, [group.id]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr("");
    try {
      const r = await fetch("/api/notes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ group_id: group.id, type, author, text }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not save");
      try { localStorage.setItem("cg-author", author); } catch {}
      setNotes((n) => [j as Note, ...(n ?? [])]);
      onNoteAdded(group.id, (j as Note).date);
      setText("");
    } catch (x) { setErr((x as Error).message); } finally { setSaving(false); }
  }

  const last = notes?.[0]?.date ?? null;
  const status = submissionStatus(update?.submitted_at);
  return (
    <div className="overlay" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="top">
          <div><h1>{group.name}</h1><div className="quote">{group.campus} campus</div></div>
          <button className="ghost" onClick={onClose}>Close</button>
        </div>
        <dl className="kv">
          <dt>Meets</dt><dd>{[group.day, group.time].filter(Boolean).join(" · ") || "Not listed"}</dd>
          <dt>Location</dt><dd>{group.location || "Not listed"}</dd>
          <dt>Status</dt><dd>{group.open ? "Open" : "Closed"}</dd>
          <dt>Capacity</dt><dd>{group.capacity == null ? `${group.enrolled} enrolled (no limit set)` : `${group.enrolled} of ${group.capacity} · ${spotsOpen(group)} open`}</dd>
          <dt>Leader update</dt><dd>{status}{update ? ` · ${fmt(update.submitted_at)}` : ""}</dd>
          {update?.health_rating != null && <><dt>Health</dt><dd>{update.health_rating} / 5</dd></>}
          {update?.help_needed && <><dt>Help needed</dt><dd>{update.help_needed}</dd></>}
          {update?.missional_activity && <><dt>Missional</dt><dd>{update.missional_activity}</dd></>}
          {update?.attrition_reasons && <><dt>Attrition</dt><dd>{update.attrition_reasons}</dd></>}
          <dt>Last contact</dt><dd>{notes ? lastContactLabel(last) : "…"} {notes && needsContact(last) && <span className="pill bad">Needs contact</span>}</dd>
        </dl>

        <h3>Add a note</h3>
        <form className="note" onSubmit={save}>
          <div className="r">
            <select value={type} onChange={(e) => setType(e.target.value as NoteType)}>{NOTE_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            <input placeholder="Your name" value={author} onChange={(e) => setAuthor(e.target.value)} required />
          </div>
          <textarea rows={3} placeholder="What happened?" value={text} onChange={(e) => setText(e.target.value)} required />
          <button disabled={saving}>{saving ? "Saving…" : "Save note"}</button>
        </form>
        {err && <div className="error">{err}</div>}

        <h3>Contact timeline</h3>
        {!notes ? <div className="empty">Loading…</div> : notes.length === 0 ? <div className="empty">No notes yet.</div> : (
          <ul className="timeline">
            {notes.map((n) => (
              <li key={n.id}><div className="meta">{fmt(n.date)} · {n.type} · {n.author}</div><div>{n.text}</div></li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

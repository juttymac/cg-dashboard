"use client";
import { useEffect, useMemo, useState } from "react";
import type { DashboardPayload } from "@/lib/types";
import { capacityFilledPct, lastContactLabel, needsContact, spotsOpen, submissionStatus } from "@/lib/rules";
import GroupDetail from "./GroupDetail";
import TrendChart from "./TrendChart";

const pillFor = { "On time": "ok", Overdue: "warn", "Never submitted": "bad" } as const;

export default function Dashboard() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [err, setErr] = useState("");
  const [campus, setCampus] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then((j) => (j.error ? setErr(j.error) : setData(j))).catch((e) => setErr(String(e)));
  }, []);

  const campuses = useMemo(() => ["All", ...[...new Set((data?.groups ?? []).map((g) => g.campus))].sort()], [data]);
  const groups = useMemo(() => (data?.groups ?? []).filter((g) => campus === "All" || g.campus === campus), [data, campus]);
  const updates = useMemo(() => new Map((data?.updates ?? []).map((u) => [u.group_id, u])), [data]);
  const lastNote = (id: string) => data?.lastNoteDates[id] ?? null;

  if (err) return <main><div className="error">Could not load dashboard: {err}</div></main>;
  if (!data) return <main><div className="empty">Loading…</div></main>;

  const rows = groups.map((g) => ({ g, status: submissionStatus(updates.get(g.id)?.submitted_at), flag: needsContact(lastNote(g.id)) }));
  const open = rows.filter((r) => spotsOpen(r.g) > 0).sort((a, b) => spotsOpen(b.g) - spotsOpen(a.g));
  const pct = capacityFilledPct(groups);
  const weekly = data.weeklyAttendance
    ? Object.entries(data.weeklyAttendance).filter(([c]) => campus === "All" || c === campus).reduce((s, [, n]) => s + n, 0) : null;
  const submitted = rows.filter((r) => r.status === "On time").length;
  const selected = openId ? data.groups.find((g) => g.id === openId) : null;

  return (
    <>
      <header>
        <div><h1>Community Groups</h1><small>Summit Church · pastor &amp; coordinator view</small></div>
        <label>Campus&nbsp;
          <select value={campus} onChange={(e) => setCampus(e.target.value)}>{campuses.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
      </header>
      <main>
        <section className="cards">
          <Card label="Weekly attendance" value={weekly ?? "—"} sub={weekly == null ? "CCB attendance not connected" : "latest week"} />
          <Card label="Open spots" value={open.reduce((s, r) => s + spotsOpen(r.g), 0)} sub={`${open.length} groups with room`} />
          <Card label="Capacity filled" value={pct == null ? "—" : `${pct}%`} sub="enrolled ÷ capacity" />
          <Card label="Submitted this cycle" value={`${submitted}/${rows.length}`} sub="within 6 weeks" />
          <Card label="Needs contact" value={rows.filter((r) => r.flag).length} sub="no note in 4 weeks" />
        </section>

        <section className="panel">
          <h2>Attendance trend</h2>
          {data.attendance ? <TrendChart points={data.attendance} campus={campus} /> : <div className="empty">Attendance source is not connected yet, so there is nothing to chart.</div>}
        </section>

        <div className="grid2">
          <section className="panel">
            <h2>Open groups</h2>
            <div className="scroll"><table>
              <thead><tr><th>Group</th><th>Campus</th><th style={{ textAlign: "right" }}>Open</th><th>Contact</th></tr></thead>
              <tbody>{open.map(({ g, flag }) => (
                <tr key={g.id} className="row" onClick={() => setOpenId(g.id)}>
                  <td>{g.name}</td><td>{g.campus}</td><td className="num">{spotsOpen(g)}</td>
                  <td>{flag ? <span className="pill bad">Needs contact</span> : <span className="pill ok">Current</span>}</td>
                </tr>))}
                {open.length === 0 && <tr><td colSpan={4} className="empty">No open spots.</td></tr>}
              </tbody>
            </table></div>
          </section>
          <section className="panel">
            <h2>Submission tracking</h2>
            <div className="scroll"><table>
              <thead><tr><th>Group</th><th>Status</th><th>Last contact</th></tr></thead>
              <tbody>{rows.map(({ g, status }) => (
                <tr key={g.id} className="row" onClick={() => setOpenId(g.id)}>
                  <td>{g.name}</td><td><span className={`pill ${pillFor[status]}`}>{status}</span></td><td>{lastContactLabel(lastNote(g.id))}</td>
                </tr>))}
              </tbody>
            </table></div>
          </section>
        </div>
      </main>
      {selected && (
        <GroupDetail group={selected} update={updates.get(selected.id)} onClose={() => setOpenId(null)}
          onNoteAdded={(id, date) => setData((d) => d && { ...d, lastNoteDates: { ...d.lastNoteDates, [id]: date } })} />
      )}
    </>
  );
}

function Card({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return <div className="card"><div className="label">{label}</div><div className="value">{value}</div><div className="sub">{sub}</div></div>;
}

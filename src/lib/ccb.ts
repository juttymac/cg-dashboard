import { XMLParser } from "fast-xml-parser";
import type { AttendancePoint, Group } from "./types.ts";

const GROUP_TYPE = "Community Group";
const HIDDEN_CAMPUSES = ["Naples"]; // same rule as Group Finder

// CCB descriptions are full of &amp;-style entities; the parser's default expansion cap is too low for the whole roster.
const PARSE_LIMITS = { enabled: true, maxEntityCount: 1_000_000, maxTotalExpansions: Infinity, maxExpandedLength: 100_000_000 };
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text", processEntities: PARSE_LIMITS });

const str = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "object") return str((v as Record<string, unknown>)["#text"]);
  return String(v).trim();
};
const num = (v: unknown): number | null => {
  const n = parseInt(str(v), 10);
  return Number.isFinite(n) ? n : null;
};

/**
 * Live roster fetch, run on every page load (never copied into Supabase).
 * Same call as GroupFinder/sync/sync_ccb.py. Capacity/enrolled tag names are best guesses:
 * run `npm run inspect-ccb` to confirm them against your CCB.
 */
export async function fetchGroups(): Promise<Group[]> {
  const { CCB_SUBDOMAIN, CCB_API_USER, CCB_API_PASSWORD } = process.env;
  if (!CCB_SUBDOMAIN || !CCB_API_USER || !CCB_API_PASSWORD) throw new Error("CCB credentials are not set");
  const url = `https://${CCB_SUBDOMAIN}.ccbchurch.com/api.php?srv=group_profiles&include_participants=false`;
  const auth = Buffer.from(`${CCB_API_USER}:${CCB_API_PASSWORD}`).toString("base64");
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}`, "User-Agent": "SummitCGDashboard/1.0" }, cache: "no-store" });
  if (!res.ok) throw new Error(`CCB answered HTTP ${res.status}`);
  const json = parser.parse(await res.text());
  const resp = json?.ccb_api?.response;
  if (resp?.errors) throw new Error("CCB error: " + str(resp.errors.error));
  const raw = resp?.groups?.group;
  const list: Record<string, unknown>[] = raw ? (Array.isArray(raw) ? raw : [raw]) : [];

  return list
    .filter((g) => str(g.group_type) === GROUP_TYPE && str(g.inactive) !== "true" && !HIDDEN_CAMPUSES.includes(str(g.campus)))
    .map((g) => {
      const cap = num(g.group_capacity ?? g.membership_limit ?? g.capacity);
      return {
        id: String(g["@_id"]),
        name: str(g.name),
        campus: str(g.campus) || "Unknown",
        day: str(g.meeting_day),
        time: str(g.meeting_time),
        location: str(g.area),
        open: str(g.public_search_listed) === "true",
        capacity: cap && cap > 0 ? cap : null,
        enrolled: num(g.current_members) ?? 0,
      } satisfies Group;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------------------------
// Attendance. attendance_profiles returns one record per meeting (event id, date, attendee list,
// head_count for guests) with no group on it, so event ids are mapped to groups through
// event_profiles. Both payloads are large, so the result is cached in memory for an hour.
// ---------------------------------------------------------------------------------------------
export interface AttendanceResult {
  monthly: AttendancePoint[];
  weekly: Record<string, number>; // campus -> attendance in the latest complete week
  weekOf: string;                 // Monday of that week, YYYY-MM-DD
}

const MONTHS_BACK = 6;
const CACHE_MS = 60 * 60 * 1000;
let cache: { at: number; value: AttendanceResult } | null = null;

function ccbHeaders() {
  const { CCB_API_USER, CCB_API_PASSWORD } = process.env;
  return { Authorization: `Basic ${Buffer.from(`${CCB_API_USER}:${CCB_API_PASSWORD}`).toString("base64")}`, "User-Agent": "SummitCGDashboard/1.0" };
}
async function ccbText(query: string): Promise<string> {
  const res = await fetch(`https://${process.env.CCB_SUBDOMAIN}.ccbchurch.com/api.php?${query}`, { headers: ccbHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(`CCB answered HTTP ${res.status}`);
  const text = await res.text();
  const err = text.match(/<error number="(\d+)"[^>]*>([^<]*)/);
  if (err) throw new Error(`CCB error ${err[1]}: ${err[2]}`);
  return text;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const mondayOf = (ymd: string) => {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return iso(d);
};

export async function fetchAttendance(groups: Group[], now = new Date()): Promise<AttendanceResult> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;

  const campusOf = new Map(groups.map((g) => [g.id, g.campus]));

  // event id -> group id
  const eventXml = await ccbText("srv=event_profiles&modified_since=2000-01-01");
  const eventGroup = new Map<string, string>();
  for (const b of eventXml.split("<event ").slice(1)) {
    const id = b.match(/^id="(\d+)"/)?.[1];
    const gid = b.match(/<group id="(\d+)"/)?.[1];
    if (id && gid) eventGroup.set(id, gid);
  }

  // month chunks, oldest first, from the start of the window to today
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - MONTHS_BACK, 1));
  const ranges: [string, string][] = [];
  for (let d = first; d <= now; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
    ranges.push([iso(d), iso(end > now ? now : end)]);
  }
  const chunks: string[] = [];
  for (let i = 0; i < ranges.length; i += 3) // 3 at a time, to stay polite to CCB
    chunks.push(...(await Promise.all(ranges.slice(i, i + 3).map(([a, b]) => ccbText(`srv=attendance_profiles&start_date=${a}&end_date=${b}`)))));

  const currentMonth = iso(now).slice(0, 7);
  const thisMonday = mondayOf(iso(now));
  const lastMonday = new Date(thisMonday + "T00:00:00Z"); lastMonday.setUTCDate(lastMonday.getUTCDate() - 7);
  const weekOf = iso(lastMonday);

  const monthly = new Map<string, number>(); // "month|campus"
  const weekly: Record<string, number> = {};
  for (const c of new Set(campusOf.values())) weekly[c] = 0;

  for (const xml of chunks) {
    for (const b of xml.split("<event ").slice(1)) {
      const eventId = b.match(/^id="(\d+)"/)?.[1];
      const date = b.match(/<occurrence>(\d{4}-\d{2}-\d{2})/)?.[1];
      const campus = eventId ? campusOf.get(eventGroup.get(eventId) ?? "") : undefined;
      if (!date || !campus || /<did_not_meet>true/.test(b)) continue;
      const count = (b.match(/<attendee[ >]/g)?.length ?? 0) + (parseInt(b.match(/<head_count>(\d+)/)?.[1] ?? "0", 10) || 0);
      const month = date.slice(0, 7);
      if (month !== currentMonth) monthly.set(`${month}|${campus}`, (monthly.get(`${month}|${campus}`) ?? 0) + count); // current month is partial: leave it off the trend
      if (mondayOf(date) === weekOf) weekly[campus] += count;
    }
  }

  const value: AttendanceResult = {
    monthly: [...monthly].map(([k, attendance]) => { const [month, campus] = k.split("|"); return { month, campus, attendance }; })
      .sort((a, b) => a.month.localeCompare(b.month)),
    weekly, weekOf,
  };
  cache = { at: Date.now(), value };
  return value;
}

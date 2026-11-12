import { XMLParser } from "fast-xml-parser";
import type { Group } from "./types.ts";

const GROUP_TYPE = "Community Group";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text" });

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
    .filter((g) => str(g.group_type) === GROUP_TYPE && str(g.inactive) !== "true")
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

/**
 * Weekly/monthly attendance. NOT connected yet: needs CCB attendance endpoints and an API user
 * allowed to read them. Returns null so the UI shows "not connected" instead of invented numbers.
 */
export async function fetchAttendance() {
  return { monthly: null, weekly: null } as { monthly: null; weekly: null };
}

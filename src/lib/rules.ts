import type { Group } from "./types.ts";

export const SUBMISSION_WINDOW_DAYS = 42; // 6 weeks
export const CONTACT_WINDOW_DAYS = 28;    // 4 weeks

export type SubmissionStatus = "On time" | "Overdue" | "Never submitted";

const DAY = 86_400_000;
const daysBetween = (from: string | Date, now: Date) =>
  Math.floor((now.getTime() - new Date(from).getTime()) / DAY);

export function submissionStatus(submittedAt: string | null | undefined, now = new Date()): SubmissionStatus {
  if (!submittedAt) return "Never submitted";
  return daysBetween(submittedAt, now) <= SUBMISSION_WINDOW_DAYS ? "On time" : "Overdue";
}

/** Flagged when the latest note is older than 28 days, or there is none. */
export function needsContact(lastNoteDate: string | null | undefined, now = new Date()): boolean {
  if (!lastNoteDate) return true;
  return daysBetween(lastNoteDate, now) > CONTACT_WINDOW_DAYS;
}

export function lastContactLabel(lastNoteDate: string | null | undefined, now = new Date()): string {
  if (!lastNoteDate) return "No contact yet";
  const d = daysBetween(lastNoteDate, now);
  if (d <= 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 14) return `${d} days ago`;
  return `${Math.round(d / 7)} weeks ago`;
}

export function spotsOpen(g: Pick<Group, "capacity" | "enrolled">): number {
  return g.capacity == null ? 0 : Math.max(0, g.capacity - g.enrolled);
}

/** enrolled ÷ capacity across the set; groups with no capacity are left out of both sides. */
export function capacityFilledPct(groups: Pick<Group, "capacity" | "enrolled">[]): number | null {
  let cap = 0, enr = 0;
  for (const g of groups) if (g.capacity != null) { cap += g.capacity; enr += g.enrolled; }
  return cap === 0 ? null : Math.round((enr / cap) * 100);
}

export type NoteType = "Call" | "Visit" | "Support Request" | "Update";
export const NOTE_TYPES: NoteType[] = ["Call", "Visit", "Support Request", "Update"];

/** Live from CCB. */
export interface Group {
  id: string;
  name: string;
  campus: string;
  day: string;
  time: string;
  location: string;
  open: boolean;            // listed in public search
  capacity: number | null;  // null = unlimited / not set
  enrolled: number;
}

/** From Supabase leader_updates (latest per group). */
export interface LeaderUpdate {
  group_id: string;
  submitted_at: string;
  health_rating: number | null;
  help_needed: string | null;
  missional_activity: string | null;
  attrition_reasons: string | null;
}

/** From Supabase notes. */
export interface Note {
  id: number;
  group_id: string;
  date: string; // YYYY-MM-DD
  type: NoteType;
  author: string;
  text: string;
}

export interface AttendancePoint { month: string; campus: string; attendance: number }

export interface DashboardPayload {
  groups: Group[];
  updates: LeaderUpdate[];     // latest per group
  lastNoteDates: Record<string, string>; // group_id -> most recent note date
  attendance: AttendancePoint[] | null;  // null = source not connected yet
  weeklyAttendance: Record<string, number> | null; // campus -> latest complete week total
  weekOf: string | null;                 // Monday of that week
  attendanceError: string | null;
  generatedAt: string;
}

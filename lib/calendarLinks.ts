import { escapeHtml } from "@/lib/escapeHtml";
import { buildGoogleCalendarUrl } from "@/lib/invitationUtils";
import { getLocaleDict, type InvitationLocale } from "@/lib/themeEngine/locale";

export interface CalendarEventInput {
  title?: string;
  name?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  time?: string;
  timezone?: string;
  location?: string;
  address?: string;
  notes?: string;
}

const TIMEZONE_OFFSET_HOURS: Record<string, number> = { WIB: 7, WITA: 8, WIT: 9 };
const DEFAULT_DURATION_HOURS = 3;

function parseEventUtcWindow(ev: CalendarEventInput, fallbackTimezone = "WIB") {
  const dateStr = String(ev?.date || "").split("T")[0];
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  // Tolak tanggal kalender mustahil (mis. 30 Feb)
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null;
  }

  const hhmm = (value?: string): [number, number] | null => {
    const m = String(value || "").match(/(\d{1,2})[.:](\d{2})/);
    return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? [Number(m[1]), Number(m[2])] : null;
  };

  const [timeFrom, timeTo] = String(ev.time || "").split(/\s*[-–]\s*/);
  const start = hhmm(ev.startTime) ?? hhmm(timeFrom);
  const end = hhmm(ev.endTime) ?? hhmm(timeTo);
  const zoneMatch = (`${ev.timezone || fallbackTimezone} ${ev.time || ""}`).toUpperCase().match(/\b(WITA|WIT|WIB)\b/);
  const zone = zoneMatch?.[1] || "WIB";
  const offset = TIMEZONE_OFFSET_HOURS[zone] ?? 7;

  if (!start) {
    const startDay = new Date(Date.UTC(year, month - 1, day));
    const endDay = new Date(Date.UTC(year, month - 1, day + 1));
    return { allDay: true as const, startDate: startDay, endDate: endDay };
  }

  const startMs = Date.UTC(year, month - 1, day, start[0] - offset, start[1]);
  let endMs = end ? Date.UTC(year, month - 1, day, end[0] - offset, end[1]) : startMs + DEFAULT_DURATION_HOURS * 3_600_000;
  if (endMs <= startMs) endMs += 24 * 3_600_000;
  return { allDay: false as const, startDate: new Date(startMs), endDate: new Date(endMs) };
}

function formatIcsUtcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
}

function formatIcsDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function escapeIcsText(value: string): string {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/** Bentuk payload kalender standar RFC 5545 (.ics) untuk Apple Calendar & Outlook. */
export function buildIcsCalendar(
  invitationTitle: string,
  events: CalendarEventInput[],
  fallbackTimezone = "WIB",
  slug = "undangan",
): string {
  const safeSlug = String(slug || "undangan").replace(/[^a-zA-Z0-9._-]/g, "-");
  const dtStamp = formatIcsUtcStamp(new Date());
  const vevents: string[] = [];

  events.forEach((ev, idx) => {
    const win = parseEventUtcWindow(ev, fallbackTimezone);
    if (!win) return;

    const sessionName = (ev.title || ev.name || "").trim();
    const summary = sessionName ? `${invitationTitle} — ${sessionName}` : invitationTitle;
    const location = [ev.location, ev.address].filter((s) => typeof s === "string" && s.trim()).join(", ");
    const description = (ev.notes || ev.time || "").trim();

    const lines = [
      "BEGIN:VEVENT",
      `UID:${safeSlug}-session-${idx}@luxvite.id`,
      `DTSTAMP:${dtStamp}`,
      win.allDay ? `DTSTART;VALUE=DATE:${formatIcsDateOnly(win.startDate)}` : `DTSTART:${formatIcsUtcStamp(win.startDate)}`,
      win.allDay ? `DTEND;VALUE=DATE:${formatIcsDateOnly(win.endDate)}` : `DTEND:${formatIcsUtcStamp(win.endDate)}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      ...(location ? [`LOCATION:${escapeIcsText(location)}`] : []),
      ...(description ? [`DESCRIPTION:${escapeIcsText(description)}`] : []),
      "END:VEVENT",
    ];
    vevents.push(lines.join("\r\n"));
  });

  if (vevents.length === 0) return "";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Luxvite//Digital Invitation//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...vevents,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/**
 * Tombol "Simpan ke Kalender" per sesi acara (Google Calendar + Apple/Outlook .ics).
 * Mengembalikan string kosong bila sesi belum memiliki tanggal kalender yang valid.
 */
export function buildCalendarButtonsHtml(opts: {
  event: CalendarEventInput;
  idx: number;
  slug?: string;
  titlePrefix: string;
  fallbackLocation?: string;
  locale?: InvitationLocale;
  sessionQuery?: number;
}): string {
  const { event, idx, slug, titlePrefix, fallbackLocation = "", locale = "id", sessionQuery } = opts;
  const sessionTitle = (event?.title || event?.name || "").trim();
  const fullTitle = sessionTitle ? `${titlePrefix} — ${sessionTitle}` : titlePrefix;
  const loc = [event?.location, event?.address].filter(Boolean).join(", ") || fallbackLocation;

  const gcalUrl = buildGoogleCalendarUrl(event || {}, fullTitle, loc);
  if (!gcalUrl) return "";

  const dict = getLocaleDict(locale);
  const icsHref = slug
    ? `/api/public/invitations/${encodeURIComponent(slug)}/calendar.ics${sessionQuery !== undefined ? `?session=${sessionQuery}` : ""}`
    : "";

  const pillStyle =
    "display: inline-flex; align-items: center; gap: 5px; font-size: 0.72rem; font-weight: 600; padding: 6px 12px; border-radius: var(--radius-full, 9999px); border: 1px solid color-mix(in srgb, var(--primary) 45%, transparent); color: var(--event-accent, var(--primary)); text-decoration: none; background: color-mix(in srgb, var(--primary) 8%, transparent);";

  return `
    <div class="event-cal-actions" style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 10px;">
      <a href="${escapeHtml(gcalUrl)}" target="_blank" rel="noopener noreferrer" class="btn-cal-outline" style="${pillStyle}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        <span>${escapeHtml(dict.saveGoogleCal)}</span>
      </a>
      ${icsHref ? `
      <a href="${escapeHtml(icsHref)}" download class="btn-cal-outline" style="${pillStyle}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>
        <span>${escapeHtml(dict.saveIcsCal)}</span>
      </a>` : ""}
    </div>
  `;
}

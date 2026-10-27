import type { CalendarEvent, ChapterCalendar } from "@/lib/portal-types";

// Chapter calendar on the portal home page. Events come from the Google
// Calendar set as CALENDAR_ID in the Apps Script (see docs/portal-setup.md).

const TIME_ZONE = "America/Indiana/Indianapolis";
const SHOW_FIRST = 8;

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFormat = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" });
// All-day dates are plain YYYY-MM-DD, so format them in UTC to keep the same day.
const weekdayFormat = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" });
const monthFormat = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short" });
const shortDateFormat = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });

const asUtcDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);

function dayKey(event: CalendarEvent) {
  return event.allDay ? event.start : dayKeyFormat.format(new Date(event.start));
}

/** Day first, then all-day events before timed ones, then by start time. */
function sortKey(event: CalendarEvent) {
  return `${dayKey(event)} ${event.allDay ? "0" : `1${new Date(event.start).toISOString()}`}`;
}

function timeLabel(event: CalendarEvent) {
  if (event.allDay) {
    // Google's all-day end date is the day after the last day.
    const last = new Date(asUtcDate(event.end).getTime() - 86_400_000);
    const lastKey = last.toISOString().slice(0, 10);
    return lastKey > event.start ? `All day, through ${shortDateFormat.format(last)}` : "All day";
  }
  return `${timeFormat.format(new Date(event.start))} – ${timeFormat.format(new Date(event.end))}`;
}

/** Plain text with any https links made clickable. */
function Linkified({ text }: { text: string }) {
  return text.split(/(https:\/\/[^\s)<>"]+)/g).map((part, i) =>
    part.startsWith("https://") ? (
      <a key={i} href={part} target="_blank" rel="noreferrer" className="break-all text-navy underline">
        {part}
      </a>
    ) : (
      part
    ),
  );
}

function EventItem({ event }: { event: CalendarEvent }) {
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <p className="font-semibold text-ink">{event.title}</p>
      <p className="mt-0.5 text-sm text-muted">
        {timeLabel(event)}
        {event.location && <> · <Linkified text={event.location} /></>}
      </p>
      {event.description && (
        <details className="mt-1 text-sm">
          <summary className="cursor-pointer text-navy">Details</summary>
          <p className="mt-1 whitespace-pre-line text-muted">
            <Linkified text={event.description} />
          </p>
        </details>
      )}
    </li>
  );
}

function DayGroups({ events }: { events: CalendarEvent[] }) {
  const days = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = dayKey(event);
    days.set(key, [...(days.get(key) ?? []), event]);
  }

  return (
    <ol className="space-y-3">
      {[...days].map(([key, items]) => {
        const date = asUtcDate(key);
        return (
          <li key={key} className="flex gap-4 rounded-xl border border-line bg-white p-4 sm:p-5">
            <div className="w-12 shrink-0 text-center" aria-hidden>
              <p className="text-xs font-semibold uppercase tracking-widest text-gold">{monthFormat.format(date)}</p>
              <p className="font-display text-2xl font-bold leading-tight text-navy">{date.getUTCDate()}</p>
              <p className="text-xs text-muted">{weekdayFormat.format(date)}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="sr-only">{shortDateFormat.format(date)}, {weekdayFormat.format(date)}</p>
              <ul className="divide-y divide-line">
                {items.map((event) => (
                  <EventItem key={event.id} event={event} />
                ))}
              </ul>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function UpcomingEvents({ calendar }: { calendar: ChapterCalendar | null }) {
  if (calendar === null) {
    return <p className="text-muted">The calendar couldn&apos;t load right now. Try again in a minute.</p>;
  }
  if (!calendar.calendarId) {
    return <p className="text-muted">The chapter calendar hasn&apos;t been connected yet.</p>;
  }

  const subscribeUrl = `https://calendar.google.com/calendar/u/0/r?cid=${Buffer.from(calendar.calendarId)
    .toString("base64")
    .replace(/=+$/, "")}`;
  const sorted = [...calendar.events].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const first = sorted.slice(0, SHOW_FIRST);
  const rest = sorted.slice(SHOW_FIRST);

  return (
    <div className="space-y-4">
      {calendar.events.length === 0 ? (
        <p className="text-muted">Nothing on the calendar for the next two months.</p>
      ) : (
        <>
          <DayGroups events={first} />
          {rest.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-navy">
                {rest.length} more event{rest.length === 1 ? "" : "s"}
              </summary>
              <div className="mt-3">
                <DayGroups events={rest} />
              </div>
            </details>
          )}
        </>
      )}
      <a
        href={subscribeUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-block rounded-full border border-navy px-5 py-2.5 text-sm font-semibold text-navy transition hover:bg-navy hover:text-white"
      >
        Add to my Google Calendar
      </a>
    </div>
  );
}

// Shapes of the brother-only data returned by the portal Apps Script
// (apps-script/portal.gs). Safe to import from client components: types only.

export type Alumnus = {
  /** Row number in the alumni sheet, used to look the record up again on the server. */
  id: string;
  name: string;
  email?: string;
  gradYear?: string;
  major?: string;
  position?: string;
  company?: string;
  location?: string;
  linkedin?: string;
  sector?: string;
  /** Comma-separated list, as typed in the sheet. */
  prevCompanies?: string;
};

export type Member = {
  email: string;
  name?: string;
};

export type Resource = {
  title: string;
  url: string;
  description?: string;
  category?: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  allDay: boolean;
  /** ISO timestamp, or YYYY-MM-DD for all-day events. */
  start: string;
  /** ISO timestamp, or YYYY-MM-DD (exclusive, Google's convention) for all-day events. */
  end: string;
  location?: string;
  description?: string;
};

export type ChapterCalendar = {
  calendarId: string;
  events: CalendarEvent[];
};

/** A brother from the Roster tab. Contact fields only come from the portal. */
export type Brother = {
  id: string;
  name: string;
  pledgeClass?: string;
  gradYear?: string;
  major?: string;
  position?: string;
  linkedin?: string;
  email?: string;
  personalEmail?: string;
  phone?: string;
};

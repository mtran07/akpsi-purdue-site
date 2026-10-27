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

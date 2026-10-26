// Helpers for the alumni directory, ported from the original Netlify
// directory (akpsi-purdue-alumni). Pure functions: safe on server and client.

import type { Alumnus } from "@/lib/portal-types";

/** An alum plus the derived fields the filters, map and insights use. */
export type AlumRow = Alumnus & {
  state: string;
  city: string;
  sectorGroup: string;
  majorGroup: string;
  year?: string;
  prevList: string[];
  coords: [number, number] | null;
};

export function enrich(alum: Alumnus): AlumRow {
  return {
    ...alum,
    state: extractState(alum.location),
    city: alum.location ? alum.location.split(",")[0].trim() : "",
    sectorGroup: normalizeSector(alum.sector),
    majorGroup: normalizeMajor(alum.major),
    year: yearOf(alum.gradYear),
    prevList: alum.prevCompanies
      ? alum.prevCompanies
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 4)
      : [],
    coords: getCoords(alum.location),
  };
}

/** Pulls a 4-digit year out of values like "May 2019" or "2019". */
export function yearOf(value?: string) {
  const years = value?.match(/(19|20)\d{2}/g);
  return years ? years[years.length - 1] : undefined;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/* ---------------- Location ---------------- */

const STATES: Record<string, string> = {
  al: "Alabama", ak: "Alaska", az: "Arizona", ar: "Arkansas", ca: "California", co: "Colorado",
  ct: "Connecticut", de: "Delaware", fl: "Florida", ga: "Georgia", hi: "Hawaii", id: "Idaho",
  il: "Illinois", in: "Indiana", ia: "Iowa", ks: "Kansas", ky: "Kentucky", la: "Louisiana",
  me: "Maine", md: "Maryland", ma: "Massachusetts", mi: "Michigan", mn: "Minnesota",
  ms: "Mississippi", mo: "Missouri", mt: "Montana", ne: "Nebraska", nv: "Nevada",
  nh: "New Hampshire", nj: "New Jersey", nm: "New Mexico", ny: "New York", nc: "North Carolina",
  nd: "North Dakota", oh: "Ohio", ok: "Oklahoma", or: "Oregon", pa: "Pennsylvania",
  ri: "Rhode Island", sc: "South Carolina", sd: "South Dakota", tn: "Tennessee", tx: "Texas",
  ut: "Utah", vt: "Vermont", va: "Virginia", wa: "Washington", wv: "West Virginia",
  wi: "Wisconsin", wy: "Wyoming", dc: "D.C.",
};

const INTERNATIONAL = [
  "uk", "united kingdom", "london", "canada", "india", "china", "singapore", "australia", "saudi",
  "bahamas", "indonesia", "uae", "korea", "japan", "germany", "france", "brazil", "europe",
];

/** "Chicago, IL" → "Illinois"; also "Remote", "International", "Other" or "". */
export function extractState(location?: string) {
  if (!location) return "";
  const l = location.toLowerCase().trim();
  if (l === "remote") return "Remote";
  const m = location.match(/,\s*([A-Za-z]{2})\.?\s*$/);
  if (m && STATES[m[1].toLowerCase()]) return STATES[m[1].toLowerCase()];
  for (const name of Object.values(STATES)) {
    if (l.endsWith(", " + name.toLowerCase()) || l.includes(name.toLowerCase())) return name;
  }
  if (INTERNATIONAL.some((k) => l.includes(k))) return "International";
  return location.length > 2 ? "Other" : "";
}

/** Sort order for state groups: real states first, catch-alls last. */
export function stateRank(state: string) {
  return ["Remote", "International", "Other", "Unknown"].indexOf(state);
}

// Coordinates for the map. Keys are matched against the sheet's Location text,
// so a few misspellings that appear in the sheet are listed on purpose.
// A location not listed here isn't shown on the map (the map says how many).
const CITY_COORDS: Record<string, [number, number]> = {
  "chicago, il": [41.8781, -87.6298], "chicago, illinois": [41.8781, -87.6298], "greater chicago area": [41.8781, -87.6298],
  "new york, ny": [40.7128, -74.006], "new york, new york": [40.7128, -74.006], "brooklyn, ny": [40.6782, -73.9442],
  "san francisco, ca": [37.7749, -122.4194], "los angeles, ca": [34.0522, -118.2437], "seattle, wa": [47.6062, -122.3321],
  "austin, tx": [30.2672, -97.7431], "austin, texas": [30.2672, -97.7431],
  "indianapolis, in": [39.7684, -86.1581], "indiapolis, in": [39.7684, -86.1581], "west lafayette, in": [40.4259, -86.9081],
  "mountain view, ca": [37.3861, -122.0839], "dallas, tx": [32.7767, -96.797], "charlotte, nc": [35.2271, -80.8431],
  "denver, co": [39.7392, -104.9903], "boston, ma": [42.3601, -71.0589], "atlanta, ga": [33.749, -84.388],
  "nashville, tn": [36.1627, -86.7816], "nashville, tennessee": [36.1627, -86.7816], "brentwood, tn": [36.0331, -86.7828], "franklin, tn": [35.9251, -86.8689],
  "pittsburgh, pa": [40.4406, -79.9959], "pittsburgh, pennsylvania": [40.4406, -79.9959],
  "columbus, oh": [39.9612, -82.9988], "columbus, ohio": [39.9612, -82.9988], "dublin, oh": [40.0992, -83.1141],
  "phoenix, az": [33.4484, -112.074], "minneapolis, mn": [44.9778, -93.265], "monticello, mn": [45.3052, -93.7938],
  "miami, fl": [25.7617, -80.1918], "st. petersburg, fl": [27.7676, -82.6403], "houston, tx": [29.7604, -95.3698],
  "portland, or": [45.5051, -122.675], "san diego, ca": [32.7157, -117.1611], "cupertino, ca": [37.323, -122.0322],
  "menlo park, ca": [37.4529, -122.1817], "pleasanton, ca": [37.6624, -121.8747], "redwood city, ca": [37.4852, -122.3644],
  "palo alto, ca": [37.4419, -122.143], "san jose, ca": [37.3382, -121.8863], "boulder, co": [40.015, -105.2705],
  "louisville, ky": [38.2527, -85.7585], "louiseville, ky": [38.2527, -85.7585], "louiseville, co": [39.9778, -105.1319],
  "downers grove, il": [41.8086, -88.0106], "boilingbrook, il": [41.6986, -88.0684], "bolingbrook, il": [41.6986, -88.0684],
  "schamburg, il": [42.0334, -88.0834], "schaumburg, il": [42.0334, -88.0834], "southfield, mi": [42.4734, -83.2219],
  "knoxville, tn": [35.9606, -83.9207], "bentonville, ak": [36.3729, -94.2088], "bentonville, ar": [36.3729, -94.2088],
  "valparaiso, in": [41.4731, -87.0611], "evansville, in": [37.9716, -87.5711], "south bend, in": [41.6764, -86.252],
  "carmel, in": [39.9784, -86.118], "warsaw, in": [41.242, -85.8519], "east chicago, in": [41.6392, -87.4542],
  "radford, va": [37.1318, -80.5765], "jersey city, nj": [40.7178, -74.0431], "purchase, ny": [41.0454, -73.7135],
  "bedford, ma": [42.4912, -71.2762], "king of prussia, pa": [40.0913, -75.3824], "milwaukee, wi": [43.0389, -87.9065],
  "cincinnati, oh": [39.1031, -84.512], "cleveland, oh": [41.4993, -81.6944], "hartford, ct": [41.7658, -72.6851],
  "moline, il": [41.5067, -90.5151], "long beach, ca": [33.7701, -118.1937], "orange county, ca": [33.7175, -117.8311],
  "littleton, co": [39.6136, -105.0166], "indiana": [39.7684, -86.1581], "colorado": [39.5501, -105.7821],
};

export function getCoords(location?: string): [number, number] | null {
  if (!location) return null;
  const key = location.toLowerCase().trim();
  if (CITY_COORDS[key]) return CITY_COORDS[key];
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (key.startsWith(city)) return coords;
  }
  return null;
}

/** Distance in miles between two points. */
export function milesBetween(a: [number, number], b: [number, number]) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/* ---------------- Sector & major grouping ---------------- */

export function normalizeSector(s?: string) {
  if (!s) return "";
  const l = s.toLowerCase().trim();
  const has = (...words: string[]) => words.some((w) => l.includes(w));
  if (has("tech", "software", "it ", "information tech", "saas") || l === "it") return "Technology";
  if (has("financ", "banking", "investment", "hedge", "capital market")) return "Financial Services";
  if (has("consult")) return "Consulting";
  if (has("account", "audit", "cpa", "tax")) return "Accounting";
  if (has("health", "medical", "pharma", "biotech", "hospital")) return "Healthcare";
  if (has("manufactur", "engineer", "industrial")) return "Manufacturing & Engineering";
  if (has("retail", "consumer", "e-commerce", "ecommerce")) return "Retail & Consumer";
  if (has("real estate")) return "Real Estate";
  if (has("law", "legal", "attorney")) return "Law";
  if (has("market", "advertis", "media", "pr ", "public relations")) return "Marketing & Media";
  if (has("government", "public sector", "military", "army", "defense")) return "Government & Public Sector";
  if (has("energy", "oil", "gas", "utilities")) return "Energy";
  if (has("education", "e-learn", "learning")) return "Education";
  if (has("food", "beverage", "restaurant", "hospitality")) return "Food, Beverage & Hospitality";
  if (has("transport", "logistics", "supply chain")) return "Transportation & Logistics";
  if (has("aerospace", "aviation")) return "Aerospace & Defense";
  if (has("insurance")) return "Insurance";
  if (has("nonprofit", "non-profit", "ngo")) return "Nonprofit";
  return s.trim();
}

export function normalizeMajor(m?: string) {
  if (!m) return "";
  const l = m.toLowerCase().trim();
  const has = (w: string) => l.includes(w);

  if (has("computer engineering")) return "Computer Engineering";
  if (has("electrical engineering")) return "Electrical Engineering";
  if (has("mechanical engineering")) return "Mechanical Engineering";
  if (has("industrial engineering") && !has("management")) return "Industrial Engineering";
  if (has("chemical engineering")) return "Chemical Engineering";
  if (has("aeronautical") || has("aerospace engineering")) return "Aeronautical & Aerospace Engineering";
  if (has("civil engineering")) return "Civil Engineering";
  if (has("interdisciplinary engineering")) return "Interdisciplinary Engineering";
  if (has("engineering")) return "Engineering";

  if (has("computer science")) return "Computer Science";
  if (has("computer information")) return "Computer Information Technology";
  if (has("data science")) return "Data Science";

  if (has("supply chain information") || (has("supply chain") && has("analytic"))) return "Supply Chain Information & Analytics";
  if (has("supply chain")) return "Supply Chain";

  if (has("accounting") && has("finance")) return "Accounting & Finance";
  if (has("accounting") && has("management")) return "Accounting & Management";
  if (has("accounting") && has("business")) return "Accounting & Business Management";
  if (has("accounting")) return "Accounting";

  if (has("finance") && has("management")) return "Finance & Management";
  if (has("finance") && has("economics")) return "Finance & Economics";
  if (has("finance")) return "Finance";

  if (has("industrial management")) return "Industrial Management";
  if (has("management") && has("marketing")) return "Management & Marketing";
  if (has("management") && has("human resource")) return "Management & Human Resources";
  if (has("management") && has("international")) return "Management & International Business";
  if (has("management") && has("information")) return "Management Information Systems";
  if (has("organizational leadership")) return "Organizational Leadership";
  if (has("strategic") && has("management")) return "Strategic Management";
  if (has("management")) return "Management";

  if (has("marketing")) return "Marketing";
  if (has("economics")) return "Economics";
  if (/\bmis\b/.test(l)) return "Management Information Systems";

  if (has("business administration") || has("business management")) return "Business Administration";
  if (has("international business")) return "International Business";
  if (has("business")) return "Business";

  if (has("public relations") || has("strategic communication")) return "Public Relations & Communications";
  if (has("communication") && has("advertis")) return "Communications & Advertising";
  if (has("communication")) return "Communications";
  if (has("human resource")) return "Human Resources";
  if (has("hospitality") || has("tourism")) return "Hospitality & Tourism Management";
  if (has("selling") || has("sales")) return "Sales Management";

  return m.split(",")[0].trim();
}

/** Counts per label, largest first. */
export function topCounts(values: string[], limit = 8): [string, number][] {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
}

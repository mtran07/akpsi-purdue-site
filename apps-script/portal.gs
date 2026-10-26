/**
 * AKPsi Purdue member portal: data endpoint
 *
 * A small Google Apps Script web app that lets the website's SERVER read the
 * portal's Google Sheet. Browsers never call it. Every request must carry the
 * secret key, which only Vercel knows.
 *
 * Setup: docs/portal-setup.md. In short:
 *   1. Create a NEW standalone Apps Script project (script.new) and paste this file.
 *   2. Project Settings → Script properties:
 *        SHEET_ID     the ID from the Google Sheet's URL
 *        PORTAL_KEY   a long random string (the same value goes in Vercel as PORTAL_SCRIPT_KEY)
 *        ALUMNI_TAB   name of the alumni tab (optional, default "Sheet4")
 *   3. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 *
 * Endpoints (all GET, all need &key=...):
 *   ?action=members    allowlist from the "Members" tab
 *   ?action=alumni     alumni directory rows (phone numbers are never returned)
 *   ?action=resources  brother-only links from the "Resources" tab
 *   ?action=columns    setup check: which alumni columns were recognized
 */

var MEMBERS_TAB = 'Members';
var RESOURCES_TAB = 'Resources';

/**
 * Which alumni sheet columns feed which directory field. Header names are
 * compared lowercase with spaces and punctuation removed, so "Full Name",
 * "full_name" and "Full Name-2" all count as "fullname". If several columns
 * match (duplicate imports), the first non-empty one wins.
 * Add your sheet's header here if a field shows up empty.
 */
var ALUMNI_FIELDS = {
  name: ['fullname', 'name', 'alumniname'],
  firstName: ['firstname', 'first'],
  lastName: ['lastname', 'last', 'surname'],
  email: ['permanentemail', 'email', 'emailaddress', 'personalemail', 'preferredemail'],
  gradYear: ['graduationdatemonthyear', 'graduationdate', 'graduation', 'graduationyear', 'gradyear', 'classyear', 'class'],
  major: ['collegemajor', 'major'],
  position: ['primarybusinessposition', 'position', 'jobtitle', 'title', 'currentposition', 'role'],
  company: ['primarybusinessorganization', 'company', 'organization', 'employer', 'currentcompany'],
  location: ['companylocation', 'location', 'city', 'currentlocation'],
  linkedin: ['linkedin', 'linkedinurl', 'linkedinprofile', 'linkedinprofileurl'],
  sector: ['sector', 'industry'],
  prevCompanies: ['prevcompanies', 'previouscompanies', 'othercompaniesworkedfor', 'othercompanies', 'pastcompanies']
};

function doGet(e) {
  var params = (e && e.parameter) || {};
  var props = PropertiesService.getScriptProperties();
  var expectedKey = props.getProperty('PORTAL_KEY');

  if (!expectedKey || !safeEqual_(String(params.key || ''), expectedKey)) {
    return json_({ ok: false, error: 'unauthorized' });
  }

  try {
    var spreadsheet = SpreadsheetApp.openById(props.getProperty('SHEET_ID'));
    var alumniTab = props.getProperty('ALUMNI_TAB') || 'Sheet4';

    switch (params.action) {
      case 'members':
        return json_({ ok: true, data: readMembers_(readTable_(spreadsheet, MEMBERS_TAB)) });
      case 'alumni':
        return json_({ ok: true, data: readAlumni_(readTable_(spreadsheet, alumniTab)) });
      case 'resources':
        // The Resources tab is optional: no tab means no links yet.
        if (!spreadsheet.getSheetByName(RESOURCES_TAB)) return json_({ ok: true, data: [] });
        return json_({ ok: true, data: readResources_(readTable_(spreadsheet, RESOURCES_TAB)) });
      case 'columns':
        return json_({ ok: true, data: describeColumns_(readTable_(spreadsheet, alumniTab).headers) });
      default:
        return json_({ ok: false, error: 'unknown action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/* ---------------- Readers (pure functions, no Google APIs) ---------------- */

/**
 * Who may sign in, by the Members tab's Status column. Anything else
 * (Inactive, Removed, Graduated, Suspended, a typo...) is locked out.
 * A blank Status counts as Active. Add "alumni" here only if graduated
 * brothers should keep portal access.
 */
var ALLOWED_STATUSES = ['', 'active'];

/** Members tab: Email (required) | Name | Status. */
function readMembers_(table) {
  var emailCol = findColumns_(table.headers, ['email', 'emailaddress', 'googleemail'])[0];
  var nameCol = findColumns_(table.headers, ['name', 'fullname'])[0];
  var statusCol = findColumns_(table.headers, ['status', 'active'])[0];
  if (emailCol === undefined) throw new Error('Members tab needs an "Email" column');

  var members = [];
  table.rows.forEach(function (row) {
    var email = String(row[emailCol] || '').trim().toLowerCase();
    if (email.indexOf('@') < 1) return;
    var status = statusCol === undefined ? '' : String(row[statusCol] || '').trim().toLowerCase();
    if (ALLOWED_STATUSES.indexOf(status) === -1) return;
    members.push({ email: email, name: nameCol === undefined ? '' : String(row[nameCol] || '').trim() });
  });
  return members;
}

/** Alumni tab: only the fields listed in ALUMNI_FIELDS are returned. */
function readAlumni_(table) {
  var cols = {};
  Object.keys(ALUMNI_FIELDS).forEach(function (field) {
    cols[field] = findColumns_(table.headers, ALUMNI_FIELDS[field]);
  });

  var alumni = [];
  table.rows.forEach(function (row, index) {
    var get = function (field) { return firstValue_(row, cols[field]); };

    var name = get('name') || [get('firstName'), get('lastName')].filter(Boolean).join(' ');
    if (!name) return;

    var record = { id: String(index + 2), name: name }; // +2: header row, 1-based rows
    var email = get('email');
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) record.email = email;
    var linkedin = normalizeLinkedIn_(get('linkedin'));
    if (linkedin) record.linkedin = linkedin;
    ['gradYear', 'major', 'position', 'company', 'location', 'sector', 'prevCompanies'].forEach(function (field) {
      var value = get(field);
      if (value && !/^(n\/?a|none|-)$/i.test(value)) record[field] = value;
    });
    alumni.push(record);
  });
  return alumni;
}

/** Resources tab: Title | URL | Description | Category. Only https links are returned. */
function readResources_(table) {
  var titleCol = findColumns_(table.headers, ['title', 'name'])[0];
  var urlCol = findColumns_(table.headers, ['url', 'link'])[0];
  var descCol = findColumns_(table.headers, ['description', 'notes'])[0];
  var catCol = findColumns_(table.headers, ['category', 'section'])[0];
  if (titleCol === undefined || urlCol === undefined) {
    throw new Error('Resources tab needs "Title" and "URL" columns');
  }

  var resources = [];
  table.rows.forEach(function (row) {
    var title = String(row[titleCol] || '').trim();
    var url = String(row[urlCol] || '').trim();
    if (!title || url.indexOf('https://') !== 0) return;
    var item = { title: title, url: url };
    if (descCol !== undefined && row[descCol]) item.description = String(row[descCol]).trim();
    if (catCol !== undefined && row[catCol]) item.category = String(row[catCol]).trim();
    resources.push(item);
  });
  return resources;
}

function describeColumns_(headers) {
  var matched = {};
  var used = {};
  Object.keys(ALUMNI_FIELDS).forEach(function (field) {
    matched[field] = findColumns_(headers, ALUMNI_FIELDS[field]).map(function (i) {
      used[i] = true;
      return headers[i];
    });
  });
  var ignored = headers.filter(function (_, i) { return !used[i]; });
  return { matched: matched, ignored: ignored };
}

/* ---------------- Helpers ---------------- */

function normalizeHeader_(header) {
  return String(header || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/\d+$/, '');
}

/** Indexes of every column whose normalized header equals one of the aliases, in alias order. */
function findColumns_(headers, aliases) {
  var normalized = headers.map(normalizeHeader_);
  var found = [];
  aliases.forEach(function (alias) {
    normalized.forEach(function (header, i) {
      if (header === alias && found.indexOf(i) === -1) found.push(i);
    });
  });
  return found;
}

function firstValue_(row, columns) {
  for (var i = 0; i < columns.length; i++) {
    var value = String(row[columns[i]] == null ? '' : row[columns[i]]).trim();
    if (value) return value;
  }
  return '';
}

/** Returns an https LinkedIn URL, or '' unless the host really is linkedin.com. */
function normalizeLinkedIn_(value) {
  if (!value) return '';
  var rest = String(value).trim().replace(/^https?:\/\//i, '').replace(/^\/+/, '');
  var host = rest.split(/[\/?#]/)[0].toLowerCase();
  if (host !== 'linkedin.com' && !/^[a-z0-9-]+\.linkedin\.com$/.test(host)) return '';
  if (/[\s"'<>]/.test(rest)) return '';
  return 'https://' + rest;
}

function safeEqual_(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ---------------- Google APIs ---------------- */

function readTable_(spreadsheet, tabName) {
  var sheet = spreadsheet.getSheetByName(tabName);
  if (!sheet) throw new Error('No tab named "' + tabName + '"');
  var values = sheet.getDataRange().getDisplayValues();
  return { headers: values[0] || [], rows: values.slice(1) };
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

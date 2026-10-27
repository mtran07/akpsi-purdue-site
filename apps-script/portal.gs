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
 *   ?action=events     upcoming events from the chapter Google Calendar
 *                      (script property CALENDAR_ID; the account that owns
 *                      this script must be able to see that calendar)
 *
 * And one POST, sent by the website when someone signed in with a Google
 * account that isn't on the Members tab types their full name
 * (body: JSON { key, action: "request", email, name, googleName }):
 *   action=request     if the name matches a brother on the Roster or Members
 *                      tab, adds their email to Members as "Pending". Changing
 *                      Pending to Active lets them in. No match: nothing written.
 *
 * Optional script property:
 *   NOTIFY_EMAIL       comma-separated addresses to email when a request comes in
 */

var MEMBERS_TAB = 'Members';
var RESOURCES_TAB = 'Resources';
var ROSTER_TAB = 'Roster';
var PENDING_STATUS = 'Pending';
var MAX_PENDING = 60; // stop adding requests if this many are already waiting

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
      case 'events':
        return json_({ ok: true, data: readEvents_(props.getProperty('CALENDAR_ID')) });
      default:
        return json_({ ok: false, error: 'unknown action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'bad request' });
  }
  var props = PropertiesService.getScriptProperties();
  var expectedKey = props.getProperty('PORTAL_KEY');
  if (!expectedKey || !safeEqual_(String(body.key || ''), expectedKey)) {
    return json_({ ok: false, error: 'unauthorized' });
  }
  if (body.action !== 'request') return json_({ ok: false, error: 'unknown action' });

  var clean = function (v, max) { return String(v || '').replace(/\s+/g, ' ').trim().slice(0, max); };
  var request = {
    email: clean(body.email, 200).toLowerCase(),
    name: clean(body.name, 100),
    googleName: clean(body.googleName, 100)
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email) || !request.name) {
    return json_({ ok: false, error: 'bad request' });
  }

  // One request at a time, so two quick submits can't add the same row twice.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return json_({ ok: false, error: 'busy, try again' });
  try {
    var spreadsheet = SpreadsheetApp.openById(props.getProperty('SHEET_ID'));
    var membersSheet = spreadsheet.getSheetByName(MEMBERS_TAB);
    if (!membersSheet) throw new Error('No tab named "' + MEMBERS_TAB + '"');
    var members = readTable_(spreadsheet, MEMBERS_TAB);
    var roster = spreadsheet.getSheetByName(ROSTER_TAB) ? readTable_(spreadsheet, ROSTER_TAB) : null;

    var decision = decideRequest_(members, roster, request);
    if (decision.newRow) {
      var note = requestNote_(request, decision.matched);
      membersSheet.appendRow(buildMemberRow_(members.headers, request, note));
      notify_(props.getProperty('NOTIFY_EMAIL'), request, note, spreadsheet.getUrl());
    }
    return json_({ ok: true, data: { result: decision.result } });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- Readers (pure functions, no Google APIs) ---------------- */

/**
 * What to do with an access request from an email that isn't an allowed member.
 * Returns { result, newRow, matched }:
 *   pending   name matches the roster: added as Pending (newRow), or already Pending
 *   no-match  nobody on the roster has that name; nothing is written
 *   blocked   their email is on the Members tab with a status like Inactive
 *   full      MAX_PENDING requests are already waiting; nothing is written
 * A match only files a request. A person always approves it.
 */
function decideRequest_(members, roster, request) {
  var emailCol = findColumns_(members.headers, ['email', 'emailaddress', 'googleemail'])[0];
  var nameCol = findColumns_(members.headers, ['name', 'fullname'])[0];
  var statusCol = findColumns_(members.headers, ['status', 'active'])[0];
  if (emailCol === undefined) throw new Error('Members tab needs an "Email" column');
  var pending = PENDING_STATUS.toLowerCase();

  var pendingCount = 0;
  var names = [];
  for (var i = 0; i < members.rows.length; i++) {
    var row = members.rows[i];
    var status = statusCol === undefined ? '' : String(row[statusCol] || '').trim().toLowerCase();
    if (status === pending) pendingCount++;
    if (String(row[emailCol] || '').trim().toLowerCase() === request.email) {
      if (status === pending) return { result: 'pending', newRow: false };
      // Allowed statuses never get here (the website lets them straight in),
      // so this row was deliberately switched off.
      return { result: ALLOWED_STATUSES.indexOf(status) === -1 ? 'blocked' : 'pending', newRow: false };
    }
    // Pending rows are requests, not records, so they can't vouch for anyone.
    if (status !== pending && nameCol !== undefined && row[nameCol]) names.push(String(row[nameCol]).trim());
  }
  if (roster) {
    var rosterNameCol = findColumns_(roster.headers, ['name', 'fullname', 'brother'])[0];
    if (rosterNameCol !== undefined) {
      roster.rows.forEach(function (row) { if (row[rosterNameCol]) names.push(String(row[rosterNameCol]).trim()); });
    }
  }

  var matched = '';
  for (var j = 0; j < names.length && !matched; j++) {
    if (namesMatch_(request.name, names[j])) matched = names[j];
  }
  if (!matched) return { result: 'no-match', newRow: false };
  if (pendingCount >= MAX_PENDING) return { result: 'full', newRow: false };
  return { result: 'pending', newRow: true, matched: matched };
}

/** The Note for a request, for whoever approves it. */
function requestNote_(request, matched) {
  var note = 'Access request ' + Utilities.formatDate(new Date(), 'America/Indianapolis', 'yyyy-MM-dd') +
    '. Typed name "' + request.name + '" matched roster "' + matched + '".';
  if (request.googleName && request.googleName !== request.name) {
    note += ' Google account name: "' + request.googleName + '".';
  }
  return note + ' Set Status to Active to approve.';
}

/** A Members row for a new request, in whatever column order the tab uses. */
function buildMemberRow_(headers, request, note) {
  var normalized = headers.map(normalizeHeader_);
  var filled = { email: false, name: false, status: false, note: false };
  return normalized.map(function (h) {
    if (!filled.email && (h === 'email' || h === 'emailaddress' || h === 'googleemail')) { filled.email = true; return request.email; }
    if (!filled.name && (h === 'name' || h === 'fullname')) { filled.name = true; return request.name; }
    if (!filled.status && (h === 'status' || h === 'active')) { filled.status = true; return PENDING_STATUS; }
    if (!filled.note && (h === 'note' || h === 'notes')) { filled.note = true; return note; }
    return '';
  });
}

var NICKNAMES = {
  alex: 'alexander', ben: 'benjamin', bill: 'william', chris: 'christopher', dan: 'daniel',
  dave: 'david', jake: 'jacob', jim: 'james', joe: 'joseph', jon: 'jonathan', josh: 'joshua',
  kate: 'katherine', liz: 'elizabeth', matt: 'matthew', mike: 'michael', nick: 'nicholas',
  rob: 'robert', bob: 'robert', sam: 'samuel', steve: 'steven', tom: 'thomas', will: 'william',
  tony: 'anthony', andy: 'andrew', zach: 'zachary', abby: 'abigail', maddie: 'madison', tim: 'timothy'
};

function nameTokens_(name) {
  return String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z\s-]/g, ' ').replace(/-/g, ' ').split(/\s+/).filter(Boolean);
}

function firstNamesMatch_(a, b) {
  if (a === b) return true;
  if (NICKNAMES[a] === b || NICKNAMES[b] === a || (NICKNAMES[a] && NICKNAMES[a] === NICKNAMES[b])) return true;
  var shorter = a.length < b.length ? a : b;
  var longer = a.length < b.length ? b : a;
  return shorter.length >= 3 && longer.indexOf(shorter) === 0; // Max / Maxwell
}

/**
 * Loose on purpose (it only helps a human decide): first and last name of the
 * roster entry must both appear in the given name, in either order, with
 * nicknames and shortened first names allowed. "Max Klug" matches
 * "Maxwell Klug"; "Nguyen Giang" matches "Giang Nguyen".
 */
function namesMatch_(googleName, rosterName) {
  var g = nameTokens_(googleName);
  var r = nameTokens_(rosterName);
  if (g.length < 2 || r.length < 2) return false;
  var first = r[0];
  var last = r[r.length - 1];
  var lastIndex = g.indexOf(last);
  if (lastIndex === -1) return false;
  return g.some(function (token, i) { return i !== lastIndex && firstNamesMatch_(token, first); });
}

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

var EVENT_DAYS_AHEAD = 60;
var MAX_EVENTS = 30;

/** The next EVENT_DAYS_AHEAD days of the chapter calendar. No calendar set → no events. */
function readEvents_(calendarId) {
  if (!calendarId) return { calendarId: '', events: [] };
  var calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) throw new Error('Calendar not found, or this script\'s account can\'t see it');

  var now = new Date();
  var until = new Date(now.getTime() + EVENT_DAYS_AHEAD * 24 * 60 * 60 * 1000);
  var events = calendar.getEvents(now, until).slice(0, MAX_EVENTS).map(function (event) {
    var allDay = event.isAllDayEvent();
    var item = {
      id: event.getId() + '|' + event.getStartTime().getTime(), // recurring events share an id
      title: String(event.getTitle() || 'Untitled event').slice(0, 200),
      allDay: allDay,
      // All-day dates as plain YYYY-MM-DD so time zones can't shift them a day.
      start: allDay ? Utilities.formatDate(event.getAllDayStartDate(), calendar.getTimeZone(), 'yyyy-MM-dd') : event.getStartTime().toISOString(),
      end: allDay ? Utilities.formatDate(event.getAllDayEndDate(), calendar.getTimeZone(), 'yyyy-MM-dd') : event.getEndTime().toISOString()
    };
    var location = String(event.getLocation() || '').trim();
    if (location) item.location = location.slice(0, 200);
    var description = plainText_(event.getDescription());
    if (description) item.description = description.slice(0, 600);
    return item;
  });
  return { calendarId: calendarId, events: events };
}

/** Calendar descriptions are often HTML. Keep the words and line breaks only. */
function plainText_(html) {
  return String(html || '')
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>/gi, '\n')
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi, function (_, href, text) {
      return text && text !== href ? text + ' (' + href + ')' : href;
    })
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function notify_(recipients, request, note, sheetUrl) {
  if (!recipients) return;
  try {
    MailApp.sendEmail({
      to: recipients,
      subject: 'AKPsi portal: ' + request.name + ' asked for access',
      body: request.name + ' asked for brother portal access as ' + request.email + '.\n\n' + note + '\n\n' +
        'They were added to the Members tab as Pending. If that\'s really them, change Status to Active:\n' +
        sheetUrl + '\n\nIf not, delete the row (or set it to Inactive so they can\'t ask again).'
    });
  } catch (err) {
    // Email is a nice-to-have; the row is already in the sheet.
  }
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

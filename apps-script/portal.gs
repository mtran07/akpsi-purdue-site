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
 *   ?action=roster     PUBLIC brother roster from the Roster tab: name, pledge
 *                      class, class year, major, position, LinkedIn only.
 *                      Rows with "Show on website" = No are left out.
 *   ?action=brothers   full Roster tab incl. emails and phone (portal only)
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
 *   action=profile     a signed-in brother's own Roster row (found by email,
 *                      then name); with "updates", saves the fields they may edit
 *   action=points      a signed-in brother's own row of the points table
 *                      (POINTS_SHEET_ID), incl. chapter attendance read from cell colors
 *   action=contact     public contact form: emails CONTACT_EMAIL (reply-to the
 *                      sender, who is never emailed) and logs it on a Contact tab
 *   action=excuse      emails an excusal request (with an optional proof photo)
 *                      to SECRETARY_EMAIL and logs it on the Excusals tab
 *
 * Optional script properties:
 *   NOTIFY_EMAIL       comma-separated addresses to email when a request comes in
 *   SECRETARY_EMAIL    where excusal requests go (needed for the excusal form)
 *   CONTACT_EMAIL      where contact-form messages go (falls back to SECRETARY_EMAIL)
 *   POINTS_SHEET_ID    the points table spreadsheet's ID (from its URL)
 *   POINTS_TAB         which tab of it to read (optional, default: the first tab)
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
      case 'roster':
        if (!spreadsheet.getSheetByName(ROSTER_TAB)) return json_({ ok: true, data: [] });
        return json_({ ok: true, data: readBrothers_(readTable_(spreadsheet, ROSTER_TAB), false) });
      case 'brothers':
        if (!spreadsheet.getSheetByName(ROSTER_TAB)) return json_({ ok: true, data: [] });
        return json_({ ok: true, data: readBrothers_(readTable_(spreadsheet, ROSTER_TAB), true) });
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
  try {
    switch (body.action) {
      case 'request': return handleRequest_(body, props);
      case 'profile': return handleProfile_(body, props);
      case 'excuse': return handleExcuse_(body, props);
      case 'points': return handlePoints_(body, props);
      case 'contact': return handleContact_(body, props);
      default: return json_({ ok: false, error: 'unknown action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function clean_(v, max) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
}

function handleRequest_(body, props) {
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

/* ---------------- My profile ---------------- */

/** Fields a brother may change on their own Roster row (name, position and Purdue email stay with officers). */
var EDITABLE_FIELDS = {
  pledgeClass: 'Pledge Class',
  gradYear: 'Class Year',
  major: 'Major',
  linkedin: 'LinkedIn',
  personalEmail: 'Personal Email',
  phone: 'Phone',
  show: 'Show on website'
};

function handleProfile_(body, props) {
  var email = clean_(body.email, 200).toLowerCase();
  var name = clean_(body.name, 100);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json_({ ok: false, error: 'bad request' });

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return json_({ ok: false, error: 'busy, try again' });
  try {
    var spreadsheet = SpreadsheetApp.openById(props.getProperty('SHEET_ID'));
    var sheet = spreadsheet.getSheetByName(ROSTER_TAB);
    if (!sheet) return json_({ ok: true, data: { found: false } });
    var table = readTable_(spreadsheet, ROSTER_TAB);
    var index = findRosterRow_(table, email, name);
    if (index < 0) return json_({ ok: true, data: { found: false } });

    if (body.updates) {
      var updates = validateProfile_(body.updates);
      if (updates.error) return json_({ ok: true, data: { found: true, error: updates.error } });
      // Link this sign-in to the row for next time.
      if (!/@purdue\.edu$/.test(email) && !firstValue_(table.rows[index], findColumns_(table.headers, BROTHER_FIELDS.personalEmail)) && !('personalEmail' in body.updates && updates.values.personalEmail)) {
        updates.values.personalEmail = email;
      }
      writeRow_(sheet, table, index, updates.values);
      table = readTable_(spreadsheet, ROSTER_TAB);
    }
    var profile = readBrothers_({ headers: table.headers, rows: [table.rows[index]] }, true)[0] || {};
    profile.show = !/^(no|n|false|hide|hidden)$/i.test(firstValue_(table.rows[index], findColumns_(table.headers, BROTHER_FIELDS.show)));
    delete profile.id;
    return json_({ ok: true, data: { found: true, saved: Boolean(body.updates), profile: profile } });
  } finally {
    lock.releaseLock();
  }
}

/**
 * The Roster row for a signed-in brother: their email in Purdue Email or
 * Personal Email, else exactly one row whose name matches. -1 if none.
 */
function findRosterRow_(table, email, name) {
  var emailCols = findColumns_(table.headers, BROTHER_FIELDS.email).concat(findColumns_(table.headers, BROTHER_FIELDS.personalEmail));
  var nameCol = findColumns_(table.headers, BROTHER_FIELDS.name)[0];
  for (var i = 0; i < table.rows.length; i++) {
    for (var c = 0; c < emailCols.length; c++) {
      if (String(table.rows[i][emailCols[c]] || '').trim().toLowerCase() === email) return i;
    }
  }
  if (nameCol === undefined || !name) return -1;
  var wanted = nameTokens_(name).join(' ');
  var exact = [], loose = [];
  table.rows.forEach(function (row, i) {
    var rowName = String(row[nameCol] || '');
    if (!rowName) return;
    if (nameTokens_(rowName).join(' ') === wanted) exact.push(i);
    else if (namesMatch_(name, rowName)) loose.push(i);
  });
  if (exact.length === 1) return exact[0];
  if (exact.length === 0 && loose.length === 1) return loose[0];
  return -1; // nobody, or more than one possible match: don't guess
}

/** Checks and tidies a brother's edits. Returns { values } or { error }. */
function validateProfile_(input) {
  var values = {};
  var text = function (key, max) { if (key in input) values[key] = clean_(input[key], max); };
  text('pledgeClass', 40);
  text('major', 80);
  if ('gradYear' in input) {
    var year = clean_(input.gradYear, 10);
    if (year && !/^20[2-3]\d$/.test(year)) return { error: 'Class year should look like 2028.' };
    values.gradYear = year;
  }
  if ('linkedin' in input) {
    var link = clean_(input.linkedin, 200);
    // A bare username like "janedoe" becomes linkedin.com/in/janedoe; any other non-LinkedIn link is refused.
    if (link && /^@?[A-Za-z0-9_-]{3,100}$/.test(link)) link = 'linkedin.com/in/' + link.replace(/^@/, '');
    var normalized = link ? normalizeLinkedIn_(link) : '';
    if (link && !normalized) return { error: 'That LinkedIn link doesn\'t look right.' };
    values.linkedin = normalized;
  }
  if ('personalEmail' in input) {
    var personal = clean_(input.personalEmail, 200).toLowerCase();
    if (personal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal)) return { error: 'That personal email doesn\'t look right.' };
    values.personalEmail = personal;
  }
  if ('phone' in input) {
    var phone = clean_(input.phone, 30).replace(/[^\d+()\-.\s]/g, '').trim();
    if (phone && phone.replace(/\D/g, '').length < 10) return { error: 'Phone numbers need at least 10 digits.' };
    values.phone = phone;
  }
  if ('show' in input) values.show = input.show === true || input.show === 'true' || input.show === 'Yes' ? 'Yes' : 'No';
  return { values: values };
}

/** Writes values into one Roster row, adding any missing column at the end. */
function writeRow_(sheet, table, index, values) {
  var headers = table.headers.slice();
  Object.keys(values).forEach(function (field) {
    var col = findColumns_(headers, BROTHER_FIELDS[field])[0];
    if (col === undefined) {
      headers.push(EDITABLE_FIELDS[field]);
      col = headers.length - 1;
      sheet.getRange(1, col + 1).setValue(EDITABLE_FIELDS[field]);
    }
    // Plain text, so "+1 317..." or "=..." is never read as a formula.
    sheet.getRange(index + 2, col + 1).setNumberFormat('@').setValue(String(values[field]));
  });
}

/* ---------------- Public contact form ---------------- */

var CONTACT_TAB = 'Contact';
var CONTACT_TOPICS = ['Joining / rush', 'Sponsorship or partnership', 'Alumni', 'Other'];
var MAX_CONTACT_PER_DAY = 40; // a ceiling in case the website's spam checks are ever bypassed

function handleContact_(body, props) {
  var to = props.getProperty('CONTACT_EMAIL') || props.getProperty('SECRETARY_EMAIL');
  if (!to) return json_({ ok: false, error: 'CONTACT_EMAIL is not set' });

  var msg = {
    name: clean_(body.name, 100),
    email: clean_(body.email, 200).toLowerCase(),
    topic: CONTACT_TOPICS.indexOf(body.topic) === -1 ? 'Other' : body.topic,
    message: String(body.message || '').trim().slice(0, 4000)
  };
  if (!msg.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(msg.email) || msg.message.length < 10) {
    return json_({ ok: false, error: 'bad request' });
  }

  // Daily ceiling, counted in script cache.
  var cache = CacheService.getScriptCache();
  var dayKey = 'contact-' + Utilities.formatDate(new Date(), 'America/Indianapolis', 'yyyyMMdd');
  var count = Number(cache.get(dayKey) || 0);
  if (count >= MAX_CONTACT_PER_DAY) return json_({ ok: false, error: 'daily limit' });
  cache.put(dayKey, String(count + 1), 6 * 60 * 60);

  MailApp.sendEmail({
    to: to,
    replyTo: msg.email,
    name: 'AKPsi Purdue website',
    subject: 'Website message (' + msg.topic + '): ' + msg.name,
    body: [
      'New message from the contact form on the chapter website.',
      '',
      'Name: ' + msg.name,
      'Email: ' + msg.email,
      'About: ' + msg.topic,
      '',
      msg.message,
      '',
      'Reply to this email to answer ' + msg.name.split(' ')[0] + '.'
    ].join('\n')
  });

  try {
    var spreadsheet = SpreadsheetApp.openById(props.getProperty('SHEET_ID'));
    var log = spreadsheet.getSheetByName(CONTACT_TAB);
    if (!log) {
      log = spreadsheet.insertSheet(CONTACT_TAB);
      log.appendRow(['Received', 'Name', 'Email', 'About', 'Message', 'Handled by']);
      log.setFrozenRows(1);
    }
    var row = [new Date(), msg.name, msg.email, msg.topic, msg.message, ''];
    log.appendRow(row.map(function (v) { return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v; }));
  } catch (err) {
    // ignore: the email already went out
  }
  return json_({ ok: true, data: { sent: true } });
}

/* ---------------- Points ---------------- */

/** Attendance colors come from the key at the top of the points sheet ("Present", "Excused"...). */
var POINT_STATUSES = [
  { status: 'present', test: /^present/i },
  { status: 'unexcused', test: /^unexcused/i },
  { status: 'excused', test: /^excused/i },
  { status: 'ooc-involvement', test: /out of chapter involve/i },
  { status: 'ooc-required', test: /out of chapter req/i }
];

function handlePoints_(body, props) {
  var sheetId = props.getProperty('POINTS_SHEET_ID');
  if (!sheetId) return json_({ ok: true, data: { configured: false } });
  var email = clean_(body.email, 200).toLowerCase();
  var name = clean_(body.name, 100);

  // Emails and names this brother might appear under: their sign-in, plus their Roster row.
  var emails = [email];
  var names = [name];
  var portal = SpreadsheetApp.openById(props.getProperty('SHEET_ID'));
  if (portal.getSheetByName(ROSTER_TAB)) {
    var roster = readTable_(portal, ROSTER_TAB);
    var index = findRosterRow_(roster, email, name);
    if (index >= 0) {
      var row = roster.rows[index];
      emails.push(firstValue_(row, findColumns_(roster.headers, BROTHER_FIELDS.email)).toLowerCase());
      emails.push(firstValue_(row, findColumns_(roster.headers, BROTHER_FIELDS.personalEmail)).toLowerCase());
      names.push(firstValue_(row, findColumns_(roster.headers, BROTHER_FIELDS.name)));
    }
  }

  var book = SpreadsheetApp.openById(sheetId);
  var tab = props.getProperty('POINTS_TAB');
  var sheet = tab ? book.getSheetByName(tab) : book.getSheets()[0];
  if (!sheet) throw new Error('No points tab named "' + tab + '"');
  var range = sheet.getDataRange();
  var result = readPoints_(range.getDisplayValues(), range.getBackgrounds(), emails.filter(Boolean), names.filter(Boolean));
  result.configured = true;
  result.sheetName = book.getName();
  return json_({ ok: true, data: result });
}

/**
 * One brother's row of the points table. Layout found by its labels, not
 * fixed cells: a row with "Events:" (event names), "Date:" (dates) and a
 * header row with "Name:", "Email:", "Total Points:", "Semester Goal:" and
 * "Mid-Semester Goal:". Chapter attendance is the cell color, matched to
 * the color key above the table.
 */
function readPoints_(values, colors, emails, names) {
  var norm = function (v) { return String(v || '').trim().toLowerCase().replace(/:$/, ''); };
  var findRow = function (label) {
    for (var r = 0; r < values.length; r++) {
      for (var c = 0; c < values[r].length; c++) if (norm(values[r][c]) === label) return { row: r, col: c };
    }
    return null;
  };
  var header = findRow('name');
  if (!header) throw new Error('Points sheet needs a "Name:" header');
  var hr = values[header.row];
  var colOf = function (label, last) {
    var found = -1;
    for (var c = 0; c < hr.length; c++) if (norm(hr[c]) === label) { found = c; if (!last) break; }
    return found;
  };
  var nameCol = header.col;
  var emailCol = colOf('email');
  var totalCol = colOf('total points', true);
  var goalCol = colOf('semester goal');
  var midCol = colOf('mid-semester goal');

  // Color key above the header.
  var keyColors = {};
  for (var r = 0; r < header.row; r++) {
    for (var c = 0; c < values[r].length; c++) {
      var text = String(values[r][c] || '').trim();
      var color = String(colors[r][c] || '').toLowerCase();
      if (!text || !color || color === '#ffffff') continue;
      POINT_STATUSES.forEach(function (s) { if (s.test.test(text) && !keyColors[color]) keyColors[color] = s.status; });
    }
  }

  // Event columns: named in the "Events:" row, before the final total column.
  var eventsAt = findRow('events');
  var datesAt = findRow('date');
  var events = [];
  if (eventsAt) {
    for (var c = eventsAt.col + 1; c < values[eventsAt.row].length && (totalCol < 0 || c < totalCol); c++) {
      var title = String(values[eventsAt.row][c] || '').trim();
      if (title) events.push({ col: c, name: title, date: datesAt ? String(values[datesAt.row][c] || '').trim() : '' });
    }
  }

  // Their row: by email first, then one exact name, then one close name.
  var wantedEmails = emails.map(function (e) { return e.toLowerCase(); });
  var wantedNames = names.map(function (n) { return nameTokens_(n).join(' '); });
  var match = -1, exact = [], loose = [];
  for (var r = header.row + 1; r < values.length; r++) {
    var rowName = String(values[r][nameCol] || '').trim();
    if (!rowName) continue;
    var rowEmail = emailCol >= 0 ? String(values[r][emailCol] || '').trim().toLowerCase() : '';
    if (rowEmail && wantedEmails.indexOf(rowEmail) !== -1) { match = r; break; }
    if (wantedNames.indexOf(nameTokens_(rowName).join(' ')) !== -1) exact.push(r);
    else if (names.some(function (n) { return namesMatch_(n, rowName); })) loose.push(r);
  }
  if (match < 0 && exact.length === 1) match = exact[0];
  if (match < 0 && exact.length === 0 && loose.length === 1) match = loose[0];
  if (match < 0) return { found: false };

  var num = function (v) { var n = parseFloat(String(v).replace(/[^\d.\-]/g, '')); return isNaN(n) ? null : n; };
  var row = values[match];
  return {
    found: true,
    name: String(row[nameCol]).trim(),
    total: totalCol >= 0 ? num(row[totalCol]) : null,
    semesterGoal: goalCol >= 0 ? num(row[goalCol]) : null,
    midSemesterGoal: midCol >= 0 ? num(row[midCol]) : null,
    events: events.map(function (e) {
      var item = { name: e.name, date: e.date, points: num(row[e.col]) };
      var status = keyColors[String(colors[match][e.col] || '').toLowerCase()];
      if (status) item.status = status;
      return item;
    })
  };
}

/* ---------------- Excusal requests ---------------- */

var EXCUSALS_TAB = 'Excusals';
var MAX_PROOF_BYTES = 2 * 1024 * 1024;

function handleExcuse_(body, props) {
  var to = props.getProperty('SECRETARY_EMAIL');
  if (!to) return json_({ ok: false, error: 'SECRETARY_EMAIL is not set' });

  var request = {
    email: clean_(body.email, 200).toLowerCase(),
    name: clean_(body.name, 100),
    event: clean_(body.event, 150),
    eventDate: clean_(body.eventDate, 40),
    reason: String(body.reason || '').trim().slice(0, 2000)
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email) || !request.event || !request.reason) {
    return json_({ ok: false, error: 'bad request' });
  }

  var attachments = [];
  if (body.proof && body.proof.data) {
    var type = String(body.proof.type || '');
    if (['image/jpeg', 'image/png', 'image/webp'].indexOf(type) === -1) return json_({ ok: false, error: 'bad proof type' });
    var bytes = Utilities.base64Decode(String(body.proof.data));
    if (bytes.length > MAX_PROOF_BYTES) return json_({ ok: false, error: 'proof too large' });
    var ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
    attachments.push(Utilities.newBlob(bytes, type, 'proof-' + request.name.replace(/[^A-Za-z0-9]+/g, '-') + '.' + ext));
  }

  var lines = [
    request.name + ' submitted an excusal request through the brother portal.',
    '',
    'Event: ' + request.event + (request.eventDate ? ' (' + request.eventDate + ')' : ''),
    'From: ' + request.name + ' <' + request.email + '>',
    '',
    'Reason:',
    request.reason,
    '',
    attachments.length ? 'Proof is attached.' : 'No proof was attached.',
    '',
    'Reply to this email to answer ' + request.name.split(' ')[0] + ' directly.'
  ];
  MailApp.sendEmail({
    to: to,
    cc: request.email,
    replyTo: request.email,
    subject: 'Excusal request: ' + request.name + ', ' + request.event,
    body: lines.join('\n'),
    attachments: attachments
  });

  // Log it for the secretary (best effort: the email already went out).
  try {
    var spreadsheet = SpreadsheetApp.openById(props.getProperty('SHEET_ID'));
    var log = spreadsheet.getSheetByName(EXCUSALS_TAB);
    if (!log) {
      log = spreadsheet.insertSheet(EXCUSALS_TAB);
      log.appendRow(['Submitted', 'Name', 'Email', 'Event', 'Event date', 'Reason', 'Proof attached', 'Decision']);
      log.setFrozenRows(1);
    }
    var row = [new Date(), request.name, request.email, request.event, request.eventDate, request.reason, attachments.length ? 'Yes' : 'No', ''];
    log.appendRow(row.map(function (v) { return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v; }));
  } catch (err) {
    // ignore
  }
  return json_({ ok: true, data: { sent: true } });
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

/**
 * Roster tab columns (headers matched like the alumni tab; only Name is required):
 * Name | Pledge Class | Class Year | Major | Position | LinkedIn |
 * Purdue Email | Personal Email | Phone | Show on website
 */
var BROTHER_FIELDS = {
  name: ['name', 'fullname', 'brother'],
  pledgeClass: ['pledgeclass', 'pledge', 'pc'],
  gradYear: ['classyear', 'gradyear', 'graduationyear', 'graduation', 'year'],
  major: ['major', 'majors'],
  position: ['position', 'role', 'office', 'title'],
  linkedin: ['linkedin', 'linkedinurl', 'linkedinprofile'],
  email: ['purdueemail', 'email', 'emailaddress', 'schoolemail'],
  personalEmail: ['personalemail', 'gmail', 'otheremail'],
  phone: ['phone', 'phonenumber', 'cell', 'mobile'],
  show: ['showonwebsite', 'public', 'showpublicly', 'website']
};
var PUBLIC_BROTHER_FIELDS = ['pledgeClass', 'gradYear', 'major', 'position'];

/**
 * Brothers from the Roster tab, in sheet order. withContact=false is the
 * public roster: no emails or phone, and anyone marked "No" under
 * Show on website is left out.
 */
function readBrothers_(table, withContact) {
  var cols = {};
  Object.keys(BROTHER_FIELDS).forEach(function (field) {
    cols[field] = findColumns_(table.headers, BROTHER_FIELDS[field]);
  });
  var isEmail = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); };

  var brothers = [];
  table.rows.forEach(function (row, index) {
    var get = function (field) {
      var value = firstValue_(row, cols[field]);
      return /^(n\/?a|none|-)$/i.test(value) ? '' : value;
    };
    var name = get('name');
    if (!name) return;
    if (!withContact && /^(no|n|false|hide|hidden)$/i.test(get('show'))) return;

    var record = { id: String(index + 2), name: name };
    PUBLIC_BROTHER_FIELDS.forEach(function (field) {
      var value = get(field);
      if (value) record[field] = value.slice(0, 120);
    });
    var linkedin = normalizeLinkedIn_(get('linkedin'));
    if (linkedin) record.linkedin = linkedin;

    if (withContact) {
      var email = get('email').toLowerCase();
      if (isEmail(email)) record.email = email;
      var personal = get('personalEmail').toLowerCase();
      if (isEmail(personal) && personal !== email) record.personalEmail = personal;
      var phone = get('phone').replace(/[^\d+()\-.\s]/g, '').trim();
      if (phone.replace(/\D/g, '').length >= 10) record.phone = phone;
    }
    brothers.push(record);
  });
  return brothers;
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

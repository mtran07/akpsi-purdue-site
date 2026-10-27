# Member portal setup

The portal lets brothers sign in with Google and see brother-only resources and the
alumni directory. Everything private stays in a Google Sheet. This repo holds only the
code that reads it, never names, emails or links.

Setup takes about 45 minutes and is done once, by whoever holds the Tech Chair role.

```
Brother ──"Sign in with Google"──► website (Vercel)
                                    │  1. Google confirms who they are
                                    │  2. is their email on the Members tab?
                                    ▼
                         Apps Script web app (needs the secret key)
                                    │
                                    ▼
                         Google Sheet: Members · Resources · alumni tab
```

Only the website's server talks to the Apps Script, using a key that lives in Vercel.
Browsers never see the key or the script URL, so the data can't be pulled directly.

---

## 1. Prepare the Google Sheet

Use the existing alumni directory spreadsheet. Add two tabs; the first row of each is
headers, spelled as below (capitalization doesn't matter):

**Members**: who can sign in

| Email | Name | Status |
| --- | --- | --- |
| jdoe@purdue.edu | Jane Doe | Active |

- One row per brother. Use the Google account they'll sign in with.
- **Only `Active` (or a blank Status) gets in.** Any other value (`Inactive`, `Graduated`,
  `Suspended`, a typo) locks that person out, as does deleting the row. Changes take effect
  within a minute, even if they're signed in.
- Purdue emails stop working after graduation. If graduated brothers should keep access,
  add `'alumni'` to `ALLOWED_STATUSES` at the top of the Apps Script, mark them `Alumni`, and
  list a personal Gmail.
- The VP of Membership or Secretary should own this tab, not Tech.
- Add a **Note** column if you like; sign-in requests (below) explain themselves there.

**Roster** (optional but recommended): names of current brothers, one per row under a
`Name` header. No emails needed. Used only for access requests:

- Anyone can sign in with Google, but someone whose email isn't on **Members** sees only
  a "Request access" form asking for their full name. Nothing brother-only is shown.
- If the name matches someone on **Roster** or **Members** (nicknames and "Max"/"Maxwell"
  count, word order doesn't matter), their email is added to **Members** with Status
  `Pending` and a note showing the typed name, the roster match and their Google
  account name. They're told the request was sent.
- No match means nothing is written; they're asked to check the spelling.
- **Pending does not get in.** Change it to `Active` to approve; they can refresh the
  portal a minute later. If it isn't really them, delete the row or set it to `Inactive`
  (an `Inactive` email can't file another request).
- To get an email for each request, set the script property `NOTIFY_EMAIL` (comma-
  separate several addresses). The first deploy after adding this asks you to allow
  the script to send email.
- New pledge class: add their names to **Roster**. They sign in, you approve.

**Resources** (optional): links shown on the portal home page

| Title | URL | Description | Category |
| --- | --- | --- | --- |
| Chapter Drive | https://drive.google.com/... | Bylaws, minutes, templates | General |

- Only `https://` links are shown. Category groups the links into sections.
- Linking a Drive file doesn't share it. Make sure the file itself is shared with the
  chapter, too.

**Chapter calendar** (optional): upcoming events on the portal home page

- In the Apps Script, add the script property `CALENDAR_ID`. Find it in Google Calendar:
  the calendar's ⋮ → Settings and sharing → Integrate calendar → Calendar ID (ends in
  `@group.calendar.google.com`).
- The Google account that owns the Apps Script must be able to see that calendar. The
  calendar does **not** need to be public: the script reads it, and brothers only see
  the events after signing in.
- The portal shows the next 60 days (up to 30 events), with times in Eastern time.
- The **Add to my Google Calendar** button only works for brothers the calendar is
  shared with. To let every brother subscribe, share it with them in Settings and
  sharing → Share with specific people (see all event details), or make it public.
- The first deploy after setting this asks you to allow the script to read your calendars.

**Alumni tab**: leave it as it is (currently `Sheet4`). The script recognizes the
current headers (First Name, Last Name, LinkedIn, Graduation Year, Major, Current
Position, Company, Email, Sector, Location, Prev. Companies) and common variants.
**Phone numbers are never sent to the website.**

The directory's map places alumni using a built-in list of cities
(`src/lib/alumni-utils.ts`, `CITY_COORDS`). Alumni whose Location isn't on that list
still appear everywhere else; the map says how many are missing. To add a city, add
one line with its coordinates.

## 2. Deploy the Apps Script

This is a *new* script, separate from the one the old Netlify directory uses.

1. Go to [script.new](https://script.new) while signed in to the account that owns the sheet.
   Name the project `AKPsi portal data`.
2. Delete the sample code and paste in all of [`apps-script/portal.gs`](../apps-script/portal.gs).
3. Click **Project Settings** (gear icon) → **Script properties** → **Add script property**, and add:

   | Property | Value |
   | --- | --- |
   | `SHEET_ID` | The long ID in the sheet's URL, between `/d/` and `/edit` |
   | `PORTAL_KEY` | A long random string. Generate one in Terminal with `openssl rand -hex 32` |
   | `ALUMNI_TAB` | `Sheet4` (or the alumni tab's real name) |

4. Click **Deploy → New deployment** → gear icon → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**. The key is what protects it.
5. Click **Deploy**, approve the permissions prompt, and copy the **Web app URL**
   (ends in `/exec`).
6. **Check it.** In a **private/incognito** window (so the key isn't saved in your
   history), open `<web app URL>?action=columns&key=<your PORTAL_KEY>`. You'll see which alumni columns
   were recognized. If a field like `company` is empty, add your header to `ALUMNI_FIELDS`
   at the top of the script, then **Deploy → Manage deployments → Edit → New version**.
   The URL stays the same.

## 3. Create the Google sign-in client

1. Go to [console.cloud.google.com](https://console.cloud.google.com) with the chapter tech
   account. Create a project named `AKPsi Portal`.
2. Open **APIs & Services → OAuth consent screen** and click **Get started**:
   - App name `AKPsi Purdue`, support email = the tech account
   - Audience: **External**
   - Contact email: the tech account → agree → **Create**
   - Don't upload a logo. That triggers Google's brand review.
3. Go to the **Audience** tab and click **Publish app** so the status reads **In production**.
   In Testing mode, only 100 hand-listed test users can sign in. The portal only asks for
   name and email, which don't need Google's verification.
4. Go to the **Clients** tab → **Create client** → Application type **Web application**,
   name `AKPsi website`. Under **Authorized redirect URIs**, add all three:
   ```
   http://localhost:3000/api/auth/callback/google
   https://<your-project>.vercel.app/api/auth/callback/google
   https://www.akpsipurdue.com/api/auth/callback/google
   ```
5. Click **Create** and copy the **Client ID** and **Client secret** right away. The secret
   isn't shown again.

Sign-in works on those three addresses only. Per-pull-request preview links have random
URLs, so sign-in fails there with `redirect_uri_mismatch`. Test the portal on localhost or
the main `.vercel.app` link.

## 4. Add the environment variables in Vercel

Vercel → your project → **Settings → Environment Variables**. Add each one for
**Production only**. Leave Preview unchecked, so that every branch someone pushes doesn't get
a key to the alumni sheet. (Previews couldn't use Google sign-in anyway; their portal just
shows "Coming soon".)

| Name | Value |
| --- | --- |
| `AUTH_SECRET` | Random string: run `openssl rand -base64 33` |
| `AUTH_GOOGLE_ID` | Client ID from step 3 |
| `AUTH_GOOGLE_SECRET` | Client secret from step 3 |
| `PORTAL_SCRIPT_URL` | Web app URL from step 2 |
| `PORTAL_SCRIPT_KEY` | The same `PORTAL_KEY` you set in step 2 |
| `ANTHROPIC_API_KEY` | *Optional.* A **new** key for the coffee-chat drafts (see step 6). Set a monthly spend limit on it in the Anthropic Console |

Then go to **Deployments** → the latest one → **⋯ → Redeploy**, because environment
variables only apply to new deployments. Until all five required variables are set, the
portal shows "Coming soon" instead of breaking.

## 5. Run it on your laptop (optional)

Create a file named `.env.local` in the project folder with the same variables. Git
ignores it, so it's never committed. See [`.env.example`](../.env.example). Then run
`npm run dev` and open http://localhost:3000/portal.

## 6. Retire the old directory

The old Netlify directory has its password and Claude API key written into its HTML, so
anyone can read both with View Source. Once the portal works:

1. **Revoke the old Claude API key** in the Anthropic Console (do this now, even before the
   portal is live). Create a new key for `ANTHROPIC_API_KEY` above.
2. Delete or unpublish the Netlify site.
3. Remove the old Apps Script's web app deployment (**Deploy → Manage deployments →
   Archive**) so its URL stops answering.
4. Keep the `akpsi-purdue-alumni` repo archived for reference, or delete it.

---

## Changing things later

| To… | Do this |
| --- | --- |
| Add or remove a brother | Edit the **Members** tab (Status `Active` or anything else). No code or redeploy needed |
| Approve a sign-in request | Change its Status from `Pending` to `Active` on **Members** |
| Let a new pledge class request access | Add their names to the **Roster** tab |
| Add a resource link | Add a row to the **Resources** tab |
| Fix an alum's info | Edit the alumni tab. Changes show on the next page load |
| Recognize a new alumni column | Edit `ALUMNI_FIELDS` in the Apps Script, deploy a new version |
| Rotate the script key | Change `PORTAL_KEY` in the script **and** `PORTAL_SCRIPT_KEY` in Vercel, then redeploy |
| Sign everyone out | Change `AUTH_SECRET` in Vercel and redeploy |

## How it's built (for developers)

- `src/auth.ts`: Auth.js (Google). Sign-in is refused unless the email is on the Members tab.
- `src/lib/dal.ts`: the only way pages read brother-only data. Every function re-checks
  membership, so being signed in isn't enough on its own.
- `src/lib/portal-data.ts`: calls the Apps Script. Server-only; never import it from a page.
- `src/app/portal/actions.ts`: sign in/out and coffee-chat drafts. Server actions are public
  endpoints, so each one checks membership itself.
- Portal pages render per request inside `<Suspense>` and call `connection()` first, so
  nothing brother-only is ever built into static HTML or prefetched.

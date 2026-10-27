# Starter tasks

The work between now and the **Dec 7 launch**, broken into pieces one person can own.
Put your name in the **Owner** column in a PR, or tell the Tech Committee Head, before you
start. Size: **S** ≈ an evening · **M** ≈ a few evenings · **L** ≈ a week or more.

Already done: project scaffold, all public pages with content copied from Wix, old-URL
redirects, brand colors and fonts, editing guide.

## Setup (Tech Committee Head, week of Oct 13)

| # | Task | Size | Owner |
| --- | --- | --- | --- |
| 0.1 | Create the shared chapter tech Gmail, with recovery not tied to one person | S | Melissa |
| 0.2 | Create the GitHub org under that email; push this repo; add committee members | S | Melissa |
| 0.3 | Create the Vercel account under that email; import the repo; share the preview link | S | Melissa |
| 0.4 | Check whether Wix lets us edit the domain's A/CNAME records (decides domain Option A or B) | S | Melissa |
| 0.5 | Fix the Wix AlumniDirectory collection permission: "Anyone" → members or admin only | S | Melissa |

## Content (any committee member)

| # | Task | Size | Owner |
| --- | --- | --- | --- |
| 1.1 | Confirm the exec board and committee heads are current. The Wix pages say Spring 2026, so some names are probably out of date. Update `exec-board.json` and `committee-heads.json`. | S | |
| 1.2 | Get exec's real "Message from the President" text and add it to the home page | S | |
| 1.3 | Run `npm run images:pull` on your own laptop to copy headshots off Wix, commit them, and remove the `static.wixstatic.com` entry from `next.config.ts`. **Must be done before Dec 21.** | S | |
| 1.4 | Download the remaining Wix images (logo, hero photo, rush event photos) into `public/images`, compressed under 500 KB each | S | |
| 1.5 | Turn "Where our brothers work" into a logo strip once we have logo files we're allowed to use | M | |

## Pages and features (developers)

| # | Task | Size | Owner |
| --- | --- | --- | --- |
| 2.1 | **Media:** embed the rush video (YouTube, unlisted) and 3–6 Instagram posts | M | |
| 2.2 | **Contact:** build the form in Google Forms or Tally under the chapter account; put its embed URL in `site.json` | S | |
| 2.3 | **Home:** add a hero photo and the official chapter logo | M | |
| 2.4 | **Social previews:** add an Open Graph image so links shared on Instagram and iMessage show a card | S | |
| 2.5 | **Accessibility pass:** keyboard-only navigation, color contrast, alt text on every image | M | |
| 2.6 | **Mobile menu:** close the menu after a link is tapped | S | |

## Before launch (week of Nov 30)

| # | Task | Size | Owner |
| --- | --- | --- | --- |
| 3.1 | Click every link and redirect on the preview; run Lighthouse in Chrome on each page | M | |
| 3.2 | Exec content sign-off | S | Melissa |
| 3.3 | Point the domain at Vercel (Option A) and update the Instagram bio link | S | Melissa |

## Member portal

Code is built: Google sign-in, Members allowlist, brother resources, alumni directory and
coffee-chat drafts. What's left is setup and moving people over. Follow
[portal-setup.md](portal-setup.md).

| # | Task | Size | Owner |
| --- | --- | --- | --- |
| 4.0 | **Revoke the old directory's Claude API key** (it's readable in the Netlify page source) | S | Melissa |
| 4.1 | Add **Members** and **Resources** tabs to the alumni sheet; fill Members with current brothers | S | VP Membership |
| 4.2 | Deploy `apps-script/portal.gs` and check `?action=columns` maps every alumni field | S | Melissa |
| 4.3 | Create the Google sign-in client and set the Vercel environment variables | S | Melissa |
| 4.4 | Have 3–4 brothers test sign-in and the directory on the `.vercel.app` link | S | |
| 4.5 | Retire the Netlify directory and its old Apps Script deployment | S | Melissa |
| 4.6 | ~~Add map and insights views to the directory, like the old site had~~ Done: cards, list, map, insights, Near Me | M | |
| 4.7 | Update the live Apps Script to the latest `portal.gs` (adds Sector, Prev. Companies and sign-in requests) and deploy a new version | S | Melissa |
| 4.9 | Add a **Roster** tab (import `roster-tab.csv`), optionally set `NOTIFY_EMAIL`, and approve `Pending` rows as they come in | S | Melissa / VP Membership |
| 4.8 | Add map coordinates for any common alumni cities the map reports as unrecognized | S | |

## Spring 2027 (after launch)

| # | Task | Size | Owner |
| --- | --- | --- | --- |
| 5.1 | Decide on a headless CMS if officers outside Tech edit often | M | |
| 5.2 | Handoff README for the next Tech Chair | S | |

## Old Wix URLs already redirected

`/executive-board` and `/committee-heads` → `/members` · `/our-partners` → `/contact` ·
`/social-media` → `/media` · `/member-login` and `/alumnidirectory/*` → `/portal` ·
`/blank`, `/blank-1`, `/copy-of-brother-search`, `/search-feature` → `/`

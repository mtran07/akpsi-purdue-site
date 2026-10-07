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

## Spring 2027 (after launch)

| # | Task | Size | Owner |
| --- | --- | --- | --- |
| 4.1 | Member portal sign-in, limited to approved members | L | |
| 4.2 | Alumni directory behind the portal (export from Wix as CSV first, never committed to the repo) | L | |
| 4.3 | Decide on a headless CMS if officers outside Tech edit often | M | |
| 4.4 | Handoff README for the next Tech Chair | S | |

## Old Wix URLs already redirected

`/executive-board` and `/committee-heads` → `/members` · `/our-partners` → `/contact` ·
`/social-media` → `/media` · `/member-login` and `/alumnidirectory/*` → `/portal` ·
`/blank`, `/blank-1`, `/copy-of-brother-search`, `/search-feature` → `/`

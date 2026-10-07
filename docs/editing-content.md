# Updating the website: guide for officers

You don't need to know how to code. Every name, date and company on the site lives in a
few text files you can edit right on GitHub.

## Before you start

Ask the Tech Committee Head to add you to the chapter's GitHub organization. You'll need a
free GitHub account.

## How to edit

1. Go to the repo on GitHub and open the `src/data` folder.
2. Click the file you need (see the table below), then the **pencil icon** to edit.
3. Make your change. Keep the quotes, commas and brackets exactly as they are around it.
4. Click **Commit changes**, choose **Create a new branch**, and click **Propose changes**.
5. Open the pull request. A Vercel preview link appears on it in a minute or two. Check
   your change there.
6. Ask someone on the Tech Committee to approve and merge. The site updates within minutes.

If you break the formatting, the preview build fails and nothing goes live. Nothing you do
here can take the site down.

## Which file to edit

| To change… | Edit this file |
| --- | --- |
| Executive board (new term, new photo, new LinkedIn) | `src/data/exec-board.json` |
| Committee heads | `src/data/committee-heads.json` |
| Rush schedule, application link, open or closed | `src/data/rush.json` |
| Companies brothers work at, sponsors | `src/data/employers.json` |
| Mission and core values | `src/data/about.json` |
| Instagram or LinkedIn links, contact form, address | `src/data/site.json` |

## Common changes

**New exec board.** In `exec-board.json`, change `"term"` (for example to `"Spring 2027"`) and
edit each person's `name`, `role` and `linkedin`. For photos, send headshots to the Tech
Committee; they'll add them to `public/images` and set `photo` for you.

**Open rush.** In `rush.json`, set `"term"`, replace the `events` list with the new schedule,
update `applicationUrl` and `applicationDeadline`, then set `"isOpen": true`. Set it back to
`false` when rush closes.

**Add a sponsor.** In `employers.json`, add the company name to `"sponsors"`, for example
`"sponsors": ["Acme Corp"]`.

## What never goes on the site

Phone numbers, personal emails, addresses, or anything from the member or alumni
directories. Those belong behind the member login only.

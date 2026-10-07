# AKPsi Purdue: chapter website

The new website for Alpha Kappa Psi, Pi Omega Chapter, replacing the Wix site at
[akpsipurdue.com](https://www.akpsipurdue.com). Built with Next.js and Tailwind CSS,
hosted on Vercel, owned by the chapter's GitHub organization.

**Status:** in development on a Vercel preview link. Target launch is **Dec 7, 2026**.
The full plan lives in the migration plan doc (ask the Tech Committee Head for the link).

## Get started (about 15 minutes)

You need [Node.js 22+](https://nodejs.org) and Git.

```bash
git clone https://github.com/<chapter-org>/akpsi-purdue-site.git
cd akpsi-purdue-site
npm install
npm run dev
```

Open http://localhost:3000. Edits to any file reload the page automatically.

New to Next.js? Do the official [Next.js tutorial](https://nextjs.org/learn) first. Then read
[CONTRIBUTING.md](CONTRIBUTING.md) before opening your first pull request.

## Where things live

```
src/
  app/                 One folder per page. page.tsx in each folder is the page.
    page.tsx           Home (/)
    about/             /about
    members/           /members: executive board + committee heads
    media/             /media: rush video + Instagram
    rush/              /rush
    sponsors/          /sponsors
    contact/           /contact
    portal/            /portal: member sign-in (placeholder until spring)
    layout.tsx         Header, footer, fonts, site-wide metadata
    globals.css        Brand colors (navy and gold) and fonts
  components/          Shared pieces: header, footer, page header, person card
  data/                ALL page content as JSON. Edit these, not the pages.
scripts/
  pull-wix-images.mjs  Copies headshots off Wix before the plan is cancelled
docs/
  TASKS.md             The starter task list. Pick one up here.
  editing-content.md   Guide for officers updating members, rush and sponsors
next.config.ts         Redirects from old Wix URLs, image settings
```

## Content rules

- **Content lives in `src/data/*.json`.** A new pledge class or exec board means
  editing one JSON file, not a page. See [docs/editing-content.md](docs/editing-content.md).
- **No personal contact info in this repo or on public pages.** No phone numbers or
  personal emails, ever. Member and alumni directories go behind the portal login.
- **No large files.** Videos go on YouTube (unlisted) and get embedded. Photos should be
  under 500 KB each.
- **No payments or ads on the site.** Vercel's free Hobby plan only allows
  non-commercial use. Dues stay on the existing payment platform.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server at localhost:3000 |
| `npm run build` | Production build; run before opening a PR |
| `npm run lint` | Check code style |
| `npm run images:pull` | Download Wix-hosted photos into `public/images` |

## Deploys

Every push to any branch gets its own Vercel preview link, posted on the pull request.
Merging into `main` updates the main preview link. The public domain points here only
after exec signs off at launch.

## Handoff

This repo, the Vercel project and the domain registrar all belong to the shared chapter
tech account, never a personal one. When you hand off the Tech Chair role, transfer
GitHub org ownership and update this README.

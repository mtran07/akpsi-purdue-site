# Contributing

How the Technology Committee works on this site. It's short on purpose; ask in the
committee group chat if anything is unclear.

## The workflow

1. **Pick a task** from [docs/TASKS.md](docs/TASKS.md), or a GitHub issue once they're
   set up. Put your name on it so nobody doubles up.
2. **Make a branch** off `main`, named for the task:
   ```bash
   git checkout main && git pull
   git checkout -b rush-video-embed
   ```
3. **Build it.** Run `npm run dev` and check the page at phone width as well
   (Chrome DevTools → device toolbar → iPhone). Most rush traffic comes from Instagram on phones.
4. **Check it** before you push:
   ```bash
   npm run lint
   npm run build
   ```
5. **Open a pull request** into `main`. Fill in the template. Vercel posts a preview link
   on the PR within a couple of minutes.
6. **Get one review.** Another committee member opens the preview link, clicks around, and
   approves. Then merge.

Never push directly to `main`.

## Conventions

- **Content goes in `src/data/`, not in page files.** If you find yourself typing a person's
  name, a date or a company into a `.tsx` file, it belongs in a JSON file instead.
- **Reuse components** in `src/components/` before writing new ones. If a piece of UI shows
  up on two pages, make it a component.
- **Use the brand colors** from `globals.css` (`bg-navy`, `text-gold`, `bg-paper-alt`, and so
  on) rather than new hex values.
- **Every image needs alt text** describing what's in it.
- **Keep PRs small.** One page or one feature per PR is easier to review than a week of work.

## Next.js version note

This project uses Next.js 16. Some APIs differ from tutorials you'll find online. The
installed docs at `node_modules/next/dist/docs/` match the exact version we use, so check
there when something doesn't work the way a blog post says it should.

## Getting help

Stuck for more than 30 minutes? Post in the committee chat with what you tried and the
error message. That's expected, not a failure.

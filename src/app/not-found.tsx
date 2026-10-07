import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">404</p>
      <h1 className="mt-3 font-display text-4xl font-bold text-navy">Page not found</h1>
      <p className="mt-4 text-muted">That page may have moved when we rebuilt the site.</p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-deep"
      >
        Back to home
      </Link>
    </section>
  );
}

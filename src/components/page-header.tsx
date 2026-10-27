type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  intro?: string;
};

export function PageHeader({ eyebrow, title, intro }: PageHeaderProps) {
  return (
    <section className="bg-navy text-white">
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pt-16">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{eyebrow}</p>
        )}
        <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-lg text-white/80">{intro}</p>}
      </div>
    </section>
  );
}

export function Section({
  id,
  title,
  children,
  tone = "plain",
}: {
  id?: string;
  title?: string;
  children: React.ReactNode;
  tone?: "plain" | "alt";
}) {
  return (
    <section id={id} className={tone === "alt" ? "bg-paper-alt" : "bg-paper"}>
      <div className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
        {title && <h2 className="reveal font-display text-2xl font-bold text-navy sm:text-3xl">{title}</h2>}
        <div className={title ? "mt-8" : ""}>{children}</div>
      </div>
    </section>
  );
}

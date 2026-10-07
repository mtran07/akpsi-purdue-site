import Image from "next/image";

type PersonCardProps = {
  name: string;
  role: string;
  photo?: string;
  linkedin?: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

export function PersonCard({ name, role, photo, linkedin }: PersonCardProps) {
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="relative aspect-[4/5] bg-navy/5">
        {photo ? (
          <Image
            src={photo}
            alt={`Headshot of ${name}`}
            fill
            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-4xl text-navy/40">
            {initials(name)}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-ink">{name}</h3>
        <p className="mt-0.5 text-sm text-muted">{role}</p>
        {linkedin && (
          <a
            href={linkedin}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm font-medium text-navy underline-offset-4 hover:underline"
          >
            LinkedIn
          </a>
        )}
      </div>
    </article>
  );
}

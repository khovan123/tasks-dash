import type { LucideIcon } from "lucide-react";
import { ExternalLink, Link2 } from "lucide-react";

export function WorkItemPropertyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-13 items-center justify-between gap-4 rounded-xl border px-4 py-3">
      <span className="shrink-0 whitespace-nowrap text-sm font-medium text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center justify-end">{children}</div>
    </div>
  );
}

export function ResourceLinksCard({
  title,
  icon: Icon,
  links,
  fallbackLabel,
}: {
  title: string;
  icon: LucideIcon;
  links?: Array<{ label: string; url: string }>;
  fallbackLabel: string;
}) {
  if (!links?.length) return null;

  return (
    <div className="rounded-xl border px-4 py-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" /> {title}
      </p>
      <div className="flex flex-col gap-1.5">
        {links.map((link) => (
          <a
            key={`${link.url}-${link.label}`}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg border bg-muted/10 px-3 py-2 text-sm font-medium transition hover:bg-muted/30"
          >
            <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{link.label || fallbackLabel}</span>
            <ExternalLink className="ml-auto size-3 shrink-0 text-muted-foreground" />
          </a>
        ))}
      </div>
    </div>
  );
}

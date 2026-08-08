import { ExternalLink } from "lucide-react";

export interface ExternalLinkItem {
  label?: string;
  url: string;
}

export function ExternalLinkList({
  links,
  fallbackLabel,
}: {
  links?: ExternalLinkItem[];
  fallbackLabel: string;
}) {
  if (!links?.length) return <span>—</span>;

  return (
    <div className="grid gap-1">
      {links.map((link, index) => (
        <a
          className="inline-flex items-center gap-1 text-primary hover:underline"
          key={`${link.url}-${index}`}
          href={link.url}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink className="size-3" />
          {link.label || `${fallbackLabel} ${index + 1}`}
        </a>
      ))}
    </div>
  );
}

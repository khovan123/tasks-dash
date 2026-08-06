import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Scale, BadgeCheck, ArrowRight } from "lucide-react";
import { PublicInfoPage } from "@/components/public-info-page";

export const metadata: Metadata = {
  title: "Legal | Tasks Dash",
  description: "Legal, privacy, and verification resources for Tasks Dash.",
};

const LEGAL_LINKS = [
  {
    href: "/terms-of-service",
    title: "Terms of Service",
    description:
      "Usage terms for Tasks Dash, including integrations, automation, and workspace operations.",
    icon: Scale,
  },
  {
    href: "/privacy-policy",
    title: "Privacy Policy",
    description:
      "How Tasks Dash handles workspace identity, integration metadata, and operational records.",
    icon: ShieldCheck,
  },
  {
    href: "/verify-user",
    title: "Verify User",
    description:
      "Public verification and linked-role guidance for Discord integration review flows.",
    icon: BadgeCheck,
  },
] as const;

export default function LegalPage() {
  return (
    <PublicInfoPage
      eyebrow="Legal Hub"
      title="Legal, Privacy, And Verification"
      summary="This hub centralizes the public policy and verification pages used by Tasks Dash for platform reviews, user trust, and third-party integration checks."
    >
      <div className="space-y-6">
        <p className="text-sm leading-7 text-muted-foreground sm:text-base">
          Use the links below to review Tasks Dash legal terms, privacy
          practices, and Discord verification guidance. These pages are kept
          public so reviewers, administrators, and end users can validate the
          integration posture of the application.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {LEGAL_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-[1.75rem] border border-border bg-card/80 p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl"
              >
                <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
                  <Icon className="size-5" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  {item.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {item.description}
                </p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Open page
                  <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </PublicInfoPage>
  );
}

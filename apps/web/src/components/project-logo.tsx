"use client";

import { Avatar, Style } from "@dicebear/core";
import definition from "@dicebear/styles/squircles.json";
import { cn } from "@/lib/utils";

const style = new Style(definition);

interface ProjectLogoProps {
  projectKey: string;
  projectName: string;
  size?: number;
  className?: string;
}

export function ProjectLogo({
  projectKey,
  projectName,
  size = 40,
  className,
}: ProjectLogoProps) {
  const avatar = new Avatar(style, {
    seed: `${projectKey}:${projectName}`,
    size,
  });

  return (
    <img
      src={avatar.toDataUri()}
      alt={`${projectName} logo`}
      width={size}
      height={size}
      className={cn("shrink-0 select-none", className)}
      draggable={false}
    />
  );
}

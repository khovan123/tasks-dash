import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function FormCard({
  title,
  description,
  children,
  footer,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card className="glass-card border-border/70 bg-card/90 shadow-xl backdrop-blur-2xl">
      <CardHeader className="flex flex-col gap-2">
        <CardTitle className="font-heading text-2xl font-extrabold gradient-title">
          {title}
        </CardTitle>
        {description ? (
          <CardDescription className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-5">{children}</CardContent>
      {footer ? (
        <CardFooter className="mt-2 gap-3 border-t pt-4">{footer}</CardFooter>
      ) : null}
    </Card>
  );
}

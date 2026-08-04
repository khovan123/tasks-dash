import { Github, MailWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = Boolean(token && token.length >= 20 && token.length <= 256);
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-lg border-primary/20 shadow-xl shadow-primary/10">
        <CardHeader className="items-center text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary text-lg font-black text-primary-foreground">
            TD
          </div>
          <Badge variant={valid ? "purple" : "destructive"}>
            WORKSPACE INVITATION
          </Badge>
          <CardTitle className="text-3xl">Tham gia Tasks Dash</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            {valid
              ? "Đăng nhập bằng GitHub có email đã được mời. Lời mời chỉ được sử dụng một lần."
              : "Link lời mời không hợp lệ hoặc đã bị cắt mất token."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          {valid ? (
            <Button asChild size="lg">
              <a href={`/api/auth/github/login?invite=${encodeURIComponent(token!)}`}>
                <Github /> Tiếp tục với GitHub
              </a>
            </Button>
          ) : (
            <MailWarning className="size-12 text-destructive" />
          )}
        </CardContent>
        <CardFooter className="justify-center text-center text-sm text-muted-foreground">
          Email GitHub đã xác minh phải trùng chính xác với email trong lời mời.
        </CardFooter>
      </Card>
    </main>
  );
}

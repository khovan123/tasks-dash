import { Boxes } from "lucide-react";
import { WorkspaceCreateForm } from "@/components/workspace-create-form";
import { AppPage } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NewWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  const { setup } = await searchParams;
  const firstWorkspace = Boolean(setup);

  return (
    <AppPage className={firstWorkspace ? "max-w-3xl py-10" : undefined}>
      {firstWorkspace ? (
        <Card className="border-primary/20 bg-card/95 shadow-xl shadow-primary/10">
          <CardHeader className="items-center text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <Boxes className="size-7" />
            </div>
            <Badge variant="purple">GITHUB ACCOUNT ĐÃ XÁC THỰC</Badge>
            <CardTitle className="text-3xl">Tạo workspace đầu tiên</CardTitle>
            <CardDescription className="max-w-xl text-base leading-relaxed">
              Bạn chưa thuộc workspace nào. Hãy đặt tên bắt buộc cho workspace
              đầu tiên trước khi vào dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkspaceCreateForm
              setupToken={setup}
              firstWorkspace
            />
          </CardContent>
        </Card>
      ) : (
        <WorkspaceCreateForm />
      )}
    </AppPage>
  );
}

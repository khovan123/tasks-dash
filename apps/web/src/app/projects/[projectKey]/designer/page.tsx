import Link from "next/link";
import { Figma } from "lucide-react";
import { DesignerCatalogManager } from "@/components/designer-catalog-manager";
import { apiData } from "@/lib/server/api-data";
import {
  AppNav,
  AppPage,
  AppTopbar,
  PageHero,
} from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface DesignCatalogItem {
  _id: string;
  name: string;
  type: string;
  figmaUrl: string;
  description: string;
  tags: string[];
}

export default async function DesignerPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const items = await apiData<DesignCatalogItem[]>(
    `/projects/${key}/design-catalog`,
  );
  return (
    <AppPage>
      <AppTopbar>
        <Button asChild variant="ghost"><Link href={`/projects/${key}`}>← {key}</Link></Button>
        <AppNav>
          <Button asChild variant="ghost" size="sm"><Link href={`/projects/${key}/backlog`}>Backlog</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link href={`/projects/${key}/automations`}>Automation</Link></Button>
        </AppNav>
      </AppTopbar>
      <PageHero
        eyebrow="Project design system"
        title="Designer Catalog"
        description={`Catalog này thuộc riêng project ${key}; thành viên vẫn được quản lý ở cấp workspace.`}
        aside={<Figma className="size-14 text-primary" />}
      />
      <DesignerCatalogManager projectKey={key} items={items} />
    </AppPage>
  );
}

import Link from "next/link";
import { DesignerCatalogManager } from "@/components/designer-catalog-manager";
import { apiData } from "@/lib/server/api-data";
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
    <main className="app-page">
      <header className="topbar"><Link href={`/projects/${key}`}>← {key}</Link><nav><Link href={`/projects/${key}/backlog`}>Backlog</Link><Link href={`/projects/${key}/automations`}>Automation</Link></nav></header>
      <section className="hero-panel"><div><span className="eyebrow">PROJECT DESIGN SYSTEM</span><h1>Designer Catalog</h1><p>Catalog này thuộc riêng project {key}; thành viên vẫn được quản lý ở cấp workspace.</p></div></section>
      <DesignerCatalogManager projectKey={key} items={items} />
    </main>
  );
}

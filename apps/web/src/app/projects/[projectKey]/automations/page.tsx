import Link from "next/link";
import { apiData } from "@/lib/server/api-data";
import { AutomationCreateForm } from "@/components/automation-create-form";

export const dynamic = "force-dynamic";

interface AutomationRule {
  _id: string;
  name: string;
  enabled: boolean;
  trigger: string;
  executionMode: string;
  runCount: number;
  lastRunAt?: string;
  lastResult?: string;
  lastError?: string;
}

export default async function AutomationsPage({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const rules = await apiData<AutomationRule[]>(`/projects/${key}/automations`);

  return (
    <main className="app-page">
      <header className="topbar"><Link href={`/projects/${key}`}>← {key}</Link><Link href="/settings/integrations">Tích hợp</Link></header>
      <section className="hero-panel"><div><span className="eyebrow">REAL EXECUTION ENGINE</span><h1>Automation · {key}</h1><p>Rules được lưu trong MongoDB và chạy bởi webhook hoặc scheduler thật.</p></div></section>
      <section className="data-card">
        <div className="section-heading"><div><span>AUTOMATION RULES</span><h2>Rules hiện tại</h2></div><strong>{rules.length}</strong></div>
        {rules.length === 0 ? <p className="empty-inline">Chưa có automation rule.</p> : <div className="rule-list">{rules.map((rule) => <article className="rule-row" key={rule._id}><div><strong>{rule.name}</strong><span>{rule.trigger} · {rule.executionMode}</span></div><div><strong>{rule.lastResult ?? "Chưa chạy"}</strong><span>{rule.runCount} lần chạy</span></div>{rule.lastError ? <p className="error">{rule.lastError}</p> : null}</article>)}</div>}
      </section>
      <AutomationCreateForm projectKey={key} />
    </main>
  );
}

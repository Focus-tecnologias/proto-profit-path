import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  money,
  useJobs,
  usePartners,
  useSettings,
  useUpdatePartner,
  useUpdateSettings,
} from "@/lib/farm";

export const Route = createFileRoute("/revenue")({
  head: () => ({
    meta: [
      { title: "Receita e Sócios — PrintHub Manager" },
      {
        name: "description",
        content:
          "Faturamento, custos, lucro líquido e divisão de resultados entre os sócios da fazenda de impressão.",
      },
      { property: "og:title", content: "Receita e Sócios — PrintHub Manager" },
      {
        property: "og:description",
        content: "Faturamento, lucro líquido e divisão de resultados entre sócios.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Revenue,
});

const palette = ["var(--primary)", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e"];

function Revenue() {
  const { data: jobs = [] } = useJobs();
  const { data: partners = [] } = usePartners();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "R$";
  const updatePartner = useUpdatePartner();
  const updateSettings = useUpdateSettings();

  const { revenue, costs, profit } = useMemo(() => {
    const done = jobs.filter((j) => j.status === "completed");
    const revenue = done.reduce((s, j) => s + Number(j.total_price), 0);
    const costs = done.reduce(
      (s, j) => s + Number(j.material_cost) + Number(j.energy_cost) + Number(j.setup_fee),
      0,
    );
    return { revenue, costs, profit: revenue - costs };
  }, [jobs]);

  const pie = partners.map((p) => ({
    name: p.partner_name,
    value: (profit * Number(p.share_percentage)) / 100,
  }));

  return (
    <AppShell
      title="Receita e Sócios"
      subtitle="Quanto entrou, quanto custou e quanto cabe a cada sócio."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Card label="Faturamento bruto" value={money(revenue, currency)} tone="text-primary" />
        <Card label="Custos totais" value={money(costs, currency)} tone="text-amber-accent" />
        <Card label="Lucro líquido" value={money(profit, currency)} tone="text-emerald-accent" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="panel lg:col-span-3">
          <header className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold">Divisão entre sócios</h2>
          </header>
          <ul className="divide-y divide-border">
            {partners.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-sm font-medium">{p.partner_name}</p>
                  <p className="num text-xs text-emerald-accent">
                    {money((profit * Number(p.share_percentage)) / 100, currency)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="num w-24"
                    value={Number(p.share_percentage)}
                    onChange={(e) =>
                      updatePartner.mutate({ id: p.id, share: Number(e.target.value) || 0 })
                    }
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </li>
            ))}
            {partners.length === 0 ? (
              <li className="px-5 py-10 text-sm text-muted-foreground">
                Nenhum sócio cadastrado.
              </li>
            ) : null}
          </ul>
        </section>

        <section className="panel lg:col-span-2">
          <header className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold">Distribuição do lucro</h2>
          </header>
          <div className="h-[260px] p-4">
            {pie.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85}>
                    {pie.map((_, i) => (
                      <Cell key={i} fill={palette[i % palette.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(v: number) => money(Number(v), currency)}
                    contentStyle={{
                      background: "var(--surface-raised)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="pt-16 text-center text-sm text-muted-foreground">
                Sem sócios para exibir.
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="panel mt-6 p-6">
        <h2 className="text-base font-semibold">Configurações da fazenda</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="kwh">Preço do kWh</Label>
            <Input
              id="kwh"
              type="number"
              step={0.01}
              min={0}
              value={Number(settings?.kwh_price ?? 0.75)}
              onChange={(e) => updateSettings.mutate({ kwh_price: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cur">Moeda</Label>
            <Input
              id="cur"
              value={currency}
              onChange={(e) => updateSettings.mutate({ currency: e.target.value })}
            />
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="panel p-5">
      <p className="label-tag">{label}</p>
      <p className={`num mt-3 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

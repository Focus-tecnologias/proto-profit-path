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
import { CircleDollarSign, TrendingUp, Wallet, Settings, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { HudCard } from "@/components/HudCard";
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
      { title: "Divisão de Receitas — Focus Lab" },
      {
        name: "description",
        content:
          "Acompanhe o faturamento total, deduza custos e veja o lucro líquido dividido por sócio.",
      },
      { property: "og:title", content: "Divisão de Receitas — Focus Lab" },
      {
        property: "og:description",
        content: "Acompanhe o faturamento total, deduza custos e veja o lucro líquido dividido por sócio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Revenue,
});

const palette = [
  "#ff6600", // Laser Orange
  "#ff8833", // Bright Amber-Orange
  "#f59e0b", // Warm Amber
  "#10b981", // Emerald
  "#64748b", // Slate
];

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
      title="Divisão de Receitas"
      subtitle="Acompanhe o faturamento total, deduza custos e veja o lucro líquido dividido por sócio."
      icon={CircleDollarSign}
    >
      {/* Top Financial Strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="apple-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Faturamento total
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-[#ff6600]/10 text-primary">
              <CircleDollarSign className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {money(revenue, currency)}
          </p>
          <span className="text-xs text-muted-foreground">Receita bruta consolidada</span>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Custos recuperados
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
              <Wallet className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-orange-400">
            {money(costs, currency)}
          </p>
          <span className="text-xs text-muted-foreground">Filamento + Energia + Setup</span>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Lucro líquido
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-400">
            {money(profit, currency)}
          </p>
          <span className="text-xs text-emerald-400">Disponível para divisão</span>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        {/* Left Partner Split (7 Cols) */}
        <section className="space-y-4 lg:col-span-7">
          <HudCard
            tag="DIVISÃO"
            title="Sócios e divisões"
            icon={Users}
          >
            <ul className="space-y-3 pt-1">
              {partners.map((p) => {
                const partnerProfit = (profit * Number(p.share_percentage)) / 100;
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-[#14151b]/70 p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {p.partner_name}
                      </p>
                      <p className="text-sm font-semibold text-emerald-400 mt-0.5">
                        {money(partnerProfit, currency)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Cota:</span>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        className="h-8 w-20 rounded-lg border-white/10 bg-black/40 text-right font-mono text-xs font-semibold text-white"
                        value={Number(p.share_percentage)}
                        onChange={(e) =>
                          updatePartner.mutate({ id: p.id, share: Number(e.target.value) || 0 })
                        }
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </li>
                );
              })}
              {partners.length === 0 && (
                <li className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-xs text-muted-foreground">
                  Nenhum sócio cadastrado.
                </li>
              )}
            </ul>
          </HudCard>
        </section>

        {/* Right Donut Chart (5 Cols) */}
        <section className="space-y-4 lg:col-span-5">
          <HudCard
            tag="GRÁFICO"
            title="Distribuição do lucro"
            icon={TrendingUp}
          >
            <div className="h-[240px] p-2">
              {pie.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      stroke="#08090c"
                      strokeWidth={2}
                    >
                      {pie.map((_, i) => (
                        <Cell key={i} fill={palette[i % palette.length]} />
                      ))}
                    </Pie>
                    <Legend
                      wrapperStyle={{
                        fontSize: 12,
                        fontFamily: "Inter, sans-serif",
                        color: "#fafafa",
                      }}
                    />
                    <Tooltip
                      formatter={(v: number) => money(Number(v), currency)}
                      contentStyle={{
                        background: "#14151b",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12,
                        fontFamily: "Inter, sans-serif",
                        fontSize: 12,
                        color: "#fafafa",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="pt-16 text-center text-xs text-muted-foreground">
                  Sem dados de sócios para exibir.
                </p>
              )}
            </div>
          </HudCard>
        </section>
      </div>

      {/* Farm Global Configuration Settings */}
      <div className="mt-8">
        <HudCard
          tag="PARÂMETROS"
          title="Configurações gerais"
          icon={Settings}
        >
          <div className="grid gap-4 pt-1 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="kwh" className="text-xs font-medium text-muted-foreground">
                Preço da energia por kWh ({currency})
              </Label>
              <Input
                id="kwh"
                type="number"
                step={0.01}
                min={0}
                value={Number(settings?.kwh_price ?? 0.75)}
                onChange={(e) => updateSettings.mutate({ kwh_price: Number(e.target.value) || 0 })}
                className="apple-input h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cur" className="text-xs font-medium text-muted-foreground">
                Símbolo da moeda
              </Label>
              <Input
                id="cur"
                value={currency}
                onChange={(e) => updateSettings.mutate({ currency: e.target.value })}
                className="apple-input h-10 rounded-xl"
              />
            </div>
          </div>
        </HudCard>
      </div>
    </AppShell>
  );
}

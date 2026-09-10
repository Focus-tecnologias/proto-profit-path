import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Boxes,
  CircleDollarSign,
  Printer as PrinterIcon,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { StatusPill } from "@/components/StatusPill";
import { money, useFilaments, useJobs, usePrinters, useSettings } from "@/lib/farm";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel da Fabrica — PrintHub Manager" },
      {
        name: "description",
        content:
          "Visão em tempo real da sua fabrica de impressão 3D: status das máquinas, receita, trabalhos ativos e estoque de filamento.",
      },
      { property: "og:title", content: "Painel da Fabrica — PrintHub Manager" },
      {
        property: "og:description",
        content: "Visão em tempo real de máquinas, receita, trabalhos ativos e estoque.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  hint?: string;
  tone: string;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between">
        <span className="label-tag">{label}</span>
        <Icon className={`size-4 ${tone}`} />
      </div>
      <p className="num mt-3 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Dashboard() {
  const { data: printers = [] } = usePrinters();
  const { data: jobs = [] } = useJobs();
  const { data: filaments = [] } = useFilaments();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "R$";

  const completed = jobs.filter((j) => j.status === "completed");
  const revenue = completed.reduce((s, j) => s + Number(j.total_price), 0);
  const costs = completed.reduce(
    (s, j) => s + Number(j.material_cost) + Number(j.energy_cost) + Number(j.setup_fee),
    0,
  );
  const active = jobs.filter((j) => j.status === "printing" || j.status === "queued");
  const stock = filaments.reduce((s, f) => s + Number(f.remaining_g), 0);

  const chart = filaments.map((f) => ({
    name: `${f.material}`,
    grams: Number(f.remaining_g),
    fill: f.color_hex,
  }));

  return (
    <AppShell
      title="Painel da Fabrica"
      subtitle="Operação em tempo real de cada máquina, bobina e trabalho aberto."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={CircleDollarSign}
          label="Faturamento bruto"
          value={money(revenue, currency)}
          hint={`${completed.length} trabalhos concluídos`}
          tone="text-emerald-accent"
        />
        <Stat
          icon={TrendingUp}
          label="Lucro líquido"
          value={money(revenue - costs, currency)}
          hint={`${money(costs, currency)} em custos recuperados`}
          tone="text-cyan-accent"
        />
        <Stat
          icon={Activity}
          label="Trabalhos ativos"
          value={String(active.length)}
          hint={`${jobs.filter((j) => j.status === "quote").length} orçamentos abertos`}
          tone="text-amber-accent"
        />
        <Stat
          icon={Boxes}
          label="Filamento em estoque"
          value={`${(stock / 1000).toFixed(2)} kg`}
          hint={`${filaments.length} bobinas monitoradas`}
          tone="text-primary"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="panel lg:col-span-3">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold">Chão de fábrica</h2>
            <Link to="/printers" className="text-xs text-primary hover:underline">
              Gerenciar impressoras
            </Link>
          </header>
          <ul className="divide-y divide-border">
            {printers.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <PrinterIcon className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.model}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="num hidden text-xs text-muted-foreground sm:block">
                    {p.kwh_consumption} W
                  </span>
                  <StatusPill status={p.status} />
                </div>
              </li>
            ))}
            {printers.length === 0 ? (
              <li className="px-5 py-8 text-sm text-muted-foreground">Nenhuma impressora cadastrada.</li>
            ) : null}
          </ul>
        </section>

        <section className="panel lg:col-span-2">
          <header className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold">Nível das bobinas</h2>
          </header>
          <div className="h-[260px] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  cursor={{ fill: "var(--accent)" }}
                  contentStyle={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="grams" radius={[4, 4, 0, 0]}>
                  {chart.map((c, i) => (
                    <Cell key={i} fill={c.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="panel mt-6">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Últimos trabalhos</h2>
          <Link to="/queue" className="text-xs text-primary hover:underline">
            Abrir fila de produção
          </Link>
        </header>
        <ul className="divide-y divide-border">
          {jobs.slice(0, 6).map((j) => (
            <li key={j.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-medium">{j.job_name}</p>
                <p className="text-xs text-muted-foreground">{j.customer_name || "—"}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="num text-sm">{money(Number(j.total_price), currency)}</span>
                <StatusPill status={j.status} />
              </div>
            </li>
          ))}
          {jobs.length === 0 ? (
            <li className="px-5 py-8 text-sm text-muted-foreground">
              Nenhum trabalho ainda — comece pelo{" "}
              <Link to="/estimator" className="text-primary hover:underline">
                orçamentador
              </Link>
              .
            </li>
          ) : null}
        </ul>
      </section>
    </AppShell>
  );
}

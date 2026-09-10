import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Box, CircleAlert, Clock3, Gauge, Plus, Printer as PrinterIcon, Zap } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { StatusPill } from "@/components/StatusPill";
import bambuP1s from "@/assets/printer-bambu-p1s.jpg";
import enderS1 from "@/assets/printer-ender-s1.jpg";
import prusaMk3s from "@/assets/printer-prusa-mk3s.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  money,
  useCreatePrinter,
  useJobs,
  usePrinters,
  useSettings,
  useUpdatePrinter,
  type PrinterStatus,
} from "@/lib/farm";

export const Route = createFileRoute("/printers")({
  head: () => ({
    meta: [
      { title: "Impressoras — PrintHub Manager" },
      {
        name: "description",
        content:
          "Cadastre máquinas, defina consumo em watts e valor/hora e acompanhe o status de cada impressora.",
      },
      { property: "og:title", content: "Impressoras — PrintHub Manager" },
      {
        property: "og:description",
        content: "Máquinas, consumo elétrico, valor por hora e status em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Printers,
});

const empty = { name: "", model: "", kwh_consumption: 120, hourly_rate: 10, status: "idle" };

const printerModels = [
  { value: "Bambu Lab P1S", label: "Bambu Lab P1S", image: bambuP1s },
  { value: "Creality Ender 3 S1", label: "Creality Ender 3 S1", image: enderS1 },
  { value: "Prusa i3 MK3S+", label: "Prusa i3 MK3S+", image: prusaMk3s },
] as const;

function printerImage(model: string) {
  const normalized = model.toLowerCase();
  if (normalized.includes("ender") || normalized.includes("creality")) return enderS1;
  if (normalized.includes("prusa") || normalized.includes("mk3")) return prusaMk3s;
  return bambuP1s;
}

function Printers() {
  const { data: printers = [] } = usePrinters();
  const { data: jobs = [] } = useJobs();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "R$";
  const create = useCreatePrinter();
  const update = useUpdatePrinter();
  const [form, setForm] = useState(empty);
  const printing = printers.filter((printer) => printer.status === "printing").length;
  const available = printers.filter((printer) => printer.status === "idle").length;
  const errors = printers.filter((printer) => printer.status === "error").length;

  return (
    <AppShell title="Impressoras" subtitle={`${printers.length} dispositivos monitorados na rede de produção Fabruca.`}>
      <div className="mb-6 grid grid-cols-2 border border-border bg-surface sm:grid-cols-4">
        {[
          ["Total", printers.length, PrinterIcon, "text-foreground"],
          ["Em produção", printing, Zap, "text-primary"],
          ["Disponíveis", available, Gauge, "text-emerald-accent"],
          ["Com alerta", errors, CircleAlert, "text-rose-accent"],
        ].map(([label, value, Icon, tone], index) => {
          const MetricIcon = Icon as typeof PrinterIcon;
          return <div key={String(label)} className={`p-4 ${index ? "border-l border-border" : ""}`}>
            <div className="flex items-center justify-between"><span className="label-tag text-[9px]">{String(label)}</span><MetricIcon className={`size-4 ${String(tone)}`} /></div>
            <p className="num mt-2 text-2xl font-semibold">{String(value).padStart(2, "0")}</p>
          </div>;
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {printers.map((p, index) => {
            const done = jobs.filter((j) => j.assigned_printer_id === p.id && j.status === "completed");
            const current = jobs.find((j) => j.assigned_printer_id === p.id && j.status === "printing");
            const produced = done.reduce((s, j) => s + Number(j.total_price), 0);
            const elapsedHours = current ? Math.max(0, (Date.now() - new Date(current.created_at).getTime()) / 3_600_000) : 0;
            const progress = current ? Math.min(96, Math.max(6, (elapsedHours / Number(current.print_time_hours || 1)) * 100)) : 0;
            const remainingMinutes = current ? Math.max(1, Math.round((Number(current.print_time_hours) - elapsedHours) * 60)) : 0;
            return (
              <article key={p.id} className={`group relative overflow-hidden border bg-surface p-5 transition-colors ${p.status === "error" ? "border-rose-accent/30 hover:border-rose-accent/60" : "border-border hover:border-primary/45"}`}>
                <div className="relative -mx-5 -mt-5 mb-5 h-40 overflow-hidden border-b border-border bg-background">
                  <img src={printerImage(p.model)} alt={`Impressora ${p.model}`} loading="lazy" width={1200} height={912} className="h-full w-full object-cover object-center opacity-90 transition duration-300 group-hover:scale-[1.02] group-hover:opacity-100" />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
                  <span className="label-tag absolute bottom-3 left-5 text-[9px] text-primary">Node-{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div className="relative flex items-start justify-between gap-3">
                  <div><span className="label-tag text-[9px] text-primary">Node-{String(index + 1).padStart(2, "0")}</span><h2 className="mt-1 text-lg font-bold">{p.name}</h2><p className="mt-0.5 text-xs text-muted-foreground">{p.model}</p></div>
                  <StatusPill status={p.status} />
                </div>

                {current ? <div className="relative mt-7 space-y-4">
                  <div><div className="mb-2 flex justify-between text-xs"><span className="text-muted-foreground">{current.job_name}</span><span className="num">{progress.toFixed(1)}%</span></div><div className="h-1.5 overflow-hidden bg-muted"><div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${progress}%` }} /></div></div>
                  <div className="grid grid-cols-2 gap-2"><div className="border border-border bg-background/60 p-3"><p className="label-tag text-[8px]">Material</p><p className="mt-1 truncate text-xs font-semibold">{current.weight_grams} g</p></div><div className="border border-border bg-background/60 p-3"><p className="label-tag text-[8px]">Tempo restante</p><p className="num mt-1 text-xs font-semibold">~{Math.floor(remainingMinutes / 60)}h {remainingMinutes % 60}m</p></div></div>
                </div> : <div className="relative my-7 flex min-h-28 flex-col items-center justify-center border border-dashed border-border bg-background/30 text-center"><Box className="mb-2 size-8 text-muted-foreground/50" /><p className="label-tag text-[8px]">{p.status === "error" ? "Aguardando intervenção" : "Aguardando trabalho"}</p></div>}

                <div className="relative flex items-end justify-between border-t border-border pt-4">
                  <dl className="space-y-1 text-[11px]"><div className="flex gap-2"><dt className="text-muted-foreground">Consumo</dt><dd className="num">{p.kwh_consumption} W</dd></div><div className="flex gap-2"><dt className="text-muted-foreground">Produzido</dt><dd className="num text-emerald-accent">{money(produced, currency)}</dd></div></dl>
                  <Select value={p.status} onValueChange={(v) => update.mutate({ id: p.id, patch: { status: v as PrinterStatus } })}><SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="idle">Livre</SelectItem><SelectItem value="printing">Imprimindo</SelectItem><SelectItem value="error">Erro</SelectItem></SelectContent></Select>
                </div>
              </article>
            );
          })}
          {printers.length === 0 ? <div className="panel p-10 text-sm text-muted-foreground sm:col-span-2">Nenhuma impressora cadastrada ainda.</div> : null}
        </div>

        <section className="panel h-fit space-y-4 p-5 xl:sticky xl:top-7">
          <div className="border-b border-border pb-4"><span className="label-tag text-[9px] text-primary">Configuração</span><h2 className="mt-1 text-base font-semibold">Adicionar dispositivo</h2></div>
          <div className="space-y-2">
            <Label htmlFor="n">Nome</Label>
            <Input
              id="n"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Bancada 01"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m">Modelo</Label>
            <Select value={form.model} onValueChange={(model) => setForm({ ...form, model })}>
              <SelectTrigger id="m"><SelectValue placeholder="Selecione o modelo" /></SelectTrigger>
              <SelectContent>
                {printerModels.map((model) => <SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {form.model ? <div className="relative mt-3 aspect-[4/3] overflow-hidden border border-border bg-background"><img src={printerImage(form.model)} alt={`Prévia da ${form.model}`} loading="lazy" width={1200} height={912} className="h-full w-full object-cover" /><div className="absolute inset-x-0 bottom-0 bg-background/85 px-3 py-2 text-[10px] font-medium backdrop-blur">{form.model}</div></div> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="w">Consumo (W)</Label>
              <Input
                id="w"
                type="number"
                min={0}
                value={form.kwh_consumption}
                onChange={(e) =>
                  setForm({ ...form, kwh_consumption: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r">Valor/hora ({currency})</Label>
              <Input
                id="r"
                type="number"
                min={0}
                value={form.hourly_rate}
                onChange={(e) => setForm({ ...form, hourly_rate: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
          <Button
            className="w-full"
            disabled={create.isPending}
            onClick={async () => {
              if (!form.name.trim()) {
                toast.error("Informe o nome da impressora.");
                return;
              }
              await create.mutateAsync(form as never);
              toast.success("Impressora cadastrada.");
              setForm(empty);
            }}
          >
            <Plus className="size-4" /> Cadastrar impressora
          </Button>
          <div className="flex gap-2 border-t border-border pt-4 text-[10px] leading-relaxed text-muted-foreground"><Clock3 className="mt-0.5 size-3.5 shrink-0 text-primary" /><p>Cadastre potência e valor por hora para manter custos e capacidade sincronizados.</p></div>
        </section>
      </div>
    </AppShell>
  );
}

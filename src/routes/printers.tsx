import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Box, CircleAlert, Clock3, Plus, Printer as PrinterIcon, Zap } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { StatusPill } from "@/components/StatusPill";
import bambuA1Mini from "@/assets/printer-bambu-a1-mini.jpg";
import bambuP1s from "@/assets/printer-bambu-p1s.jpg";
import bambuX1Carbon from "@/assets/printer-bambu-x1-carbon.jpg";
import anycubicKobra2 from "@/assets/printer-anycubic-kobra2.jpg";
import crealityK1 from "@/assets/printer-creality-k1.jpg";
import enderV2Neo from "@/assets/printer-ender-v2-neo.jpg";
import enderS1 from "@/assets/printer-ender-s1.jpg";
import prusaMk3s from "@/assets/printer-prusa-mk3s.jpg";
import prusaMk4 from "@/assets/printer-prusa-mk4.jpg";
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
      { title: "Parque de Impressoras — Focus Lab" },
      {
        name: "description",
        content:
          "Cadastre e acompanhe o status de cada máquina na sua fazenda de impressão.",
      },
      { property: "og:title", content: "Parque de Impressoras — Focus Lab" },
      {
        property: "og:description",
        content: "Gestão do parque de máquinas e impressoras 3D.",
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
  { value: "Bambu Lab A1 mini", label: "Bambu Lab A1 mini", image: bambuA1Mini },
  { value: "Bambu Lab X1 Carbon", label: "Bambu Lab X1 Carbon", image: bambuX1Carbon },
  { value: "Creality Ender 3 S1", label: "Creality Ender 3 S1", image: enderS1 },
  { value: "Creality Ender 3 V2 Neo", label: "Creality Ender 3 V2 Neo", image: enderV2Neo },
  { value: "Creality K1", label: "Creality K1", image: crealityK1 },
  { value: "Prusa i3 MK3S+", label: "Prusa i3 MK3S+", image: prusaMk3s },
  { value: "Prusa i3 MK4", label: "Prusa i3 MK4", image: prusaMk4 },
  { value: "Anycubic Kobra 2", label: "Anycubic Kobra 2", image: anycubicKobra2 },
] as const;

function printerImage(model: string) {
  const match = printerModels.find((m) => m.value.toLowerCase() === model.toLowerCase());
  if (match) return match.image;
  const normalized = model.toLowerCase();
  if (normalized.includes("a1 mini")) return bambuA1Mini;
  if (normalized.includes("x1 carbon")) return bambuX1Carbon;
  if (normalized.includes("p1")) return bambuP1s;
  if (normalized.includes("v2 neo")) return enderV2Neo;
  if (normalized.includes("ender 3 s1")) return enderS1;
  if (normalized.includes("k1")) return crealityK1;
  if (normalized.includes("mk4")) return prusaMk4;
  if (normalized.includes("mk3")) return prusaMk3s;
  if (normalized.includes("kobra")) return anycubicKobra2;
  if (normalized.includes("ender") || normalized.includes("creality")) return enderS1;
  if (normalized.includes("prusa")) return prusaMk3s;
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
    <AppShell
      title="Parque de Impressoras"
      subtitle="Cadastre e acompanhe o status de cada máquina na sua fazenda de impressão."
      icon={PrinterIcon}
    >
      {/* Metric Cards Ribbon */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Total de máquinas", printers.length, PrinterIcon, "text-white"],
          ["Em produção", printing, Zap, "text-orange-400"],
          ["Disponíveis", available, Clock3, "text-emerald-400"],
          ["Com erro", errors, CircleAlert, errors > 0 ? "text-red-400" : "text-muted-foreground"],
        ].map(([label, value, Icon, tone]) => {
          const MetricIcon = Icon as typeof PrinterIcon;
          return (
            <div
              key={String(label)}
              className="apple-card p-4 rounded-2xl"
            >
              <div className="flex items-center justify-between">
                <span className="label-tag text-[9px] text-muted-foreground">{String(label)}</span>
                <MetricIcon className={`size-4 ${String(tone)}`} />
              </div>
              <p className="num mt-2 font-bold text-2xl text-white">
                {String(value).padStart(2, "0")}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Printers Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {printers.map((p, index) => {
            const done = jobs.filter((j) => j.assigned_printer_id === p.id && j.status === "completed");
            const current = jobs.find((j) => j.assigned_printer_id === p.id && j.status === "printing");
            const produced = done.reduce((s, j) => s + Number(j.total_price), 0);
            const elapsedHours = current ? Math.max(0, (Date.now() - new Date(current.created_at).getTime()) / 3_600_000) : 0;
            const progress = current ? Math.min(96, Math.max(6, (elapsedHours / Number(current.print_time_hours || 1)) * 100)) : 0;
            const remainingMinutes = current ? Math.max(1, Math.round((Number(current.print_time_hours) - elapsedHours) * 60)) : 0;

            return (
              <article
                key={p.id}
                className={`apple-card group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 ${
                  p.status === "error"
                    ? "border-red-500/40 bg-red-950/20"
                    : p.status === "printing"
                    ? "border-orange-500/40 bg-gradient-to-br from-orange-950/15 via-[#0e0f14]/85 to-[#0e0f14]/85 shadow-[0_0_25px_-5px_rgba(255,102,0,0.2)]"
                    : "border-white/[0.08] hover:border-white/20"
                }`}
              >
                {/* Cover Image */}
                <div className="relative -mx-5 -mt-5 mb-5 h-40 overflow-hidden border-b border-white/[0.06] bg-black/50">
                  <img
                    src={printerImage(p.model)}
                    alt={`Impressora ${p.model}`}
                    loading="lazy"
                    width={1200}
                    height={912}
                    className="h-full w-full object-cover object-center opacity-85 transition duration-300 group-hover:scale-105 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e0f14] via-transparent to-transparent" />
                  <span className="label-tag absolute bottom-3 left-4 rounded-md border border-primary/30 bg-background/80 px-2 py-0.5 text-[9px] text-primary backdrop-blur">
                    Node-{String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white">{p.name}</h2>
                    <p className="text-xs text-muted-foreground">{p.model}</p>
                  </div>
                  <StatusPill status={p.status} />
                </div>

                {current ? (
                  <div className="my-5 space-y-3 rounded-xl border border-orange-500/25 bg-orange-500/5 p-3.5">
                    <div>
                      <div className="mb-1.5 flex justify-between text-xs">
                        <span className="truncate text-orange-300 font-semibold">{current.job_name}</span>
                        <span className="num font-bold text-orange-400">{progress.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-[#ff3b00] animate-pulse"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-lg border border-white/5 bg-background/60 p-2.5">
                        <p className="label-tag text-[8px] text-muted-foreground">Material</p>
                        <p className="mt-0.5 truncate font-semibold text-white">{current.weight_grams} g</p>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-background/60 p-2.5">
                        <p className="label-tag text-[8px] text-muted-foreground">Tempo restante</p>
                        <p className="num mt-0.5 font-semibold text-orange-400">
                          ~{Math.floor(remainingMinutes / 60)}h {remainingMinutes % 60}m
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="my-5 flex min-h-24 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-3 text-center">
                    <Box className="mb-1.5 size-6 text-muted-foreground/40" />
                    <p className="label-tag text-[9px] text-muted-foreground">
                      {p.status === "error" ? "Aguardando intervenção" : "Aguardando trabalho"}
                    </p>
                  </div>
                )}

                <div className="flex items-end justify-between border-t border-white/[0.06] pt-4">
                  <dl className="space-y-1 text-xs">
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground">Consumo</dt>
                      <dd className="num font-semibold text-orange-400">{p.kwh_consumption} W</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground">Produzido</dt>
                      <dd className="num font-semibold text-emerald-accent">{money(produced, currency)}</dd>
                    </div>
                  </dl>
                  <Select
                    value={p.status}
                    onValueChange={(v) =>
                      update.mutate({ id: p.id, patch: { status: v as PrinterStatus } })
                    }
                  >
                    <SelectTrigger className="h-8 w-32 rounded-xl border-white/10 bg-[#16171f] text-xs font-medium text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#181922] text-xs">
                      <SelectItem value="idle">Livre</SelectItem>
                      <SelectItem value="printing">Imprimindo</SelectItem>
                      <SelectItem value="error">Falha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </article>
            );
          })}

          {printers.length === 0 && (
            <div className="apple-card p-10 text-center text-sm text-muted-foreground sm:col-span-2">
              Nenhuma impressora cadastrada ainda.
            </div>
          )}
        </div>

        {/* Right Add Machine Form */}
        <section className="apple-card h-fit space-y-4 p-5.5 xl:sticky xl:top-7">
          <div className="border-b border-white/[0.06] pb-3">
            <span className="label-tag text-[9px] text-primary">Configuração</span>
            <h2 className="mt-1 text-base font-semibold text-white">Adicionar dispositivo</h2>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="n" className="text-xs font-medium text-muted-foreground">Nome</Label>
            <Input
              id="n"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Bancada 01"
              className="rounded-xl border-white/10 bg-[#16171f] text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m" className="text-xs font-medium text-muted-foreground">Modelo</Label>
            <Select value={form.model} onValueChange={(model) => setForm({ ...form, model })}>
              <SelectTrigger id="m" className="rounded-xl border-white/10 bg-[#16171f] text-xs">
                <SelectValue placeholder="Selecione o modelo" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#181922] text-xs">
                {printerModels.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="w" className="text-xs font-medium text-muted-foreground">Consumo (W)</Label>
              <Input
                id="w"
                type="number"
                min={0}
                value={form.kwh_consumption}
                onChange={(e) =>
                  setForm({ ...form, kwh_consumption: Number(e.target.value) || 0 })
                }
                className="rounded-xl border-white/10 bg-[#16171f] text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r" className="text-xs font-medium text-muted-foreground">Valor/hora ({currency})</Label>
              <Input
                id="r"
                type="number"
                min={0}
                value={form.hourly_rate}
                onChange={(e) =>
                  setForm({ ...form, hourly_rate: Number(e.target.value) || 0 })
                }
                className="rounded-xl border-white/10 bg-[#16171f] text-xs"
              />
            </div>
          </div>

          <Button
            className="orange-btn w-full gap-2 py-2.5 text-xs font-semibold"
            disabled={create.isPending}
            onClick={async () => {
              if (!form.name.trim()) {
                toast.error("Informe o nome da impressora.");
                return;
              }
              await create.mutateAsync(form as never);
              toast.success("Impressora cadastrada com sucesso.");
              setForm(empty);
            }}
          >
            <Plus className="size-4" /> Cadastrar impressora
          </Button>

          <div className="flex gap-2.5 border-t border-white/[0.06] pt-3.5 text-[11px] leading-relaxed text-muted-foreground">
            <Clock3 className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <p>Cadastre potência e valor por hora para manter custos e capacidade sincronizados.</p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

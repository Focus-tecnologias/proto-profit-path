import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Sliders, Zap, Calculator } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { QuoteNoteDialog } from "@/components/QuoteNote";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  computeCosts,
  money,
  useCreateJob,
  useFilaments,
  usePrinters,
  useSettings,
} from "@/lib/farm";

export const Route = createFileRoute("/estimator")({
  head: () => ({
    meta: [
      { title: "Orçamento Comercial — Focus Lab" },
      {
        name: "description",
        content:
          "Simule custos com base no tempo de máquina, consumo de energia e margem desejada.",
      },
      { property: "og:title", content: "Orçamento Comercial — Focus Lab" },
      {
        property: "og:description",
        content: "Simulador de custos de manufatura 3D e precificação comercial.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Estimator,
});

function Estimator() {
  const navigate = useNavigate();
  const { data: filaments = [] } = useFilaments();
  const { data: printers = [] } = usePrinters();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "R$";
  const createJob = useCreateJob();

  const [jobName, setJobName] = useState("");
  const [customer, setCustomer] = useState("");
  const [filamentId, setFilamentId] = useState<string>("");
  const [printerId, setPrinterId] = useState<string>("");
  const [weight, setWeight] = useState(120);
  const [hours, setHours] = useState(3.5);
  const [margin, setMargin] = useState(40);
  const [setupFee, setSetupFee] = useState(15);

  const filament = filaments.find((f) => f.id === filamentId);
  const printer = printers.find((p) => p.id === printerId);

  const result = useMemo(
    () =>
      computeCosts({
        weightGrams: weight,
        costPerKg: Number(filament?.cost_per_kg ?? 120),
        printTimeHours: hours,
        printerWatts: Number(printer?.kwh_consumption ?? 300),
        kwhPrice: Number(settings?.kwh_price ?? 0.75),
        setupFee,
        profitMargin: margin,
      }),
    [weight, filament, hours, printer, settings, setupFee, margin],
  );

  const enoughStock = !filament || Number(filament.remaining_g) >= weight;

  async function submit() {
    if (!jobName.trim()) {
      toast.error("Preencha o nome do trabalho");
      return;
    }
    await createJob.mutateAsync({
      job_name: jobName.trim(),
      customer_name: customer.trim(),
      filament_id: filament?.id ?? null,
      weight_grams: weight,
      print_time_hours: hours,
      setup_fee: setupFee,
      material_cost: Number(result.materialCost.toFixed(2)),
      energy_cost: Number(result.energyCost.toFixed(2)),
      profit_margin: margin,
      total_price: Number(result.finalPrice.toFixed(2)),
      status: printerId ? "printing" : "queued",
      assigned_printer_id: printerId || null,
    });
    toast.success("Trabalho criado e adicionado à fila de produção.");
    navigate({ to: "/queue" });
  }

  return (
    <AppShell
      title="Orçamento Comercial"
      subtitle="Material + energia + mão de obra, com margem aplicada na hora. Envie direto para a fila ou exporte a nota."
      icon={Calculator}
    >
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Config Panel */}
        <section className="apple-card space-y-5 p-6 lg:col-span-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="job" className="text-xs font-medium text-muted-foreground">
                Nome do trabalho
              </Label>
              <Input
                id="job"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                placeholder="Gabinete v3"
                className="rounded-xl border-white/10 bg-[#16171f] text-sm focus-visible:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer" className="text-xs font-medium text-muted-foreground">
                Cliente
              </Label>
              <Input
                id="customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Acme Robótica"
                className="rounded-xl border-white/10 bg-[#16171f] text-sm focus-visible:border-primary"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Filamento</Label>
              <Select value={filament?.id ?? ""} onValueChange={setFilamentId}>
                <SelectTrigger className="rounded-xl border-white/10 bg-[#16171f] text-sm">
                  <SelectValue placeholder="Selecionar bobina" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#181922] text-sm">
                  {filaments.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full border border-white/20"
                          style={{ backgroundColor: f.color_hex }}
                        />
                        {f.material} · {f.brand} — {money(Number(f.cost_per_kg), currency)}/kg
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Impressora (opcional)</Label>
              <Select value={printerId} onValueChange={setPrinterId}>
                <SelectTrigger className="rounded-xl border-white/10 bg-[#16171f] text-sm">
                  <SelectValue placeholder="Deixar sem atribuir" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#181922] text-sm">
                  {printers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {p.model} ({p.kwh_consumption} W)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="w" className="text-xs font-medium text-muted-foreground">
                Peso (g)
              </Label>
              <Input
                id="w"
                type="number"
                min={0}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value) || 0)}
                className="rounded-xl border-white/10 bg-[#16171f] font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="h" className="text-xs font-medium text-muted-foreground">
                Tempo de impressão (h)
              </Label>
              <Input
                id="h"
                type="number"
                min={0}
                step={0.1}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value) || 0)}
                className="rounded-xl border-white/10 bg-[#16171f] font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s" className="text-xs font-medium text-muted-foreground">
                Preparo / mão de obra ({currency})
              </Label>
              <Input
                id="s"
                type="number"
                min={0}
                step={0.5}
                value={setupFee}
                onChange={(e) => setSetupFee(Number(e.target.value) || 0)}
                className="rounded-xl border-white/10 bg-[#16171f] font-mono text-sm"
              />
            </div>
          </div>

          {/* Margem de Lucro */}
          <div className="space-y-3 rounded-2xl border border-primary/30 bg-primary/[0.04] p-4.5 shadow-[0_0_20px_-5px_rgba(255,102,0,0.12)]">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold text-white">Margem de lucro</Label>
                <p className="text-[11px] text-muted-foreground">Ajuste o retorno sobre o custo operacional</p>
              </div>
              <span className="rounded-lg border border-primary/40 bg-primary/20 px-2.5 py-0.5 font-mono text-sm font-bold text-primary">
                +{margin}%
              </span>
            </div>
            <Slider
              value={[margin]}
              min={10}
              max={250}
              step={5}
              onValueChange={(v) => setMargin(v[0] ?? margin)}
              className="py-1"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/70">
              <span>10%</span>
              <span>100%</span>
              <span>250%</span>
            </div>
          </div>

          {!enoughStock ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
              A bobina selecionada tem apenas {filament?.remaining_g} g restantes — não é suficiente para este trabalho.
            </p>
          ) : null}
        </section>

        {/* Right Live Cost Breakdown */}
        <section className="apple-card h-fit space-y-4 p-6 lg:col-span-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Zap className="size-4" />
            <span>Detalhamento ao vivo</span>
          </div>

          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <dt>Material ({weight}g)</dt>
              <dd className="num font-semibold text-white">{money(result.materialCost, currency)}</dd>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <dt>Energia @ {settings?.kwh_price ?? 0.75}/kWh</dt>
              <dd className="num font-semibold text-white">{money(result.energyCost, currency)}</dd>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <dt>Preparo / mão de obra</dt>
              <dd className="num font-semibold text-white">{money(setupFee, currency)}</dd>
            </div>
            <div className="border-t border-white/[0.08] pt-3 flex items-center justify-between font-medium text-muted-foreground">
              <dt>Custo total</dt>
              <dd className="num font-semibold text-white">{money(result.totalCost, currency)}</dd>
            </div>
            <div className="flex items-center justify-between font-semibold text-emerald-accent">
              <dt>Lucro ({margin}%)</dt>
              <dd className="num">+{money(result.profit, currency)}</dd>
            </div>
          </dl>

          {/* Preço Final */}
          <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/20 via-[#14151c] to-[#14151c] p-5 shadow-[0_0_25px_-5px_rgba(255,102,0,0.25)]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Preço final</p>
            <p className="num mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {money(result.finalPrice, currency)}
            </p>
          </div>

          <Button
            className="orange-btn mt-2 w-full gap-2 py-3 text-xs"
            size="lg"
            onClick={submit}
            disabled={createJob.isPending}
          >
            <span>Criar trabalho e enviar à fila</span>
            <ArrowRight className="size-4" />
          </Button>

          <div className="pt-1">
            <QuoteNoteDialog
              quote={{
                jobName,
                customerName: customer,
                filament: filament ? `${filament.material} · ${filament.brand}` : "",
                printer: printer ? `${printer.name} · ${printer.model}` : "",
                weightGrams: weight,
                hours,
                setupFee,
                materialCost: result.materialCost,
                energyCost: result.energyCost,
                totalCost: result.totalCost,
                profit: result.profit,
                finalPrice: result.finalPrice,
                currency,
              }}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

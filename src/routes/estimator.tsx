import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Calculator,
  Zap,
  Tag,
  User,
  Layers,
  Printer as PrinterIcon,
  Weight,
  Clock,
  Coins,
  Percent,
  TrendingUp,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
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

const MARGIN_PRESETS = [20, 35, 50, 75, 100, 150];

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
      <div className="grid gap-5 lg:gap-6 lg:grid-cols-5">
        {/* Left Config Panel */}
        <section className="space-y-4 sm:space-y-5 rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#121316]/80 p-4 sm:p-6 backdrop-blur-xl shadow-xl lg:col-span-3">
          {/* Header Info */}
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 sm:pb-4">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#ff6600]/10 text-[#ff6600] border border-[#ff6600]/20">
                <Sparkles className="size-3.5" />
              </span>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                  Parâmetros de Produção
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Defina material, tempo e parâmetros de custos da peça
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-zinc-400">
              Precificação instantânea
            </span>
          </div>

          {/* Section 1: Job & Customer */}
          <div className="grid gap-3.5 sm:gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="job" className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <Tag className="size-3 text-zinc-400" />
                <span>Nome do trabalho / peça</span>
              </Label>
              <Input
                id="job"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                placeholder="Ex: Gabinete v3, Suporte articulado"
                className="h-11 sm:h-10 text-[15px] sm:text-sm rounded-xl border-white/[0.08] bg-[#16171d]/90 text-white placeholder:text-zinc-600 focus-visible:border-[#ff6600]/80 focus-visible:ring-1 focus-visible:ring-[#ff6600]/40 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer" className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <User className="size-3 text-zinc-400" />
                <span>Cliente / Solicitante</span>
              </Label>
              <Input
                id="customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Ex: Acme Robótica, João Silva"
                className="h-11 sm:h-10 text-[15px] sm:text-sm rounded-xl border-white/[0.08] bg-[#16171d]/90 text-white placeholder:text-zinc-600 focus-visible:border-[#ff6600]/80 focus-visible:ring-1 focus-visible:ring-[#ff6600]/40 transition-all"
              />
            </div>
          </div>

          {/* Section 2: Material & Hardware */}
          <div className="grid gap-3.5 sm:gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <Layers className="size-3 text-zinc-400" />
                <span>Filamento / Matéria-prima</span>
              </Label>
              <Select value={filament?.id ?? ""} onValueChange={setFilamentId}>
                <SelectTrigger className="h-11 sm:h-10 text-[15px] sm:text-sm rounded-xl border-white/[0.08] bg-[#16171d]/90 text-white focus:border-[#ff6600]/80 focus:ring-1 focus:ring-[#ff6600]/40 transition-all">
                  <SelectValue placeholder="Selecionar bobina do estoque" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#16171e] text-sm text-white max-h-72">
                  {filaments.map((f) => (
                    <SelectItem key={f.id} value={f.id} className="focus:bg-[#ff6600]/20 focus:text-white py-2">
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: f.color_hex }}
                        />
                        <span className="font-medium">{f.material} · {f.brand}</span>
                        <span className="text-xs text-zinc-400">({money(Number(f.cost_per_kg), currency)}/kg)</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <PrinterIcon className="size-3 text-zinc-400" />
                <span>Impressora (opcional)</span>
              </Label>
              <Select value={printerId} onValueChange={setPrinterId}>
                <SelectTrigger className="h-11 sm:h-10 text-[15px] sm:text-sm rounded-xl border-white/[0.08] bg-[#16171d]/90 text-white focus:border-[#ff6600]/80 focus:ring-1 focus:ring-[#ff6600]/40 transition-all">
                  <SelectValue placeholder="Deixar sem atribuir" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#16171e] text-sm text-white max-h-72">
                  {printers.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="focus:bg-[#ff6600]/20 focus:text-white py-2">
                      {p.name} · {p.model} ({p.kwh_consumption} W)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section 3: Weight, Hours, Setup Fee */}
          <div className="grid gap-3.5 sm:gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="w" className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <Weight className="size-3 text-zinc-400" />
                <span>Massa estimada (g)</span>
              </Label>
              <div className="relative">
                <Input
                  id="w"
                  type="number"
                  min={0}
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value) || 0)}
                  className="h-11 sm:h-10 text-[15px] sm:text-sm rounded-xl border-white/[0.08] bg-[#16171d]/90 font-mono text-white pr-9 focus-visible:border-[#ff6600]/80 focus-visible:ring-1 focus-visible:ring-[#ff6600]/40 transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono">
                  g
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="h" className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <Clock className="size-3 text-zinc-400" />
                <span>Tempo de impressão</span>
              </Label>
              <div className="relative">
                <Input
                  id="h"
                  type="number"
                  min={0}
                  step={0.1}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value) || 0)}
                  className="h-11 sm:h-10 text-[15px] sm:text-sm rounded-xl border-white/[0.08] bg-[#16171d]/90 font-mono text-white pr-9 focus-visible:border-[#ff6600]/80 focus-visible:ring-1 focus-visible:ring-[#ff6600]/40 transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono">
                  h
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s" className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <Coins className="size-3 text-zinc-400" />
                <span>Preparo / Setup</span>
              </Label>
              <div className="relative">
                <Input
                  id="s"
                  type="number"
                  min={0}
                  step={0.5}
                  value={setupFee}
                  onChange={(e) => setSetupFee(Number(e.target.value) || 0)}
                  className="h-11 sm:h-10 text-[15px] sm:text-sm rounded-xl border-white/[0.08] bg-[#16171d]/90 font-mono text-white pl-10 focus-visible:border-[#ff6600]/80 focus-visible:ring-1 focus-visible:ring-[#ff6600]/40 transition-all"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono">
                  {currency}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Profit Margin with Presets & Slider */}
          <div className="space-y-3.5 rounded-2xl border border-[#ff6600]/30 bg-[#ff6600]/[0.03] p-4 sm:p-5 shadow-[0_0_24px_-8px_rgba(255,102,0,0.15)]">
            <div className="flex items-center justify-between">
              <div>
                <Label className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white">
                  <Percent className="size-3.5 text-[#ff6600]" />
                  <span>Margem de Lucro Desejada</span>
                </Label>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Retorno aplicado sobre o custo total de fabricação
                </p>
              </div>
              <span className="inline-flex items-center rounded-xl border border-[#ff6600]/50 bg-[#ff6600]/20 px-3 py-1 font-mono text-sm sm:text-base font-bold text-[#ff6600] shadow-[0_0_12px_rgba(255,102,0,0.25)]">
                +{margin}%
              </span>
            </div>

            {/* Quick Margin Presets (Super convenient on mobile touch) */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mr-1">
                Atalhos:
              </span>
              {MARGIN_PRESETS.map((preset) => {
                const isActive = margin === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMargin(preset)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      isActive
                        ? "bg-[#ff6600] text-black shadow-md shadow-[#ff6600]/30 scale-105"
                        : "bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    +{preset}%
                  </button>
                );
              })}
            </div>

            <Slider
              value={[margin]}
              min={10}
              max={250}
              step={5}
              onValueChange={(v) => setMargin(v[0] ?? margin)}
              className="py-2"
            />
            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
              <span>Mín: 10%</span>
              <span>100% (Dobro)</span>
              <span>Máx: 250%</span>
            </div>
          </div>

          {!enoughStock ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>
                A bobina selecionada tem apenas <strong>{filament?.remaining_g}g</strong> restantes — insuficiente para a peça de {weight}g.
              </span>
            </div>
          ) : null}
        </section>

        {/* Right Live Cost Breakdown & Pricing Card */}
        <section className="space-y-4 sm:space-y-5 rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#121316]/80 p-4.5 sm:p-6 backdrop-blur-xl shadow-2xl h-fit lg:col-span-2 lg:sticky lg:top-20">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ff6600]">
              <Zap className="size-4" />
              <span>Detalhamento em Tempo Real</span>
            </div>
            <span className="flex size-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <dl className="space-y-2.5 text-xs sm:text-sm">
            <div className="flex items-center justify-between text-zinc-400">
              <dt className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-zinc-600" />
                Matéria-prima ({weight}g)
              </dt>
              <dd className="font-mono font-semibold text-white">
                {money(result.materialCost, currency)}
              </dd>
            </div>

            <div className="flex items-center justify-between text-zinc-400">
              <dt className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-zinc-600" />
                Energia ({hours}h @ {settings?.kwh_price ?? 0.75}/kWh)
              </dt>
              <dd className="font-mono font-semibold text-white">
                {money(result.energyCost, currency)}
              </dd>
            </div>

            <div className="flex items-center justify-between text-zinc-400">
              <dt className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-zinc-600" />
                Preparo / Mão de obra
              </dt>
              <dd className="font-mono font-semibold text-white">
                {money(setupFee, currency)}
              </dd>
            </div>

            <div className="border-t border-white/[0.08] pt-2.5 flex items-center justify-between font-medium text-zinc-300">
              <dt className="font-semibold text-white">Custo Operacional Total</dt>
              <dd className="font-mono font-bold text-white">
                {money(result.totalCost, currency)}
              </dd>
            </div>

            <div className="flex items-center justify-between font-semibold text-emerald-400 bg-emerald-500/[0.08] border border-emerald-500/20 px-3 py-2 rounded-xl">
              <dt className="flex items-center gap-1.5">
                <TrendingUp className="size-3.5" />
                <span>Lucro Líquido (+{margin}%)</span>
              </dt>
              <dd className="font-mono font-bold">
                +{money(result.profit, currency)}
              </dd>
            </div>
          </dl>

          {/* Preço Final Display Card */}
          <div className="relative overflow-hidden rounded-2xl border border-[#ff6600]/40 bg-gradient-to-br from-[#ff6600]/20 via-[#16171f] to-[#121318] p-4.5 sm:p-5 shadow-[0_0_28px_-6px_rgba(255,102,0,0.3)]">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#ff6600]">
                Preço Sugerido de Venda
              </p>
              <span className="rounded-md bg-[#ff6600]/20 px-2 py-0.5 text-[10px] font-mono font-bold text-[#ff6600]">
                Margem {margin}%
              </span>
            </div>
            <p className="mt-1 font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {money(result.finalPrice, currency)}
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">
              Custo {money(result.totalCost, currency)} + Lucro {money(result.profit, currency)}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2.5 pt-1">
            <Button
              className="w-full h-12 rounded-xl bg-[#ff6600] text-black font-bold text-xs sm:text-sm hover:brightness-110 active:scale-[0.98] shadow-lg shadow-[#ff6600]/25 transition-all flex items-center justify-center gap-2"
              size="lg"
              onClick={submit}
              disabled={createJob.isPending}
            >
              <span>Criar trabalho e enviar à fila</span>
              <ArrowRight className="size-4" />
            </Button>

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

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Rocket, Zap } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
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
      { title: "Cost Estimator — PrintHub Manager" },
      {
        name: "description",
        content:
          "Interactive 3D print quotation: material, energy and labour costs with a live profit-margin slider.",
      },
      { property: "og:title", content: "Cost Estimator — PrintHub Manager" },
      {
        property: "og:description",
        content: "Quote any print in seconds with a live profit-margin slider.",
      },
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
  const [hours, setHours] = useState(6);
  const [setupFee, setSetupFee] = useState(15);
  const [margin, setMargin] = useState(80);

  const filament = filaments.find((f) => f.id === filamentId) ?? filaments[0];
  const printer = printers.find((p) => p.id === printerId);

  const result = useMemo(
    () =>
      computeCosts({
        weightGrams: weight,
        costPerKg: Number(filament?.cost_per_kg ?? 0),
        printTimeHours: hours,
        printerWatts: Number(printer?.kwh_consumption ?? 120),
        kwhPrice: Number(settings?.kwh_price ?? 0.75),
        setupFee,
        profitMargin: margin,
      }),
    [weight, filament, hours, printer, settings, setupFee, margin],
  );

  const enoughStock = !filament || Number(filament.remaining_g) >= weight;

  async function submit() {
    if (!jobName.trim()) {
      toast.error("Give the job a name first.");
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
    toast.success("Job created and added to the production queue.");
    navigate({ to: "/queue" });
  }

  return (
    <AppShell
      title="Cost Estimator"
      subtitle="Material + energy + labour, marked up live. Push straight into the queue."
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="panel space-y-5 p-6 lg:col-span-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="job">Job name</Label>
              <Input
                id="job"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                placeholder="Enclosure v3"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Input
                id="customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Acme Robotics"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Filament</Label>
              <Select value={filament?.id ?? ""} onValueChange={setFilamentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select spool" />
                </SelectTrigger>
                <SelectContent>
                  {filaments.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="size-3 rounded-full border border-border"
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
              <Label>Printer (optional)</Label>
              <Select value={printerId} onValueChange={setPrinterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Leave unassigned" />
                </SelectTrigger>
                <SelectContent>
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
              <Label htmlFor="w">Weight (g)</Label>
              <Input
                id="w"
                type="number"
                min={0}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="h">Print time (h)</Label>
              <Input
                id="h"
                type="number"
                min={0}
                step={0.1}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s">Setup / labour</Label>
              <Input
                id="s"
                type="number"
                min={0}
                step={0.5}
                value={setupFee}
                onChange={(e) => setSetupFee(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-surface-raised p-4">
            <div className="flex items-center justify-between">
              <Label>Profit margin</Label>
              <span className="num text-lg font-semibold text-emerald-accent">{margin}%</span>
            </div>
            <Slider
              value={[margin]}
              min={10}
              max={200}
              step={5}
              onValueChange={(v) => setMargin(v[0])}
            />
            <div className="label-tag flex justify-between">
              <span>10%</span>
              <span>200%</span>
            </div>
          </div>

          {!enoughStock ? (
            <p className="rounded-md border border-rose-accent/30 bg-rose-accent/10 px-3 py-2 text-xs text-rose-accent">
              Selected spool only has {filament?.remaining_g} g left — not enough for this job.
            </p>
          ) : null}
        </section>

        <section className="panel h-fit p-6 lg:col-span-2">
          <div className="label-tag flex items-center gap-2">
            <Zap className="size-3.5" /> Live breakdown
          </div>

          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Material" value={money(result.materialCost, currency)} />
            <Row
              label={`Energy @ ${settings?.kwh_price ?? 0.75}/kWh`}
              value={money(result.energyCost, currency)}
            />
            <Row label="Setup / labour" value={money(setupFee, currency)} />
            <div className="border-t border-border pt-3">
              <Row label="Total cost" value={money(result.totalCost, currency)} />
            </div>
            <Row
              label="Profit"
              value={money(result.profit, currency)}
              className="text-emerald-accent"
            />
          </dl>

          <div className="mt-5 rounded-lg border border-primary/30 bg-primary/10 p-4">
            <p className="label-tag">Final price</p>
            <p className="num mt-1 text-3xl font-semibold text-primary">
              {money(result.finalPrice, currency)}
            </p>
          </div>

          <Button
            className="mt-5 w-full"
            size="lg"
            onClick={submit}
            disabled={createJob.isPending}
          >
            <Rocket className="size-4" />
            Create job & add to queue
          </Button>
        </section>
      </div>
    </AppShell>
  );
}

function Row({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="num font-medium">{value}</dd>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { StatusPill } from "@/components/StatusPill";
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

function Printers() {
  const { data: printers = [] } = usePrinters();
  const { data: jobs = [] } = useJobs();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "R$";
  const create = useCreatePrinter();
  const update = useUpdatePrinter();
  const [form, setForm] = useState(empty);

  return (
    <AppShell title="Impressoras" subtitle="Sua frota de máquinas, consumo e disponibilidade.">
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="panel h-fit space-y-4 p-6 lg:col-span-2">
          <h2 className="text-base font-semibold">Nova impressora</h2>
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
            <Input
              id="m"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              placeholder="Bambu Lab P1S"
            />
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
        </section>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3">
          {printers.map((p) => {
            const done = jobs.filter(
              (j) => j.assigned_printer_id === p.id && j.status === "completed",
            );
            const produced = done.reduce((s, j) => s + Number(j.total_price), 0);
            return (
              <article key={p.id} className="panel space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">{p.model}</p>
                  </div>
                  <StatusPill status={p.status} />
                </div>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Consumo</dt>
                    <dd className="num">{p.kwh_consumption} W</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Valor/hora</dt>
                    <dd className="num">{money(Number(p.hourly_rate), currency)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Faturado</dt>
                    <dd className="num text-emerald-accent">{money(produced, currency)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Trabalhos concluídos</dt>
                    <dd className="num">{done.length}</dd>
                  </div>
                </dl>
                <Select
                  value={p.status}
                  onValueChange={(v) =>
                    update.mutate({ id: p.id, patch: { status: v as PrinterStatus } })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idle">Livre</SelectItem>
                    <SelectItem value="printing">Imprimindo</SelectItem>
                    <SelectItem value="error">Erro</SelectItem>
                  </SelectContent>
                </Select>
              </article>
            );
          })}
          {printers.length === 0 ? (
            <div className="panel p-10 text-sm text-muted-foreground sm:col-span-2">
              Nenhuma impressora cadastrada ainda.
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

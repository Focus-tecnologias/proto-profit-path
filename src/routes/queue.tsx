import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  money,
  useCompleteJob,
  useDeleteJob,
  useFilaments,
  useJobs,
  usePrinters,
  useSettings,
  useUpdateJob,
  type JobStatus,
} from "@/lib/farm";

export const Route = createFileRoute("/queue")({
  head: () => ({
    meta: [
      { title: "Fila de Produção — PrintHub Manager" },
      {
        name: "description",
        content:
          "Acompanhe orçamentos, trabalhos na fila e impressões em andamento da sua fazenda de impressão 3D.",
      },
      { property: "og:title", content: "Fila de Produção — PrintHub Manager" },
      {
        property: "og:description",
        content: "Gerencie orçamentos, fila e impressões em andamento em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Queue,
});

const filters: { key: JobStatus | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "quote", label: "Orçamentos" },
  { key: "queued", label: "Na fila" },
  { key: "printing", label: "Imprimindo" },
  { key: "completed", label: "Concluídos" },
  { key: "cancelled", label: "Cancelados" },
];

function Queue() {
  const { data: jobs = [] } = useJobs();
  const { data: printers = [] } = usePrinters();
  const { data: filaments = [] } = useFilaments();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "R$";
  const updateJob = useUpdateJob();
  const completeJob = useCompleteJob();
  const deleteJob = useDeleteJob();
  const [filter, setFilter] = useState<JobStatus | "all">("all");

  const visible = jobs.filter((j) => filter === "all" || j.status === filter);

  return (
    <AppShell
      title="Fila de Produção"
      subtitle="Do orçamento à entrega — controle cada trabalho e sua máquina."
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.key
                ? "border-primary/40 bg-primary/12 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map((j) => {
          const printer = printers.find((p) => p.id === j.assigned_printer_id);
          const filament = filaments.find((f) => f.id === j.filament_id);
          return (
            <article key={j.id} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold">{j.job_name}</h2>
                    <StatusPill status={j.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {j.customer_name || "Sem cliente"} · {j.weight_grams} g ·{" "}
                    {j.print_time_hours} h
                    {filament ? ` · ${filament.material} ${filament.brand}` : ""}
                  </p>
                </div>
                <p className="num text-lg font-semibold text-primary">
                  {money(Number(j.total_price), currency)}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Select
                  value={j.assigned_printer_id ?? ""}
                  onValueChange={(v) =>
                    updateJob.mutate({ id: j.id, patch: { assigned_printer_id: v } })
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={printer ? printer.name : "Atribuir impressora"} />
                  </SelectTrigger>
                  <SelectContent>
                    {printers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} · {p.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {j.status !== "printing" && j.status !== "completed" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      updateJob.mutate({ id: j.id, patch: { status: "printing" } });
                      toast.success("Impressão iniciada.");
                    }}
                  >
                    <Play className="size-4" /> Iniciar
                  </Button>
                ) : null}

                {j.status !== "completed" ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      completeJob.mutate({ job: j, ...(filament ? { filament } : {}) });
                      toast.success("Trabalho concluído e filamento baixado do estoque.");
                    }}
                  >
                    <CheckCircle2 className="size-4" /> Concluir
                  </Button>
                ) : null}

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-accent hover:text-rose-accent"
                  onClick={() => {
                    deleteJob.mutate(j.id);
                    toast.success("Trabalho removido.");
                  }}
                >
                  <Trash2 className="size-4" /> Excluir
                </Button>
              </div>
            </article>
          );
        })}

        {visible.length === 0 ? (
          <div className="panel p-10 text-center text-sm text-muted-foreground">
            Nenhum trabalho aqui. Crie um pelo{" "}
            <Link to="/estimator" className="text-primary hover:underline">
              orçamentador
            </Link>
            .
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

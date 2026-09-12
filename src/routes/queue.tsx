import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Play, Trash2, Clock, ListOrdered } from "lucide-react";
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
      { title: "Fila de Produção — FOCUS OS" },
      {
        name: "description",
        content:
          "Manifesto operacional de produção: acompanhamento de fila, impressoras atribuídas e conclusão de ordens.",
      },
      { property: "og:title", content: "Fila de Produção — FOCUS OS" },
      {
        property: "og:description",
        content: "Fila de produção e controle de manufatura aditiva.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Queue,
});

const filters: { key: JobStatus | "all"; label: string; code: string }[] = [
  { key: "all", label: "TODOS", code: "ALL" },
  { key: "quote", label: "ORÇAMENTOS", code: "EST" },
  { key: "queued", label: "NA FILA", code: "QUE" },
  { key: "printing", label: "OPERANDO", code: "RUN" },
  { key: "completed", label: "CONCLUÍDOS", code: "OK" },
  { key: "cancelled", label: "CANCELADOS", code: "ABR" },
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
      title="Fila de Produção & Manifesto"
      subtitle="Supervisão operacional de cada ordem de fabricação, nó alocado e tempo de execução."
      icon={ListOrdered}
    >
      {/* Filter Matrix Bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[11px] font-semibold tracking-wider transition-all duration-200 ${
              filter === f.key
                ? "border-primary/50 bg-primary/20 text-primary shadow-[0_0_15px_-3px_rgba(255,85,0,0.3)]"
                : "border-white/10 bg-card text-muted-foreground hover:border-white/20 hover:text-white"
            }`}
          >
            <span>{f.label}</span>
            <span className="opacity-40">[{f.code}]</span>
          </button>
        ))}
      </div>

      {/* Queue Items */}
      <div className="space-y-3.5">
        {visible.map((j) => {
          const printer = printers.find((p) => p.id === j.assigned_printer_id);
          const filament = filaments.find((f) => f.id === j.filament_id);
          const isPrinting = j.status === "printing";
          const isCompleted = j.status === "completed";

          return (
            <article
              key={j.id}
              className={`rounded-xl border p-4.5 transition-all duration-300 ${
                isPrinting
                  ? "border-orange-500/50 bg-gradient-to-br from-orange-950/20 via-card to-card shadow-[0_0_20px_-5px_rgba(255,85,0,0.25)]"
                  : isCompleted
                  ? "border-emerald-500/40 bg-card/85"
                  : "border-white/10 bg-card/85 hover:border-white/20"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="font-display text-base font-bold text-white uppercase tracking-tight">
                      {j.job_name}
                    </h2>
                    <StatusPill status={j.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
                    <span className="font-medium text-white">
                      {j.customer_name || "CLIENTE NÃO INFORMADO"}
                    </span>
                    <span>//</span>
                    <span>{j.weight_grams}g</span>
                    <span>//</span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3 text-orange-400" />
                      {j.print_time_hours}h
                    </span>
                    {filament && (
                      <>
                        <span>//</span>
                        <span className="flex items-center gap-1.5">
                          <span
                            className="size-2.5 rounded-full border border-white/20"
                            style={{ backgroundColor: filament.color_hex }}
                          />
                          {filament.material} {filament.brand}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="block font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    TOTAL DA ORDEM
                  </span>
                  <p className="font-mono text-xl font-bold text-primary">
                    {money(Number(j.total_price), currency)}
                  </p>
                </div>
              </div>

              {/* Action Controls Bar */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] font-semibold uppercase text-muted-foreground">
                    NÓ ALOCADO:
                  </span>
                  <Select
                    value={j.assigned_printer_id ?? ""}
                    onValueChange={(v) =>
                      updateJob.mutate({ id: j.id, patch: { assigned_printer_id: v } })
                    }
                  >
                    <SelectTrigger className="h-7 w-[200px] rounded-lg border-white/10 bg-[#151821] font-mono text-xs">
                      <SelectValue placeholder={printer ? printer.name : "Alocar nó"} />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#151821] font-mono text-xs">
                      {printers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} · {p.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  {!isPrinting && !isCompleted && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 gap-1.5 rounded-lg border border-orange-500/40 bg-orange-500/10 font-mono text-[11px] font-bold text-orange-400 hover:bg-orange-500/20"
                      onClick={() => {
                        updateJob.mutate({ id: j.id, patch: { status: "printing" } });
                        toast.success("Produção iniciada no nó selecionado.");
                      }}
                    >
                      <Play className="size-3" /> INICIAR EXECUÇÃO
                    </Button>
                  )}

                  {!isCompleted && (
                    <Button
                      size="sm"
                      className="h-7 gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 font-mono text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/25"
                      onClick={() => {
                        completeJob.mutate({ job: j, ...(filament ? { filament } : {}) });
                        toast.success("Ordem concluída e estoque de filamento baixado.");
                      }}
                    >
                      <CheckCircle2 className="size-3" /> CONCLUIR ORDEM
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 rounded-lg font-mono text-[11px] text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => {
                      deleteJob.mutate(j.id);
                      toast.success("Ordem removida da fila.");
                    }}
                  >
                    <Trash2 className="size-3" /> REMOVER
                  </Button>
                </div>
              </div>
            </article>
          );
        })}

        {visible.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 p-12 text-center font-mono text-xs text-muted-foreground">
            Nenhuma ordem registrada neste filtro. Inicie um novo cálculo pelo{" "}
            <Link to="/estimator" className="text-primary hover:underline font-bold">
              simulador de custos
            </Link>
            .
          </div>
        )}
      </div>
    </AppShell>
  );
}

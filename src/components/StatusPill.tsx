import type { JobStatus, PrinterStatus } from "@/lib/farm";

const map: Record<string, string> = {
  idle: "bg-cyan-accent/12 text-cyan-accent border-cyan-accent/30",
  printing: "bg-amber-accent/12 text-amber-accent border-amber-accent/30",
  error: "bg-rose-accent/12 text-rose-accent border-rose-accent/30",
  quote: "bg-muted text-muted-foreground border-border",
  queued: "bg-cyan-accent/12 text-cyan-accent border-cyan-accent/30",
  completed: "bg-emerald-accent/12 text-emerald-accent border-emerald-accent/30",
  cancelled: "bg-rose-accent/12 text-rose-accent border-rose-accent/30",
};

export const statusLabels: Record<string, string> = {
  idle: "Livre",
  printing: "Imprimindo",
  error: "Erro",
  quote: "Orçamento",
  queued: "Na fila",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export function StatusPill({ status }: { status: JobStatus | PrinterStatus | string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
        map[status] ?? map["quote"]
      }`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {statusLabels[status] ?? status}
    </span>
  );
}

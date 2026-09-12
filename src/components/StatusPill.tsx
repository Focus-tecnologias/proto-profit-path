import type { JobStatus, PrinterStatus } from "@/lib/farm";

type StatusConfig = {
  bg: string;
  text: string;
  border: string;
  dot: string;
  glow?: string;
  pulse?: boolean;
};

const DEFAULT_CONF: StatusConfig = {
  bg: "bg-white/[0.04]",
  text: "text-zinc-400",
  border: "border-white/10",
  dot: "bg-zinc-500",
};

const map: Record<string, StatusConfig> = {
  idle: {
    bg: "bg-white/[0.04]",
    text: "text-zinc-300",
    border: "border-white/10",
    dot: "bg-zinc-400",
  },
  printing: {
    bg: "bg-orange-500/15",
    text: "text-orange-400",
    border: "border-orange-500/30",
    dot: "bg-orange-500",
    glow: "shadow-[0_0_12px_rgba(255,102,0,0.35)]",
    pulse: true,
  },
  error: {
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/30",
    dot: "bg-red-500",
    glow: "shadow-[0_0_12px_rgba(255,69,58,0.35)]",
    pulse: true,
  },
  quote: {
    bg: "bg-white/[0.04]",
    text: "text-zinc-400",
    border: "border-white/10",
    dot: "bg-zinc-500",
  },
  queued: {
    bg: "bg-amber-500/15",
    text: "text-amber-300",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
  },
  completed: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
    glow: "shadow-[0_0_12px_rgba(48,209,88,0.3)]",
  },
  cancelled: {
    bg: "bg-white/[0.03]",
    text: "text-zinc-500",
    border: "border-white/5",
    dot: "bg-zinc-600",
  },
};

export const statusLabels: Record<string, string> = {
  idle: "Livre",
  printing: "Imprimindo",
  error: "Falha",
  quote: "Orçamento",
  queued: "Na fila",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export function StatusPill({
  status,
  showCode = false,
}: {
  status: JobStatus | PrinterStatus | string;
  showCode?: boolean;
}) {
  const conf: StatusConfig = map[status] ?? DEFAULT_CONF;
  const label = statusLabels[status] ?? status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all ${conf.bg} ${conf.text} ${conf.border} ${conf.glow || ""}`}
    >
      <span className="relative flex size-1.5">
        {conf.pulse && (
          <span className={`absolute inline-flex size-full animate-ping rounded-full ${conf.dot} opacity-75`} />
        )}
        <span className={`relative inline-flex size-1.5 rounded-full ${conf.dot}`} />
      </span>
      <span>{label}</span>
    </span>
  );
}

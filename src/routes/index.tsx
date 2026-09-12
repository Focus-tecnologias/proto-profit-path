import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Printer as PrinterIcon,
  Activity,
  FileText,
  TrendingUp,
  Thermometer,
  Clock,
  Box,
  MoreHorizontal,
  Play,
  CheckCircle2,
  Pause,
  ArrowRight,
  ChevronDown,
  PlusCircle,
  RotateCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { money, useFilaments, useJobs, usePrinters, useSettings, type PrintJob } from "@/lib/farm";

import bambuA1Mini from "@/assets/printer-bambu-a1-mini.jpg";
import bambuP1s from "@/assets/printer-bambu-p1s.jpg";
import bambuX1Carbon from "@/assets/printer-bambu-x1-carbon.jpg";
import anycubicKobra2 from "@/assets/printer-anycubic-kobra2.jpg";
import crealityK1 from "@/assets/printer-creality-k1.jpg";
import enderV2Neo from "@/assets/printer-ender-v2-neo.jpg";
import enderS1 from "@/assets/printer-ender-s1.jpg";
import prusaMk3s from "@/assets/printer-prusa-mk3s.jpg";
import prusaMk4 from "@/assets/printer-prusa-mk4.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel da Fábrica — Focus Lab" },
      {
        name: "description",
        content: "Status em tempo real da sua produção, telemetria das máquinas e histórico operacional.",
      },
    ],
  }),
  component: Dashboard,
});

function getPrinterImage(model: string) {
  const normalized = (model || "").toLowerCase();
  if (normalized.includes("a1 mini")) return bambuA1Mini;
  if (normalized.includes("x1 carbon") || normalized.includes("x1c") || normalized.includes("bambu lab x1") || normalized.includes("x1"))
    return bambuX1Carbon;
  if (normalized.includes("p1s") || normalized.includes("p1p") || normalized.includes("adventurer") || normalized.includes("flashforge"))
    return bambuP1s;
  if (normalized.includes("v2 neo") || normalized.includes("ender 3 v3") || normalized.includes("v3")) return enderV2Neo;
  if (normalized.includes("s1") || normalized.includes("ender 3 s1")) return enderS1;
  if (normalized.includes("k1") || normalized.includes("creality k1")) return crealityK1;
  if (normalized.includes("mk4")) return prusaMk4;
  if (normalized.includes("mk3")) return prusaMk3s;
  if (normalized.includes("kobra")) return anycubicKobra2;
  if (normalized.includes("ender") || normalized.includes("creality")) return enderV2Neo;
  if (normalized.includes("prusa")) return prusaMk4;
  return bambuP1s;
}

function formatTableStatusPill(status: PrintJob["status"]) {
  switch (status) {
    case "printing":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 shadow-sm">
          <RotateCw className="size-3 animate-spin text-emerald-400" />
          Em produção
        </span>
      );
    case "completed":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-400 shadow-sm">
          <CheckCircle2 className="size-3 text-cyan-400" />
          Concluído
        </span>
      );
    case "queued":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold text-zinc-400 shadow-sm">
          <Clock className="size-3 text-zinc-400" />
          Fila
        </span>
      );
    case "cancelled":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold text-red-400 shadow-sm">
          Cancelado
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/60 px-2.5 py-0.5 text-[10px] font-bold text-zinc-400 shadow-sm">
          Fila
        </span>
      );
  }
}

function Dashboard() {
  const { data: printers = [] } = usePrinters();
  const { data: jobs = [] } = useJobs();
  const { data: filaments = [] } = useFilaments();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "R$";

  const [metricFilter, setMetricFilter] = useState<"pieces" | "hours" | "cost">("pieces");

  // 1. Process Printers Telemetry & Job Progress
  const printerCardsData = useMemo(() => {
    return printers.map((p) => {
      const activeJob = jobs.find(
        (j) => j.assigned_printer_id === p.id && (j.status === "printing" || j.status === "queued"),
      );
      const activeFilament = filaments.find((f) => f.id === activeJob?.filament_id) || filaments[0];
      const isPrinting = p.status === "printing" || activeJob?.status === "printing";
      const isQueued = !isPrinting && activeJob?.status === "queued";
      const isError = p.status === "error";

      let progress = 0;
      let timeRemaining = "Sem produção no momento";
      let nozzleTempStr = "- / -";
      let matName = activeFilament?.material || "PLA";

      if (isPrinting && activeJob) {
        const elapsedHours = Math.max(
          0,
          (Date.now() - new Date(activeJob.created_at).getTime()) / 3_600_000,
        );
        const totalHours = Math.max(0.2, Number(activeJob.print_time_hours) || 1);
        progress = Math.min(99, Math.max(12, Math.round((elapsedHours / totalHours) * 100)));
        const remHours = Math.max(0, totalHours - elapsedHours);
        const fullHours = Math.floor(remHours);
        const mins = Math.round((remHours % 1) * 60);
        timeRemaining = remHours > 0 ? `${fullHours}h ${mins}min restantes` : "Finalizando camada...";

        const mat = (activeFilament?.material || "PLA").toUpperCase();
        const nozzleTemp = mat.includes("PETG") ? 235 : mat.includes("ABS") ? 245 : 220;
        const bedTemp = mat.includes("PETG") ? 75 : mat.includes("ABS") ? 90 : 60;
        nozzleTempStr = `${nozzleTemp}°C / ${bedTemp}°C`;
      } else if (isQueued && activeJob) {
        progress = 0;
        timeRemaining = `Fila (${activeJob.print_time_hours}h)`;
        nozzleTempStr = "32°C / 25°C";
      }

      return {
        id: p.id,
        name: p.name,
        model: p.model,
        status: isError ? "error" : isPrinting ? "printing" : isQueued ? "queued" : "idle",
        jobName: activeJob?.job_name || "Nenhuma peça em produção",
        hasJob: !!activeJob,
        progress,
        timeRemaining,
        nozzleTempStr,
        material: matName,
        image: getPrinterImage(p.model),
      };
    });
  }, [printers, jobs, filaments]);

  // 2. Process Real Activity Feed from Chronological Jobs
  const realActivityEvents = useMemo(() => {
    const sortedJobs = [...jobs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return sortedJobs.slice(0, 5).map((job) => {
      const assignedPrinter = printers.find((p) => p.id === job.assigned_printer_id);
      const date = new Date(job.created_at);
      const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      let actionText = `Início da impressão`;
      let eventType: "start" | "completed" | "paused" = "start";

      if (job.status === "completed") {
        actionText = `Finalizou o trabalho: ${job.job_name}`;
        eventType = "completed";
      } else if (job.status === "printing") {
        actionText = `Início da impressão`;
        eventType = "start";
      } else if (job.status === "queued") {
        actionText = `Adicionado à fila: ${job.job_name}`;
        eventType = "paused";
      } else {
        actionText = `Trabalho: ${job.job_name}`;
      }

      return {
        id: job.id,
        title: job.job_name || (assignedPrinter ? assignedPrinter.name : "Impressora"),
        action: actionText,
        type: eventType,
        time: timeStr,
      };
    });
  }, [jobs, printers]);

  // 3. Process Real Recent Gcodes / Jobs for the Table
  const recentJobsList = useMemo(() => {
    const sorted = [...jobs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return sorted.slice(0, 5);
  }, [jobs]);

  // 4. Process Real Last 7 Days Production Data
  const weeklyProductionData = useMemo(() => {
    const days: { day: string; dateStr: string; pieces: number; hours: number; cost: number }[] = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayLabel = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      const dateStr = d.toISOString().slice(0, 10);

      const dayJobs = jobs.filter((j) => (j.created_at || "").startsWith(dateStr));
      const pieces = dayJobs.length;
      const hours = dayJobs.reduce((acc, j) => acc + Number(j.print_time_hours || 0), 0);
      const cost = dayJobs.reduce((acc, j) => acc + Number(j.total_price || 0), 0);

      days.push({
        day: dayLabel,
        dateStr,
        pieces,
        hours: Math.round(hours * 10) / 10,
        cost: Math.round(cost),
      });
    }
    return days;
  }, [jobs]);

  return (
    <AppShell
      title="Painel da Fábrica"
      subtitle="Status em tempo real da sua produção, telemetria das máquinas e histórico operacional."
    >
      <div className="space-y-4 sm:space-y-6">
        {/* ========================================================= */}
        {/* TOP ROW: IMPRESSORAS (Col 8) & ATIVIDADE EM TEMPO REAL (Col 4) */}
        {/* ========================================================= */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-12 items-stretch">
          {/* LEFT: CARD IMPRESSORAS (8 Cols) */}
          <section className="lg:col-span-8 p-4 sm:p-6 rounded-2xl border border-white/[0.09] bg-[#121316]/80 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex flex-col justify-between">
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="flex size-9 sm:size-10 items-center justify-center rounded-xl bg-[#ff6600]/15 border border-[#ff6600]/30 text-[#ff6600] shadow-[0_0_14px_rgba(255,102,0,0.2)] shrink-0">
                    <PrinterIcon className="size-4.5 sm:size-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">Impressoras</h2>
                    <p className="text-[11px] sm:text-xs text-zinc-400">Status em tempo real da sua produção</p>
                  </div>
                </div>

                <Link
                  to="/printers"
                  className="px-2.5 sm:px-3.5 py-1.5 rounded-lg border border-[#ff6600]/40 bg-[#ff6600]/10 text-[11px] sm:text-xs font-semibold text-[#ff6600] hover:bg-[#ff6600]/20 hover:border-[#ff6600]/60 active:scale-95 transition-all flex items-center gap-1 sm:gap-1.5 shadow-sm shrink-0"
                >
                  <span>Gerenciar</span>
                  <ArrowRight className="size-3 sm:size-3.5" />
                </Link>
              </div>

              {/* Grid / Horizontal Swipe on Mobile */}
              {printerCardsData.length === 0 ? (
                <div className="py-10 px-4 text-center">
                  <PrinterIcon className="size-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-white">Nenhuma impressora cadastrada</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cadastre suas impressoras para monitorar o status em tempo real.
                  </p>
                  <Link
                    to="/printers"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-[#ff6600] text-black text-xs font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all"
                  >
                    <PlusCircle className="size-4" />
                    <span>Cadastrar Impressora</span>
                  </Link>
                </div>
              ) : (
                <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 sm:grid sm:grid-cols-2 xl:grid-cols-3 sm:gap-4 sm:overflow-visible sm:pb-0 scrollbar-none">
                  {printerCardsData.slice(0, 3).map((p) => {
                    const isPrinting = p.status === "printing";
                    const isIdle = p.status === "idle";

                    return (
                      <div
                        key={p.id}
                        className={`group relative flex flex-col justify-between rounded-2xl p-3.5 sm:p-4 transition-all duration-300 backdrop-blur-xl min-w-[280px] sm:min-w-0 snap-center shrink-0 sm:shrink ${
                          isPrinting
                            ? "border border-[#ff6600]/90 bg-[#1a1816]/90 shadow-[0_0_22px_rgba(255,102,0,0.2)]"
                            : "border border-white/[0.08] bg-[#18191f]/60 hover:border-white/[0.18] hover:bg-[#1c1d24]/70"
                        }`}
                      >
                        {/* Top Row: Status Pill on Right & 3-dots */}
                        <div className="flex items-center justify-end gap-1.5 mb-1.5">
                          {isPrinting ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 shadow-sm">
                              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Em produção
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold text-zinc-400">
                              <span className="size-1.5 rounded-full bg-zinc-500" />
                              Indisponível
                            </span>
                          )}
                          <Link
                            to="/printers"
                            className="size-6 flex items-center justify-center rounded text-zinc-400 hover:text-white transition-colors"
                            title="Opções da impressora"
                          >
                            <MoreHorizontal className="size-4" />
                          </Link>
                        </div>

                        {/* Middle Content: Printer Image (Left) + Details (Right) */}
                        <div className="flex items-center gap-3 my-1">
                          <div className="w-20 sm:w-24 h-20 sm:h-24 shrink-0 flex items-center justify-center overflow-hidden rounded-xl bg-black/30 p-1 border border-white/[0.04]">
                            <img
                              src={p.image}
                              alt={p.name}
                              className="size-full object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.9)] transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>

                          <div className="min-w-0 flex-1 space-y-1 sm:space-y-1.5">
                            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                              {p.name}
                            </h3>

                            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-zinc-300 truncate">
                              <Box className="size-3 text-zinc-400 shrink-0" />
                              <span className="truncate">Peça: {p.hasJob ? p.jobName : "Nenhuma peça em produção"}</span>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1 pt-0.5">
                              <p className="text-[9px] sm:text-[10px] text-zinc-400">Progresso da impressão</p>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-[#ff6600] transition-all duration-500"
                                    style={{ width: `${p.progress}%` }}
                                  />
                                </div>
                                <span className="text-[10px] sm:text-[11px] font-bold font-mono text-white">
                                  {p.progress}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Row: 3 Metrics */}
                        <div className="mt-3.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[9.5px] sm:text-[10px]">
                          {/* Left: Disponível / Indisponível pill */}
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1.5 ${
                              isPrinting || isIdle
                                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                                : "bg-white/5 border border-white/10 text-zinc-400"
                            }`}
                          >
                            <span className={`size-1.5 rounded-full ${isPrinting || isIdle ? "bg-emerald-400" : "bg-zinc-500"}`} />
                            {isPrinting || isIdle ? "Disponível" : "Indisponível"}
                          </span>

                          {/* Center: Temperatures + PLA */}
                          <div className="flex items-center gap-1 text-[#ff8533] font-medium">
                            <Thermometer className="size-3 text-[#ff6600]" />
                            <span>{p.nozzleTempStr}</span>
                            <span className="text-zinc-500 ml-0.5">{p.material}</span>
                          </div>

                          {/* Right: Time Remaining */}
                          <div className="flex items-center gap-1 text-zinc-400 truncate max-w-[90px] sm:max-w-none">
                            <Clock className="size-3 text-zinc-500 shrink-0" />
                            <span className="truncate">{p.timeRemaining}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* RIGHT: CARD ATIVIDADE EM TEMPO REAL (4 Cols) */}
          <section className="lg:col-span-4 p-4 sm:p-6 rounded-2xl border border-white/[0.09] bg-[#121316]/80 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5">
                <div className="flex size-9 sm:size-10 items-center justify-center rounded-xl bg-[#ff6600]/15 border border-[#ff6600]/30 text-[#ff6600] shadow-[0_0_14px_rgba(255,102,0,0.2)] shrink-0">
                  <Activity className="size-4.5 sm:size-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">Atividade em tempo real</h2>
                  <p className="text-[11px] sm:text-xs text-zinc-400">Últimos eventos da produção</p>
                </div>
              </div>

              {/* Events list */}
              <div className="divide-y divide-white/[0.04]">
                {realActivityEvents.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    <Activity className="size-6 text-zinc-600 mx-auto mb-2" />
                    Nenhum evento recente registrado.
                  </div>
                ) : (
                  realActivityEvents.map((ev) => {
                    return (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between gap-2.5 py-2.5 sm:py-3 px-1 transition-colors hover:bg-white/[0.04] active:bg-white/[0.06] rounded-lg"
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          {/* Round Green Badge */}
                          <div className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-sm">
                            {ev.type === "completed" ? (
                              <CheckCircle2 className="size-3.5 sm:size-4" />
                            ) : (
                              <Play className="size-3 sm:size-3.5 fill-emerald-400 ml-0.5" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{ev.title}</p>
                            <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate mt-0.5">{ev.action}</p>
                          </div>
                        </div>

                        <span className="text-[11px] sm:text-xs font-mono text-zinc-400 shrink-0">{ev.time}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Button */}
            <div className="pt-3 sm:pt-4 mt-2">
              <Link
                to="/queue"
                className="w-full py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/[0.08] active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-sm min-h-[42px]"
              >
                <span>Ver fila de produção</span>
                <ArrowRight className="size-3.5 text-[#ff6600]" />
              </Link>
            </div>
          </section>
        </div>

        {/* ========================================================= */}
        {/* BOTTOM ROW: ÚLTIMOS TRABALHOS (Col 7) & PRODUÇÃO 7 DIAS (Col 5) */}
        {/* ========================================================= */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-12 items-stretch">
          {/* LEFT: CARD ÚLTIMOS TRABALHOS (7 Cols) */}
          <section className="lg:col-span-7 p-4 sm:p-6 rounded-2xl border border-white/[0.09] bg-[#121316]/80 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="flex size-9 sm:size-10 items-center justify-center rounded-xl bg-[#ff6600]/15 border border-[#ff6600]/30 text-[#ff6600] shadow-[0_0_14px_rgba(255,102,0,0.2)] shrink-0">
                    <FileText className="size-4.5 sm:size-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">Últimos trabalhos</h2>
                    <p className="text-[11px] sm:text-xs text-zinc-400">Trabalhos recentes da produção</p>
                  </div>
                </div>

                <Link
                  to="/queue"
                  className="text-xs font-semibold text-[#ff6600] hover:underline active:opacity-80 flex items-center gap-1 shrink-0 py-1"
                >
                  <span>Abrir fila</span>
                  <ArrowRight className="size-3" />
                </Link>
              </div>

              {/* Table / Mobile Cards */}
              <div>
                {recentJobsList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    <FileText className="size-6 text-zinc-600 mx-auto mb-2" />
                    Nenhum trabalho cadastrado ainda.
                  </div>
                ) : (
                  <>
                    {/* Mobile Card List (Screen < 640px) */}
                    <div className="block sm:hidden space-y-2.5">
                      {recentJobsList.map((job) => {
                        const assignedPrinter = printers.find((p) => p.id === job.assigned_printer_id);
                        return (
                          <div
                            key={job.id}
                            className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2 active:bg-white/[0.05] transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="size-3.5 text-zinc-400 shrink-0" />
                                <span className="font-semibold text-white text-xs truncate">
                                  {job.job_name}.gcode
                                </span>
                              </div>
                              {formatTableStatusPill(job.status)}
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/[0.04]">
                              <span className="truncate max-w-[140px] text-zinc-300">
                                {assignedPrinter ? assignedPrinter.name : "teste"} ({job.print_time_hours}h)
                              </span>
                              <span className="font-mono font-bold text-white">
                                {money(Number(job.total_price), currency)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop / Tablet Table (Screen >= 640px) */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/[0.08] text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                            <th className="pb-3 pr-4">Nome do arquivo</th>
                            <th className="pb-3 px-4">Impressora</th>
                            <th className="pb-3 px-4">Tempo</th>
                            <th className="pb-3 px-4">Valor Total</th>
                            <th className="pb-3 pl-4 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {recentJobsList.map((job) => {
                            const assignedPrinter = printers.find((p) => p.id === job.assigned_printer_id);
                            return (
                              <tr key={job.id} className="hover:bg-white/[0.04] transition-colors">
                                <td className="py-3.5 pr-4">
                                  <div className="flex items-center gap-2">
                                    <FileText className="size-3.5 text-zinc-400 shrink-0" />
                                    <span className="font-semibold text-white truncate max-w-[170px]">
                                      {job.job_name}.gcode
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-zinc-300 truncate max-w-[120px]">
                                  {assignedPrinter ? assignedPrinter.name : "teste"}
                                </td>
                                <td className="py-3.5 px-4 font-mono text-zinc-400">
                                  {job.print_time_hours}h
                                </td>
                                <td className="py-3.5 px-4 font-mono font-bold text-white">
                                  {money(Number(job.total_price), currency)}
                                </td>
                                <td className="py-3.5 pl-4 text-right">
                                  {formatTableStatusPill(job.status)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* RIGHT: CARD PRODUÇÃO DOS ÚLTIMOS 7 DIAS (5 Cols) */}
          <section className="lg:col-span-5 p-4 sm:p-6 rounded-2xl border border-white/[0.09] bg-[#121316]/80 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="flex size-9 sm:size-10 items-center justify-center rounded-xl bg-[#ff6600]/15 border border-[#ff6600]/30 text-[#ff6600] shadow-[0_0_14px_rgba(255,102,0,0.2)] shrink-0">
                    <TrendingUp className="size-4.5 sm:size-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      Produção dos últimos 7 dias
                    </h2>
                    <p className="text-[11px] sm:text-xs text-zinc-400">Quantidade de ordens produzidas</p>
                  </div>
                </div>

                {/* Filter Dropdown */}
                <div className="relative">
                  <select
                    value={metricFilter}
                    onChange={(e) => setMetricFilter(e.target.value as any)}
                    className="appearance-none rounded-lg border border-white/[0.08] bg-black/60 backdrop-blur-xl px-2.5 sm:px-3 py-1.5 pr-7 text-xs font-semibold text-white outline-none hover:border-white/20 transition-all cursor-pointer h-8 sm:h-9"
                  >
                    <option value="pieces" className="bg-[#121316] text-white">Peças</option>
                    <option value="hours" className="bg-[#121316] text-white">Horas</option>
                    <option value="cost" className="bg-[#121316] text-white">Valor R$</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3 text-zinc-400" />
                </div>
              </div>

              {/* Bar Chart */}
              <div className="h-48 sm:h-56 w-full pt-1 sm:pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weeklyProductionData}
                    margin={{ top: 10, right: 5, left: -28, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis
                      dataKey="day"
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    />
                    <YAxis
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      domain={[0, 4]}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255, 102, 0, 0.05)" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length && payload[0]?.payload) {
                          const data = payload[0].payload as (typeof weeklyProductionData)[number];
                          return (
                            <div className="rounded-xl border border-white/15 bg-black/95 p-2.5 sm:p-3 shadow-2xl backdrop-blur-2xl">
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                {data.day}
                              </p>
                              <div className="mt-0.5 flex items-baseline gap-1.5">
                                <span className="text-sm sm:text-base font-bold text-[#ff6600] font-mono">
                                  {metricFilter === "pieces" && `${data.pieces} ordens`}
                                  {metricFilter === "hours" && `${data.hours} horas`}
                                  {metricFilter === "cost" && money(data.cost, currency)}
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey={metricFilter}
                      fill="url(#orangeBarGrad)"
                      radius={[4, 4, 0, 0]}
                    />
                    <defs>
                      <linearGradient id="orangeBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff7711" />
                        <stop offset="100%" stopColor="#ff5500" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

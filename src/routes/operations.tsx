import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Pause,
  Play,
  Plus,
  Trash2,
  XCircle,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatDuration,
  money,
  sessionSeconds,
  useDeleteOperator,
  useDeleteSession,
  useJobs,
  useOperators,
  usePrinters,
  useSessionAction,
  useSessions,
  useSettings,
  useStartSession,
  useUpsertOperator,
  type ProductionSession,
} from "@/lib/farm";

export const Route = createFileRoute("/operations")({
  head: () => ({
    meta: [
      { title: "Controle Operacional — Focus Lab" },
      {
        name: "description",
        content:
          "Acompanhe em tempo real as impressões em andamento, registre operadores e meça o tempo de máquina.",
      },
      { property: "og:title", content: "Controle Operacional — Focus Lab" },
      {
        property: "og:description",
        content: "Cronometragem e controle de operadores de manufatura 3D.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OperationsPage,
});

function useTick(active: boolean) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setN((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="apple-card p-4 rounded-2xl">
      <p className="label-tag text-[10px] text-muted-foreground">{label}</p>
      <p className="num mt-1 text-2xl font-bold tracking-tight text-white">{value}</p>
    </div>
  );
}

function OperationsPage() {
  const { data: sessions = [] } = useSessions();
  const { data: printers = [] } = usePrinters();
  const { data: jobs = [] } = useJobs();
  const { data: operators = [] } = useOperators();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "R$";

  const start = useStartSession();
  const act = useSessionAction();
  const removeSession = useDeleteSession();
  const upsertOperator = useUpsertOperator();
  const removeOperator = useDeleteOperator();

  const active = sessions.filter((s) => s.status === "running" || s.status === "paused");
  const history = sessions.filter((s) => s.status === "completed" || s.status === "cancelled");
  useTick(active.length > 0);

  const [jobId, setJobId] = useState("");
  const [printerId, setPrinterId] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");

  const [opName, setOpName] = useState("");
  const [opRole, setOpRole] = useState("");
  const [opCost, setOpCost] = useState(0);

  const nameOf = {
    printer: (id: string | null) => printers.find((p) => p.id === id)?.name ?? "Sem impressora",
    job: (id: string | null) => jobs.find((j) => j.id === id)?.job_name ?? "",
    operator: (id: string | null) => operators.find((o) => o.id === id)?.name ?? "Sem operador",
  };

  const stats = useMemo(() => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todaySeconds = sessions
      .filter((s) => new Date(s.started_at).getTime() >= todayStart.getTime())
      .reduce((sum, s) => sum + sessionSeconds(s, now), 0);

    const totalSeconds = sessions.reduce((sum, s) => sum + sessionSeconds(s, now), 0);

    const laborCost = sessions.reduce((sum, s) => {
      const op = operators.find((o) => o.id === s.operator_id);
      return sum + (sessionSeconds(s, now) / 3600) * Number(op?.hourly_cost ?? 0);
    }, 0);

    const byOperator = operators
      .map((o) => {
        const list = sessions.filter((s) => s.operator_id === o.id);
        const secs = list.reduce((sum, s) => sum + sessionSeconds(s, now), 0);
        return { operator: o, sessions: list.length, seconds: secs };
      })
      .sort((a, b) => b.seconds - a.seconds);

    const byPrinter = printers
      .map((p) => {
        const list = sessions.filter((s) => s.printer_id === p.id);
        const secs = list.reduce((sum, s) => sum + sessionSeconds(s, now), 0);
        return { printer: p, sessions: list.length, seconds: secs };
      })
      .sort((a, b) => b.seconds - a.seconds);

    return { todaySeconds, totalSeconds, laborCost, byOperator, byPrinter };
  }, [sessions, operators, printers]);

  const busyPrinterIds = new Set(active.map((s) => s.printer_id).filter(Boolean) as string[]);
  const openJobs = jobs.filter((j) => j.status === "queued" || j.status === "printing");

  async function startSession() {
    if (!printerId && !jobId && !label.trim()) {
      toast.error("Escolha um trabalho, uma impressora ou defina um rótulo.");
      return;
    }
    if (printerId && busyPrinterIds.has(printerId)) {
      toast.error("Esta impressora já está ocupada.");
      return;
    }
    await start.mutateAsync({
      job_id: jobId || null,
      printer_id: printerId || null,
      operator_id: operatorId || null,
      label: label.trim() || nameOf.job(jobId) || "Produção",
      notes: notes.trim(),
    });
    setJobId("");
    setPrinterId("");
    setLabel("");
    setNotes("");
    toast.success("Produção iniciada com sucesso.");
  }

  async function addOperator() {
    if (!opName.trim()) {
      toast.error("Dê um nome ao operador.");
      return;
    }
    await upsertOperator.mutateAsync({
      patch: { name: opName.trim(), role: opRole.trim(), hourly_cost: opCost, active: true },
    });
    setOpName("");
    setOpRole("");
    setOpCost(0);
    toast.success("Operador cadastrado.");
  }

  return (
    <AppShell
      title="Controle Operacional"
      subtitle="Acompanhe em tempo real as impressões em andamento, registre operadores e meça o tempo de máquina."
      icon={Activity}
    >
      {/* Top Stat Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Em operação agora" value={String(active.length)} />
        <Stat label="Tempo de máquina hoje" value={formatDuration(stats.todaySeconds)} />
        <Stat label="Total acumulado" value={formatDuration(stats.totalSeconds)} />
        <Stat label="Custo de mão de obra" value={money(stats.laborCost, currency)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Iniciar Trabalho */}
        <section className="apple-card space-y-4 p-6 lg:col-span-2">
          <h2 className="text-base font-semibold text-white">Iniciar produção</h2>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Trabalho da fila</Label>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger className="rounded-xl border-white/10 bg-[#16171f] text-xs">
                <SelectValue placeholder="Opcional — vincular trabalho" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#181922] text-xs">
                {openJobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.job_name} {j.customer_name ? ` · ${j.customer_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Impressora</Label>
            <Select value={printerId} onValueChange={setPrinterId}>
              <SelectTrigger className="rounded-xl border-white/10 bg-[#16171f] text-xs">
                <SelectValue placeholder="Selecionar máquina" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#181922] text-xs">
                {printers.map((p) => (
                  <SelectItem key={p.id} value={p.id} disabled={busyPrinterIds.has(p.id)}>
                    {p.name} {busyPrinterIds.has(p.id) ? "· em uso" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Operador</Label>
            <Select value={operatorId} onValueChange={setOperatorId}>
              <SelectTrigger className="rounded-xl border-white/10 bg-[#16171f] text-xs">
                <SelectValue placeholder="Quem está operando" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#181922] text-xs">
                {operators.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name} {o.role ? ` · ${o.role}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="label" className="text-xs font-medium text-muted-foreground">Rótulo customizado</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Lote suporte celular 10un"
              className="rounded-xl border-white/10 bg-[#16171f] text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-medium text-muted-foreground">Observações</Label>
            <Textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Bico 0.4, altura 0.2, preenchimento 20%…"
              className="rounded-xl border-white/10 bg-[#16171f] text-xs"
            />
          </div>

          <Button
            className="orange-btn w-full gap-2 py-2.5 text-xs"
            onClick={startSession}
            disabled={start.isPending}
          >
            <Play className="size-4" /> Iniciar cronômetro
          </Button>
        </section>

        {/* Trabalhos em Andamento */}
        <section className="apple-card p-6 lg:col-span-3">
          <h2 className="text-base font-semibold text-white">Trabalhos em andamento</h2>

          {active.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Nenhuma máquina imprimindo no momento.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {active.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-all"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {s.label || nameOf.job(s.job_id) || "Produção"}
                      </p>
                      <p className="label-tag mt-0.5">
                        {nameOf.printer(s.printer_id)} · {nameOf.operator(s.operator_id)}
                      </p>
                      {s.notes ? (
                        <p className="mt-1 text-xs text-muted-foreground">{s.notes}</p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p
                        className={`num text-2xl font-bold ${
                          s.status === "paused" ? "text-muted-foreground" : "text-primary"
                        }`}
                      >
                        {formatDuration(sessionSeconds(s))}
                      </p>
                      <p className="label-tag text-[9px]">
                        {s.status === "paused" ? "Pausado" : "Em andamento"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3.5 flex flex-wrap gap-2 border-t border-white/5 pt-3">
                    {s.status === "running" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg border-white/10 bg-white/5 text-xs text-white hover:bg-white/10"
                        onClick={() => act.mutate({ session: s, action: "pause" })}
                      >
                        <Pause className="size-3.5" /> Pausar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg border-orange-500/40 bg-orange-500/10 text-xs text-orange-400 hover:bg-orange-500/20"
                        onClick={() => act.mutate({ session: s, action: "resume" })}
                      >
                        <Play className="size-3.5" /> Retomar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25"
                      onClick={() => {
                        act.mutate({ session: s, action: "finish" });
                        toast.success("Produção concluída.");
                      }}
                    >
                      <CheckCircle2 className="size-3.5" /> Concluir
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-lg text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => act.mutate({ session: s, action: "cancel" })}
                    >
                      <XCircle className="size-3.5" /> Cancelar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Equipe & Uso por Impressora */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Equipe */}
        <section className="apple-card p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <UserRound className="size-3.5 text-primary" /> Equipe
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Input
              value={opName}
              onChange={(e) => setOpName(e.target.value)}
              placeholder="Nome"
              className="rounded-xl border-white/10 bg-[#16171f] text-xs"
            />
            <Input
              value={opRole}
              onChange={(e) => setOpRole(e.target.value)}
              placeholder="Função"
              className="rounded-xl border-white/10 bg-[#16171f] text-xs"
            />
            <Input
              type="number"
              min={0}
              step={1}
              value={opCost}
              onChange={(e) => setOpCost(Number(e.target.value) || 0)}
              placeholder="Custo/hora"
              className="rounded-xl border-white/10 bg-[#16171f] text-xs"
            />
          </div>
          <Button className="orange-btn mt-3 text-xs" size="sm" onClick={addOperator}>
            <Plus className="size-3.5" /> Adicionar operador
          </Button>

          <ul className="mt-4 space-y-2">
            {stats.byOperator.map(({ operator, sessions: n, seconds }) => (
              <li
                key={operator.id}
                className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{operator.name}</p>
                  <p className="label-tag text-[10px]">
                    {operator.role || "Operador"} · {money(Number(operator.hourly_cost), currency)}/h
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="num text-sm font-bold text-white">{formatDuration(seconds)}</p>
                    <p className="label-tag text-[9px]">{n} produções</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => removeOperator.mutate(operator.id)}
                    aria-label="Remover operador"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
            {operators.length === 0 ? (
              <li className="text-sm text-muted-foreground">
                Nenhum operador cadastrado ainda.
              </li>
            ) : null}
          </ul>
        </section>

        {/* Uso por Impressora */}
        <section className="apple-card p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Uso por impressora
          </div>
          <ul className="mt-4 space-y-3">
            {stats.byPrinter.map(({ printer, sessions: n, seconds }) => {
              const max = stats.byPrinter[0]?.seconds || 1;
              return (
                <li key={printer.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">{printer.name}</p>
                    <p className="num text-sm font-bold text-orange-400">{formatDuration(seconds)}</p>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-[#ff3b00]"
                      style={{ width: `${Math.min(100, (seconds / max) * 100)}%` }}
                    />
                  </div>
                  <p className="label-tag mt-1.5 text-[9px] text-muted-foreground">{n} produções</p>
                </li>
              );
            })}
            {printers.length === 0 ? (
              <li className="text-sm text-muted-foreground">Cadastre impressoras primeiro.</li>
            ) : null}
          </ul>
        </section>
      </div>

      {/* Histórico de Produção */}
      <section className="apple-card mt-6 p-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Histórico de produção
        </div>
        {history.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nenhuma produção finalizada ainda.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {history.map((s) => (
              <HistoryRow
                key={s.id}
                s={s}
                printer={nameOf.printer(s.printer_id)}
                operator={nameOf.operator(s.operator_id)}
                onDelete={() => removeSession.mutate(s.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function HistoryRow({
  s,
  printer,
  operator,
  onDelete,
}: {
  s: ProductionSession;
  printer: string;
  operator: string;
  onDelete: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div>
        <p className="text-sm font-medium text-white">
          {s.label || "Produção"}{" "}
          {s.status === "cancelled" ? (
            <span className="text-xs text-red-400">· cancelada</span>
          ) : null}
        </p>
        <p className="label-tag text-[10px] text-muted-foreground">
          {printer} · {operator} ·{" "}
          {new Date(s.started_at).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="num text-sm font-semibold text-white">{formatDuration(sessionSeconds(s))}</span>
        <Button size="icon" variant="ghost" onClick={onDelete} className="size-7 text-muted-foreground hover:text-red-400" aria-label="Excluir registro">
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </li>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Pause,
  Play,
  Plus,
  Trash2,
  UserRound,
  XCircle,
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
      { title: "Operacional — PrintHub Manager" },
      {
        name: "description",
        content:
          "Acompanhe impressoras em uso, cronometre o tempo de produção, registre quem produziu e veja o desempenho da equipe.",
      },
      { property: "og:title", content: "Operacional — PrintHub Manager" },
      {
        property: "og:description",
        content: "Impressoras em uso, cronômetro de produção e desempenho por operador.",
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
    operator: (id: string | null) => operators.find((o) => o.id === id)?.name ?? "Não informado",
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
      toast.error("Escolha um trabalho, uma impressora ou dê um nome à produção.");
      return;
    }
    if (printerId && busyPrinterIds.has(printerId)) {
      toast.error("Essa impressora já está em produção.");
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
    toast.success("Produção iniciada — cronômetro rodando.");
  }

  async function addOperator() {
    if (!opName.trim()) {
      toast.error("Informe o nome do operador.");
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
      title="Operacional"
      subtitle="Impressoras em uso, cronômetro de produção, responsáveis e histórico completo."
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Em produção agora" value={`${active.length} / ${printers.length}`} />
        <Stat label="Tempo produzido hoje" value={formatDuration(stats.todaySeconds)} />
        <Stat label="Tempo total acumulado" value={formatDuration(stats.totalSeconds)} />
        <Stat label="Custo de mão de obra" value={money(stats.laborCost, currency)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="panel space-y-4 p-6 lg:col-span-2">
          <div className="label-tag flex items-center gap-2">
            <Play className="size-3.5" /> Iniciar produção
          </div>

          <div className="space-y-2">
            <Label>Trabalho da fila</Label>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger>
                <SelectValue placeholder="Opcional — selecionar trabalho" />
              </SelectTrigger>
              <SelectContent>
                {openJobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.job_name}
                    {j.customer_name ? ` · ${j.customer_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Impressora</Label>
            <Select value={printerId} onValueChange={setPrinterId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar impressora" />
              </SelectTrigger>
              <SelectContent>
                {printers.map((p) => (
                  <SelectItem key={p.id} value={p.id} disabled={busyPrinterIds.has(p.id)}>
                    {p.name} {busyPrinterIds.has(p.id) ? "· em uso" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Operador responsável</Label>
            <Select value={operatorId} onValueChange={setOperatorId}>
              <SelectTrigger>
                <SelectValue placeholder="Quem está produzindo" />
              </SelectTrigger>
              <SelectContent>
                {operators.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                    {o.role ? ` · ${o.role}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Identificação (opcional)</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Lote de suportes — 12 peças"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajustes, material, camada…"
            />
          </div>

          <Button className="w-full" onClick={startSession} disabled={start.isPending}>
            <Play className="size-4" /> Iniciar cronômetro
          </Button>
        </section>

        <section className="panel p-6 lg:col-span-3">
          <div className="label-tag flex items-center gap-2">
            <Activity className="size-3.5" /> Em produção agora
          </div>

          {active.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhuma impressora em uso. Inicie uma produção ao lado.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {active.map((s) => (
                <li key={s.id} className="rounded-lg border border-border bg-surface-raised p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{s.label || nameOf.job(s.job_id) || "Produção"}</p>
                      <p className="label-tag mt-0.5">
                        {nameOf.printer(s.printer_id)} · {nameOf.operator(s.operator_id)}
                      </p>
                      {s.notes ? (
                        <p className="mt-1 text-xs text-muted-foreground">{s.notes}</p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p
                        className={`num text-2xl font-semibold ${
                          s.status === "paused" ? "text-muted-foreground" : "text-primary"
                        }`}
                      >
                        {formatDuration(sessionSeconds(s))}
                      </p>
                      <p className="label-tag">
                        {s.status === "paused" ? "Pausado" : "Em andamento"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {s.status === "running" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => act.mutate({ session: s, action: "pause" })}
                      >
                        <Pause className="size-4" /> Pausar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => act.mutate({ session: s, action: "resume" })}
                      >
                        <Play className="size-4" /> Retomar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => {
                        act.mutate({ session: s, action: "finish" });
                        toast.success("Produção concluída.");
                      }}
                    >
                      <CheckCircle2 className="size-4" /> Concluir
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => act.mutate({ session: s, action: "cancel" })}
                    >
                      <XCircle className="size-4" /> Cancelar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel p-6">
          <div className="label-tag flex items-center gap-2">
            <UserRound className="size-3.5" /> Equipe
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Input
              value={opName}
              onChange={(e) => setOpName(e.target.value)}
              placeholder="Nome"
            />
            <Input
              value={opRole}
              onChange={(e) => setOpRole(e.target.value)}
              placeholder="Função"
            />
            <Input
              type="number"
              min={0}
              step={1}
              value={opCost}
              onChange={(e) => setOpCost(Number(e.target.value) || 0)}
              placeholder="Custo/hora"
            />
          </div>
          <Button className="mt-3" size="sm" onClick={addOperator}>
            <Plus className="size-4" /> Adicionar operador
          </Button>

          <ul className="mt-4 space-y-2">
            {stats.byOperator.map(({ operator, sessions: n, seconds }) => (
              <li
                key={operator.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{operator.name}</p>
                  <p className="label-tag">
                    {operator.role || "Operador"} · {money(Number(operator.hourly_cost), currency)}/h
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="num text-sm font-semibold">{formatDuration(seconds)}</p>
                    <p className="label-tag">{n} produções</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeOperator.mutate(operator.id)}
                    aria-label="Remover operador"
                  >
                    <Trash2 className="size-4 text-rose-accent" />
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

        <section className="panel p-6">
          <div className="label-tag">Uso por impressora</div>
          <ul className="mt-4 space-y-2">
            {stats.byPrinter.map(({ printer, sessions: n, seconds }) => {
              const max = stats.byPrinter[0]?.seconds || 1;
              return (
                <li key={printer.id} className="rounded-lg border border-border bg-surface-raised p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{printer.name}</p>
                    <p className="num text-sm">{formatDuration(seconds)}</p>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-border">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{ width: `${Math.min(100, (seconds / max) * 100)}%` }}
                    />
                  </div>
                  <p className="label-tag mt-1">{n} produções</p>
                </li>
              );
            })}
            {printers.length === 0 ? (
              <li className="text-sm text-muted-foreground">Cadastre impressoras primeiro.</li>
            ) : null}
          </ul>
        </section>
      </div>

      <section className="panel mt-6 p-6">
        <div className="label-tag">Histórico de produção</div>
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
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised px-4 py-3">
      <div>
        <p className="text-sm font-medium">
          {s.label || "Produção"}{" "}
          {s.status === "cancelled" ? (
            <span className="text-xs text-rose-accent">· cancelada</span>
          ) : null}
        </p>
        <p className="label-tag">
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
        <span className="num text-sm font-semibold">{formatDuration(sessionSeconds(s))}</span>
        <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Excluir registro">
          <Trash2 className="size-4 text-rose-accent" />
        </Button>
      </div>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <p className="label-tag">{label}</p>
      <p className="num mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

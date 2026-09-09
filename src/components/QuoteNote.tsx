import { useEffect, useState } from "react";
import { Copy, Download, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { money } from "@/lib/farm";

export type QuoteBranding = {
  companyName: string;
  document: string;
  contact: string;
  address: string;
  logoUrl: string;
  accent: string;
  validityDays: number;
  paymentTerms: string;
  notes: string;
  showBreakdown: boolean;
};

const STORAGE_KEY = "printhub.quote.branding";

const DEFAULT_BRANDING: QuoteBranding = {
  companyName: "PrintHub Manager",
  document: "",
  contact: "",
  address: "",
  logoUrl: "",
  accent: "#22d3ee",
  validityDays: 7,
  paymentTerms: "50% na aprovação, 50% na entrega.",
  notes: "Prazo de produção informado após aprovação do orçamento.",
  showBreakdown: true,
};

export type QuoteData = {
  jobName: string;
  customerName: string;
  filament: string;
  printer: string;
  weightGrams: number;
  hours: number;
  setupFee: number;
  materialCost: number;
  energyCost: number;
  totalCost: number;
  profit: number;
  finalPrice: number;
  currency: string;
};

function loadBranding(): QuoteBranding {
  if (typeof window === "undefined") return DEFAULT_BRANDING;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_BRANDING, ...JSON.parse(raw) } : DEFAULT_BRANDING;
  } catch {
    return DEFAULT_BRANDING;
  }
}

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function quoteNumber() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

function buildHtml(b: QuoteBranding, q: QuoteData, num: string) {
  const today = new Date();
  const valid = new Date(today.getTime() + b.validityDays * 86400000);
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR");
  const row = (l: string, v: string) =>
    `<tr><td>${esc(l)}</td><td class="r">${esc(v)}</td></tr>`;

  const breakdown = b.showBreakdown
    ? `<h3>Detalhamento de custos</h3>
       <table class="t">
         ${row("Material", money(q.materialCost, q.currency))}
         ${row("Energia", money(q.energyCost, q.currency))}
         ${row("Preparo / mão de obra", money(q.setupFee, q.currency))}
       </table>`
    : "";

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Orçamento ${esc(num)} — ${esc(b.companyName)}</title>
<style>
:root{--a:${esc(b.accent)}}
*{box-sizing:border-box}
body{font-family:"Helvetica Neue",Arial,sans-serif;color:#111;margin:0;padding:40px;background:#fff}
.wrap{max-width:760px;margin:0 auto}
header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:3px solid var(--a);padding-bottom:16px}
.logo{max-height:64px;max-width:200px;object-fit:contain}
h1{font-size:20px;margin:0 0 4px}
h3{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#666;margin:28px 0 8px}
.muted{color:#555;font-size:12px;line-height:1.6;margin:0}
.meta{text-align:right;font-size:12px;color:#555;line-height:1.7}
.t{width:100%;border-collapse:collapse;font-size:13px}
.t td{padding:8px 0;border-bottom:1px solid #eee}
.t td.r{text-align:right;font-variant-numeric:tabular-nums}
.total{margin-top:24px;background:var(--a);color:#04222a;border-radius:10px;padding:18px 22px;display:flex;justify-content:space-between;align-items:center}
.total b{font-size:26px;font-variant-numeric:tabular-nums}
footer{margin-top:32px;border-top:1px solid #eee;padding-top:14px;font-size:11px;color:#777;line-height:1.7}
@media print{body{padding:0}}
</style></head><body><div class="wrap">
<header>
  <div>
    ${b.logoUrl ? `<img class="logo" src="${esc(b.logoUrl)}" alt="${esc(b.companyName)}">` : `<h1>${esc(b.companyName)}</h1>`}
    <p class="muted">${[b.document, b.contact, b.address].filter(Boolean).map(esc).join("<br>")}</p>
  </div>
  <div class="meta">
    <strong>ORÇAMENTO Nº ${esc(num)}</strong><br>
    Emissão: ${fmt(today)}<br>
    Válido até: ${fmt(valid)}
  </div>
</header>

<h3>Cliente</h3>
<p class="muted">${esc(q.customerName || "—")}</p>

<h3>Serviço</h3>
<table class="t">
  ${row("Trabalho", q.jobName || "—")}
  ${row("Material", q.filament || "—")}
  ${row("Impressora", q.printer || "A definir")}
  ${row("Peso estimado", `${q.weightGrams} g`)}
  ${row("Tempo de impressão", `${q.hours} h`)}
</table>

${breakdown}

<div class="total"><span>Valor total</span><b>${esc(money(q.finalPrice, q.currency))}</b></div>

${b.paymentTerms ? `<h3>Condições de pagamento</h3><p class="muted">${esc(b.paymentTerms)}</p>` : ""}
${b.notes ? `<h3>Observações</h3><p class="muted">${esc(b.notes)}</p>` : ""}

<footer>Documento gerado por ${esc(b.companyName)} em ${fmt(today)}. Valores sujeitos a alteração após a data de validade.</footer>
</div></body></html>`;
}

function buildText(b: QuoteBranding, q: QuoteData, num: string) {
  const lines = [
    `${b.companyName} — Orçamento nº ${num}`,
    `Cliente: ${q.customerName || "—"}`,
    `Trabalho: ${q.jobName || "—"}`,
    `Material: ${q.filament || "—"} · ${q.weightGrams} g · ${q.hours} h`,
  ];
  if (b.showBreakdown) {
    lines.push(
      `Material: ${money(q.materialCost, q.currency)}`,
      `Energia: ${money(q.energyCost, q.currency)}`,
      `Preparo: ${money(q.setupFee, q.currency)}`,
    );
  }
  lines.push(`TOTAL: ${money(q.finalPrice, q.currency)}`);
  if (b.paymentTerms) lines.push(`Pagamento: ${b.paymentTerms}`);
  if (b.notes) lines.push(b.notes);
  lines.push(`Validade: ${b.validityDays} dias`);
  return lines.join("\n");
}

export function QuoteNoteDialog({ quote }: { quote: QuoteData }) {
  const [open, setOpen] = useState(false);
  const [b, setB] = useState<QuoteBranding>(DEFAULT_BRANDING);
  const [num, setNum] = useState("");

  useEffect(() => {
    setB(loadBranding());
  }, []);

  useEffect(() => {
    if (open && !num) setNum(quoteNumber());
  }, [open, num]);

  const set = <K extends keyof QuoteBranding>(k: K, v: QuoteBranding[K]) => {
    const next = { ...b, [k]: v };
    setB(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const html = buildHtml(b, quote, num || "0000");

  function printNote() {
    const w = window.open("", "_blank", "width=880,height=1000");
    if (!w) {
      toast.error("Permita pop-ups para imprimir a nota.");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  }

  function downloadNote() {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orcamento-${num || "0000"}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Nota de orçamento baixada.");
  }

  async function copyText() {
    await navigator.clipboard.writeText(buildText(b, quote, num || "0000"));
    toast.success("Resumo copiado para envio ao cliente.");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" size="lg">
          <FileText className="size-4" />
          Gerar nota de orçamento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nota de orçamento</DialogTitle>
          <DialogDescription>
            Personalize os dados da sua empresa, veja a prévia e exporte para enviar ao cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Empresa">
                <Input value={b.companyName} onChange={(e) => set("companyName", e.target.value)} />
              </Field>
              <Field label="CNPJ / CPF">
                <Input value={b.document} onChange={(e) => set("document", e.target.value)} placeholder="00.000.000/0001-00" />
              </Field>
              <Field label="Contato">
                <Input value={b.contact} onChange={(e) => set("contact", e.target.value)} placeholder="(85) 90000-0000 · email" />
              </Field>
              <Field label="Endereço">
                <Input value={b.address} onChange={(e) => set("address", e.target.value)} />
              </Field>
              <Field label="Logo (URL)">
                <Input value={b.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://..." />
              </Field>
              <Field label="Cor de destaque">
                <Input type="color" value={b.accent} onChange={(e) => set("accent", e.target.value)} className="h-10 p-1" />
              </Field>
              <Field label="Validade (dias)">
                <Input
                  type="number"
                  min={1}
                  value={b.validityDays}
                  onChange={(e) => set("validityDays", Number(e.target.value) || 1)}
                />
              </Field>
              <Field label="Nº do orçamento">
                <Input value={num} onChange={(e) => setNum(e.target.value)} />
              </Field>
            </div>

            <Field label="Condições de pagamento">
              <Textarea rows={2} value={b.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} />
            </Field>
            <Field label="Observações">
              <Textarea rows={3} value={b.notes} onChange={(e) => set("notes", e.target.value)} />
            </Field>

            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-4 py-3">
              <Label htmlFor="bd">Mostrar detalhamento de custos</Label>
              <Switch id="bd" checked={b.showBreakdown} onCheckedChange={(v) => set("showBreakdown", v)} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={printNote}>
                <Printer className="size-4" /> Imprimir / PDF
              </Button>
              <Button variant="outline" onClick={downloadNote}>
                <Download className="size-4" /> Baixar
              </Button>
              <Button variant="outline" onClick={copyText}>
                <Copy className="size-4" /> Copiar resumo
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <iframe title="Prévia da nota" srcDoc={html} className="h-[560px] w-full" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  Copy,
  Download,
  FileText,
  Printer,
  Check,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  Layers,
  Settings2,
  ExternalLink,
  Eye,
} from "lucide-react";
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
import brandLogo from "@/assets/focus-lab-logo-cropped.png";

export type QuoteBranding = {
  companyName: string;
  document: string;
  contact: string;
  email: string;
  address: string;
  logoUrl: string;
  accent: string;
  validityDays: number;
  paymentTerms: string;
  notes: string;
  showBreakdown: boolean;
};

const STORAGE_KEY = "focus.quote.branding.v2";

const DEFAULT_BRANDING: QuoteBranding = {
  companyName: "Focus Lab",
  document: "48.912.834/0001-90",
  contact: "+55 (11) 98765-4321",
  email: "contato@focuslab.tech",
  address: "Av. Paulista, 1000 — São Paulo, SP",
  logoUrl: "",
  accent: "#ff6600",
  validityDays: 10,
  paymentTerms: "50% de sinal na aprovação do projeto e 50% na expedição/entrega das peças.",
  notes: "Produção iniciada após validação técnica. Tolerâncias dimensionais conforme especificação do fatiador.",
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
  v ? v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";

function quoteNumber() {
  const d = new Date();
  return `PROP-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    Math.floor(Math.random() * 9000) + 1000
  )}`;
}

function buildHtml(b: QuoteBranding, q: QuoteData, num: string, logoSrc: string) {
  const today = new Date();
  const valid = new Date(today.getTime() + b.validityDays * 86400000);
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR");
  const effectiveLogo = b.logoUrl ? b.logoUrl : logoSrc;

  const breakdown = b.showBreakdown
    ? `<div class="sec-title">Detalhamento de Custos de Produção</div>
       <table class="t">
         <thead>
           <tr>
             <th>Item de Custo</th>
             <th style="text-align:right">Valor</th>
           </tr>
         </thead>
         <tbody>
           <tr><td>Matéria-prima (${q.weightGrams}g ${esc(q.filament || "Filamento")})</td><td class="r">${esc(money(q.materialCost, q.currency))}</td></tr>
           <tr><td>Energia Elétrica (${q.hours}h de máquina)</td><td class="r">${esc(money(q.energyCost, q.currency))}</td></tr>
           <tr><td>Preparação, Setup e Pós-processamento</td><td class="r">${esc(money(q.setupFee, q.currency))}</td></tr>
         </tbody>
       </table>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Orçamento Comercial Nº ${esc(num)} — ${esc(b.companyName)}</title>
  <style>
    :root {
      --primary: #ff6600;
      --dark: #0a0b10;
      --card-bg: #111218;
      --border: #222430;
      --text-muted: #71717a;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif;
      color: #18181b;
      margin: 0;
      padding: 30px;
      background: #f4f4f6;
      -webkit-font-smoothing: antialiased;
    }
    .sheet {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.08);
      padding: 44px;
      border: 1px solid #e4e4e7;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid var(--primary);
      padding-bottom: 24px;
      margin-bottom: 28px;
    }
    .logo-img {
      height: 48px;
      width: auto;
      object-fit: contain;
      display: block;
      margin-bottom: 12px;
    }
    .company-meta {
      font-size: 11.5px;
      color: #52525b;
      line-height: 1.55;
    }
    .meta-box {
      text-align: right;
      background: #ffffff;
      border: 1px solid #e4e4e7;
      border-radius: 8px;
      padding: 12px 16px;
    }
    .meta-num {
      font-size: 13px;
      font-weight: 800;
      color: var(--primary);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      letter-spacing: 0.04em;
    }
    .meta-date {
      font-size: 11px;
      color: #52525b;
      margin-top: 4px;
      line-height: 1.5;
    }
    .client-card {
      background: #fbfbfb;
      border: 1px solid #ebebef;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 24px;
    }
    .client-label {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--primary);
      letter-spacing: 0.06em;
      margin-bottom: 2px;
    }
    .client-name {
      font-size: 15px;
      font-weight: 700;
      color: #09090b;
    }
    .sec-title {
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #71717a;
      margin: 24px 0 10px;
      font-weight: 700;
      border-left: 3px solid var(--primary);
      padding-left: 8px;
    }
    .t {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
      margin-bottom: 12px;
    }
    .t th {
      text-align: left;
      font-size: 10.5px;
      text-transform: uppercase;
      color: #71717a;
      border-bottom: 1.5px solid #e4e4e7;
      padding: 8px 0;
      letter-spacing: 0.04em;
    }
    .t td {
      padding: 10px 0;
      border-bottom: 1px solid #f4f4f5;
      color: #27272a;
    }
    .t td.r {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      color: #09090b;
    }
    .total-card {
      margin-top: 28px;
      background: #ffffff;
      color: #09090b;
      border-radius: 10px;
      padding: 22px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1.5px solid #e4e4e7;
      box-shadow: 0 4px 16px rgba(0,0,0,0.03);
    }
    .total-title {
      font-size: 11.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #09090b;
    }
    .total-desc {
      font-size: 11px;
      color: #52525b;
      margin-top: 3px;
    }
    .total-val {
      font-size: 28px;
      font-weight: 800;
      color: #09090b;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
      font-variant-numeric: tabular-nums;
    }
    .terms-box {
      margin-top: 24px;
      font-size: 11.5px;
      color: #52525b;
      line-height: 1.6;
    }
    .terms-box strong {
      color: #18181b;
    }
    .footer {
      margin-top: 36px;
      border-top: 1px solid #e4e4e7;
      padding-top: 18px;
      font-size: 10.5px;
      color: #a1a1aa;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    @media print {
      body { padding: 0; background: #fff; }
      .sheet { border: none; box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <img class="logo-img" src="${esc(effectiveLogo)}" alt="${esc(b.companyName)}">
        <div class="company-meta">
          ${[b.document ? `CNPJ: ${b.document}` : "", b.contact, b.email, b.address].filter(Boolean).map(esc).join(" &middot; ")}
        </div>
      </div>
      <div class="meta-box">
        <div class="meta-num">${esc(num)}</div>
        <div class="meta-date">
          Emissão: <strong>${fmt(today)}</strong><br>
          Validade: <strong>${fmt(valid)}</strong> (${b.validityDays} dias)
        </div>
      </div>
    </div>

    <div class="client-card">
      <div class="client-label">Cliente / Solicitante</div>
      <div class="client-name">${esc(q.customerName || "Cliente não informado")}</div>
    </div>

    <div class="sec-title">Especificações do Projeto & Manufatura 3D</div>
    <table class="t">
      <thead>
        <tr>
          <th>Parâmetro</th>
          <th style="text-align:right">Especificação</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Nome do Trabalho / Peça</td><td class="r">${esc(q.jobName || "Protótipo 3D")}</td></tr>
        <tr><td>Material & Filamento</td><td class="r">${esc(q.filament || "Polímero de Engenharia")}</td></tr>
        <tr><td>Impressora / Hardware</td><td class="r">${esc(q.printer || "Parque Focus Lab")}</td></tr>
        <tr><td>Massa / Peso Estimado</td><td class="r">${q.weightGrams} g</td></tr>
        <tr><td>Tempo Estimado de Fabricação</td><td class="r">${q.hours} horas</td></tr>
      </tbody>
    </table>

    ${breakdown}

    <div class="total-card">
      <div>
        <div class="total-title">Investimento Total do Serviço</div>
        <div class="total-desc">Inclui material, processamento e impostos</div>
      </div>
      <div class="total-val">${esc(money(q.finalPrice, q.currency))}</div>
    </div>

    <div class="terms-box">
      ${b.paymentTerms ? `<p><strong>Condições de Pagamento:</strong> ${esc(b.paymentTerms)}</p>` : ""}
      ${b.notes ? `<p><strong>Observações Técnicas:</strong> ${esc(b.notes)}</p>` : ""}
    </div>

    <div class="footer">
      <span>Focus Lab Production OS &middot; Manufatura 3D sob Demanda</span>
      <span>Documento Válido Digitalmente</span>
    </div>
  </div>
</body>
</html>`;
}

function buildText(b: QuoteBranding, q: QuoteData, num: string) {
  const lines = [
    `*FOCUS LAB — ORÇAMENTO COMERCIAL Nº ${num}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 *Cliente:* ${q.customerName || "—"}`,
    `📦 *Peça:* ${q.jobName || "—"}`,
    `🧵 *Material:* ${q.filament || "—"}`,
    `⚖️ *Peso Estimado:* ${q.weightGrams}g`,
    `⏱️ *Tempo de Produção:* ${q.hours}h`,
  ];
  if (b.showBreakdown) {
    lines.push(
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💰 *Material:* ${money(q.materialCost, q.currency)}`,
      `⚡ *Energia:* ${money(q.energyCost, q.currency)}`,
      `🛠️ *Setup/Mão de obra:* ${money(q.setupFee, q.currency)}`
    );
  }
  lines.push(
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🏷️ *VALOR TOTAL: ${money(q.finalPrice, q.currency)}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `💳 *Pagamento:* ${b.paymentTerms}`,
    `📅 *Validade:* ${b.validityDays} dias`,
    `📝 *Obs:* ${b.notes}`
  );
  return lines.join("\n");
}

export function QuoteNoteDialog({ quote }: { quote: QuoteData }) {
  const [open, setOpen] = useState(false);
  const [b, setB] = useState<QuoteBranding>(DEFAULT_BRANDING);
  const [num, setNum] = useState("");
  const [activeView, setActiveView] = useState<"preview" | "settings">("preview");

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
    } catch {}
  };

  const html = buildHtml(b, quote, num || "0000", brandLogo);

  function printNote() {
    const w = window.open("", "_blank", "width=920,height=1000");
    if (!w) {
      toast.error("Permita pop-ups no navegador para imprimir a nota.");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  }

  function downloadNote() {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orcamento-${num || "0000"}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Orçamento comercial baixado em HTML.");
  }

  async function copyText() {
    await navigator.clipboard.writeText(buildText(b, quote, num || "0000"));
    toast.success("Resumo para WhatsApp copiado para a área de transferência!");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full h-11 rounded-xl border-white/10 bg-white/5 text-sm font-semibold text-white hover:bg-white/10 transition-colors shadow-sm"
          size="lg"
        >
          <FileText className="size-4 mr-2 text-primary" />
          Gerar Orçamento Comercial (PDF / HTML)
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d12] text-white p-0 shadow-2xl flex flex-col">
        {/* Modal Top Header */}
        <div className="border-b border-white/[0.08] bg-[#111218] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={brandLogo}
              alt="Focus Lab"
              className="h-8 w-auto object-contain"
            />
            <div className="border-l border-white/10 pl-3">
              <DialogTitle className="text-sm font-bold text-white tracking-tight">
                Orçamento Comercial &amp; Nota Técnica
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Documento técnico com logo oficial pronto para exportação e envio ao cliente.
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#181920] border border-white/10 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveView("preview")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeView === "preview"
                    ? "bg-[#ff6600] text-black shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Eye className="size-3.5" />
                <span>Prévia do Documento</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView("settings")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeView === "settings"
                    ? "bg-[#ff6600] text-black shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Settings2 className="size-3.5" />
                <span>Personalizar Dados</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeView === "preview" ? (
            <div className="grid gap-6 lg:grid-cols-12 items-start">
              {/* Left Action Summary Bar (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="apple-card p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Resumo do Orçamento
                    </span>
                    <span className="font-mono text-xs font-bold text-primary">{num}</span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="text-muted-foreground">Cliente:</p>
                    <p className="text-white font-semibold text-sm">{quote.customerName || "Não informado"}</p>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="text-muted-foreground">Peça / Trabalho:</p>
                    <p className="text-white font-semibold">{quote.jobName || "Protótipo 3D"}</p>
                  </div>

                  <div className="border-t border-white/5 pt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Valor Total:</p>
                    <p className="text-2xl font-bold text-primary font-mono mt-0.5">
                      {money(quote.finalPrice, quote.currency)}
                    </p>
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={printNote}
                      className="orange-btn w-full flex items-center justify-center gap-2 h-10 text-xs font-bold"
                    >
                      <Printer className="size-4" />
                      <span>Imprimir / Exportar PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={downloadNote}
                      className="w-full flex items-center justify-center gap-2 h-10 rounded-lg border border-white/10 bg-white/5 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
                    >
                      <Download className="size-4 text-primary" />
                      <span>Baixar Arquivo HTML</span>
                    </button>

                    <button
                      type="button"
                      onClick={copyText}
                      className="w-full flex items-center justify-center gap-2 h-10 rounded-lg border border-white/10 bg-white/5 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
                    >
                      <Copy className="size-4 text-primary" />
                      <span>Copiar Resumo WhatsApp</span>
                    </button>
                  </div>
                </div>

                {/* Breakdown Switch Card */}
                <div className="apple-card p-4 flex items-center justify-between text-xs">
                  <span className="text-zinc-200 font-medium">Detalhamento de Custos no Orçamento</span>
                  <Switch
                    checked={b.showBreakdown}
                    onCheckedChange={(v) => set("showBreakdown", v)}
                  />
                </div>
              </div>

              {/* Right Document Sheet Preview (8 cols) */}
              <div className="lg:col-span-8 overflow-hidden rounded-xl border border-white/15 bg-white shadow-2xl">
                <iframe
                  title="Prévia do Orçamento"
                  srcDoc={html}
                  className="h-[620px] w-full bg-white border-0"
                />
              </div>
            </div>
          ) : (
            /* Settings View */
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="border border-white/10 bg-[#14151e] p-5 rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                  <Building2 className="size-4 text-primary" />
                  <span>Dados Cadastrais da Empresa Emissora</span>
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nome da Empresa">
                    <Input
                      value={b.companyName}
                      onChange={(e) => set("companyName", e.target.value)}
                      className="apple-input text-xs h-9"
                    />
                  </Field>
                  <Field label="CNPJ / Documento">
                    <Input
                      value={b.document}
                      onChange={(e) => set("document", e.target.value)}
                      placeholder="00.000.000/0001-00"
                      className="apple-input text-xs h-9"
                    />
                  </Field>
                  <Field label="Telefone / WhatsApp">
                    <Input
                      value={b.contact}
                      onChange={(e) => set("contact", e.target.value)}
                      placeholder="(11) 90000-0000"
                      className="apple-input text-xs h-9"
                    />
                  </Field>
                  <Field label="E-mail de Contato">
                    <Input
                      value={b.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="contato@empresa.com"
                      className="apple-input text-xs h-9"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Endereço / Cidade">
                      <Input
                        value={b.address}
                        onChange={(e) => set("address", e.target.value)}
                        placeholder="Rua, Número, Bairro, Cidade - UF"
                        className="apple-input text-xs h-9"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              <div className="border border-white/10 bg-[#14151e] p-5 rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                  <Calendar className="size-4 text-primary" />
                  <span>Condições Comerciais &amp; Validade</span>
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Validade do Orçamento (Dias)">
                    <Input
                      type="number"
                      min={1}
                      value={b.validityDays}
                      onChange={(e) => set("validityDays", Number(e.target.value) || 1)}
                      className="apple-input text-xs h-9 font-mono"
                    />
                  </Field>
                  <Field label="Número do Orçamento">
                    <Input
                      value={num}
                      onChange={(e) => setNum(e.target.value)}
                      className="apple-input text-xs h-9 font-mono"
                    />
                  </Field>
                </div>

                <Field label="Condições de Pagamento">
                  <Textarea
                    rows={2}
                    value={b.paymentTerms}
                    onChange={(e) => set("paymentTerms", e.target.value)}
                    className="apple-input text-xs min-h-[60px]"
                  />
                </Field>

                <Field label="Observações Técnicas / Garantia">
                  <Textarea
                    rows={2}
                    value={b.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    className="apple-input text-xs min-h-[60px]"
                  />
                </Field>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveView("preview")}
                  className="orange-btn px-6 py-2.5 text-xs font-semibold"
                >
                  Salvar e Ver Prévia do Documento
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

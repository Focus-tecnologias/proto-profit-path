import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  ShoppingBag,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCode,
  Box,
  Clock,
  Printer as PrinterIcon,
  Trash2,
  Download,
  RotateCcw,
  Link2,
  Image as ImageIcon,
  Check,
  DollarSign,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  money,
  useCreateOrder,
  useDeleteOrder,
  useJobs,
  useOrders,
  usePrinters,
  useSettings,
  useUpdateOrderStatus,
  type Order,
  type OrderPriority,
  type OrderStatus,
} from "@/lib/farm";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Ordens de Pedidos — Focus Lab" },
      {
        name: "description",
        content:
          "Triagem técnica de pedidos 3D, aprovação para manufatura, gestão de reprovações e envio direto para produção.",
      },
    ],
  }),
  component: OrdersPage,
});

const REJECTION_PRESETS = [
  "Inviabilidade geométrica: paredes finas (<0.8mm) ou balanços excessivos sem suporte.",
  "Arquivo corrompido / malha 3D aberta com faces invertidas.",
  "Falta de filamento / matéria-prima em estoque para a especificação solicitada.",
  "Prazo de entrega inviável para a capacidade atual do parque de máquinas.",
  "Necessidade de reorçamento: geometria demanda mais material/tempo do que o cotado.",
  "Outro motivo técnico específico.",
];

export function OrdersPage() {
  const { data: orders = [] } = useOrders();
  const { data: jobs = [] } = useJobs();
  const { data: printers = [] } = usePrinters();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "R$";

  const createOrder = useCreateOrder();
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<"all" | OrderStatus>("all");
  const [search, setSearch] = useState("");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [approveOrderModal, setApproveOrderModal] = useState<Order | null>(null);
  const [rejectOrderModal, setRejectOrderModal] = useState<Order | null>(null);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");

  // Form state for new Order
  const [formData, setFormData] = useState<{
    customer_name: string;
    title: string;
    dim_x: number;
    dim_y: number;
    dim_z: number;
    file_name: string;
    file_size: string;
    image_url: string;
    quote_id: string;
    material_type: string;
    quantity: number;
    weight_grams: number;
    print_time_hours: number;
    total_price: number;
    due_date: string;
    priority: OrderPriority;
    notes: string;
  }>({
    customer_name: "",
    title: "",
    dim_x: 60,
    dim_y: 60,
    dim_z: 40,
    file_name: "",
    file_size: "3.5 MB",
    image_url: "",
    quote_id: "",
    material_type: "PETG Carbono",
    quantity: 1,
    weight_grams: 120,
    print_time_hours: 4.5,
    total_price: 150.0,
    due_date: "",
    priority: "normal",
    notes: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchTab =
        activeTab === "all"
          ? true
          : activeTab === "in_production"
          ? o.status === "in_production" || o.status === "approved"
          : o.status === activeTab;

      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.title.toLowerCase().includes(q) ||
        o.material_type.toLowerCase().includes(q);

      return matchTab && matchSearch;
    });
  }, [orders, activeTab, search]);

  // Counts for KPIs
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "pending").length;
    const inProduction = orders.filter((o) => o.status === "in_production" || o.status === "approved").length;
    const rejected = orders.filter((o) => o.status === "rejected").length;
    const completed = orders.filter((o) => o.status === "completed").length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);

    return { total, pending, inProduction, rejected, completed, totalRevenue };
  }, [orders]);

  // Handle quote integration
  const handleQuoteSelect = (quoteId: string) => {
    if (quoteId === "none") {
      setFormData((prev) => ({ ...prev, quote_id: "" }));
      return;
    }
    const foundJob = jobs.find((j) => j.id === quoteId);
    if (foundJob) {
      setFormData((prev) => ({
        ...prev,
        quote_id: foundJob.id,
        customer_name: foundJob.customer_name || prev.customer_name,
        title: foundJob.job_name || prev.title,
        weight_grams: Number(foundJob.weight_grams) || prev.weight_grams,
        print_time_hours: Number(foundJob.print_time_hours) || prev.print_time_hours,
        total_price: Number(foundJob.total_price) || prev.total_price,
      }));
      toast.info(`Dados integrados do orçamento "${foundJob.job_name}"`);
    }
  };

  // Handle File uploads
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + " MB";
      setFormData((prev) => ({
        ...prev,
        file_name: file.name,
        file_size: sizeMb,
      }));
      toast.success(`Arquivo 3D "${file.name}" anexado.`);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          image_url: reader.result as string,
        }));
        toast.success("Foto de referência carregada.");
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit new Order
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name.trim() || !formData.title.trim()) {
      toast.error("Informe o nome do cliente e da peça.");
      return;
    }

    const payload: Partial<Order> = {
      customer_name: formData.customer_name.trim(),
      title: formData.title.trim(),
      dimensions_xyz: `${formData.dim_x} x ${formData.dim_y} x ${formData.dim_z} mm`,
      dim_x: formData.dim_x,
      dim_y: formData.dim_y,
      dim_z: formData.dim_z,
      file_name: formData.file_name || "projeto_3d.stl",
      file_size: formData.file_size,
      image_url: formData.image_url || undefined,
      quote_id: formData.quote_id || null,
      material_type: formData.material_type,
      quantity: Number(formData.quantity),
      weight_grams: Number(formData.weight_grams),
      print_time_hours: Number(formData.print_time_hours),
      total_price: Number(formData.total_price),
      due_date: formData.due_date || undefined,
      priority: formData.priority,
      notes: formData.notes,
    };

    await createOrder.mutateAsync(payload);

    toast.success("Ordem de pedido criada e enviada para triagem.");
    setIsCreateOpen(false);
    setFormData({
      customer_name: "",
      title: "",
      dim_x: 60,
      dim_y: 60,
      dim_z: 40,
      file_name: "",
      file_size: "3.5 MB",
      image_url: "",
      quote_id: "",
      material_type: "PETG Carbono",
      quantity: 1,
      weight_grams: 120,
      print_time_hours: 4.5,
      total_price: 150.0,
      due_date: "",
      priority: "normal",
      notes: "",
    });
  };

  // Approve action
  const confirmApprove = async () => {
    if (!approveOrderModal) return;
    await updateStatus.mutateAsync({
      id: approveOrderModal.id,
      status: "in_production",
      assigned_printer_id: selectedPrinterId || null,
    });
    toast.success(`Pedido ${approveOrderModal.order_number} APROVADO e enviado para produção!`);
    setApproveOrderModal(null);
    setSelectedPrinterId("");
  };

  // Reject action
  const confirmReject = async () => {
    if (!rejectOrderModal) return;
    if (!rejectionReason.trim()) {
      toast.error("Informe o motivo técnico da reprovação.");
      return;
    }
    await updateStatus.mutateAsync({
      id: rejectOrderModal.id,
      status: "rejected",
      rejection_reason: rejectionReason.trim(),
    });
    toast.error(`Pedido ${rejectOrderModal.order_number} REPROVADO e movido para Análise.`);
    setRejectOrderModal(null);
    setRejectionReason("");
  };

  // Reopen action
  const handleReopen = async (order: Order) => {
    await updateStatus.mutateAsync({
      id: order.id,
      status: "pending",
      rejection_reason: "",
    });
    toast.info(`Pedido ${order.order_number} reaberto e enviado de volta para triagem.`);
  };

  // Complete action
  const handleComplete = async (order: Order) => {
    await updateStatus.mutateAsync({
      id: order.id,
      status: "completed",
    });
    toast.success(`Pedido ${order.order_number} marcado como concluído!`);
  };

  // Delete action
  const handleDelete = async (order: Order) => {
    if (confirm(`Deseja realmente excluir a ordem ${order.order_number}?`)) {
      await deleteOrder.mutateAsync(order.id);
      toast.success("Pedido excluído.");
    }
  };

  return (
    <AppShell
      title="Ordens de Pedidos"
      subtitle="Triagem de arquivos 3D, especificações, aprovação técnica, gestão de reprovações e envio à produção."
      icon={ShoppingBag}
    >
      {/* Top Action & KPI Strip */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pipeline de Ordens:
          </span>
          <span className="border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-white">
            {stats.total} Total
          </span>
          <span className="border border-[#ff6600]/40 bg-[#ff6600]/10 px-2.5 py-1 text-xs font-bold text-[#ff6600]">
            {stats.pending} Em Triagem
          </span>
          <span className="border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400">
            {stats.inProduction} Em Produção
          </span>
          <span className="border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-400">
            {stats.rejected} Em Análise (Reprovados)
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="orange-btn flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold"
        >
          <Plus className="size-4" />
          <span>Nova Ordem de Pedido</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="apple-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Aguardando Triagem
            </span>
            <div className="flex size-8 items-center justify-center border border-[#ff6600]/30 bg-[#ff6600]/10 text-primary">
              <Clock className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[#ff6600]">
            {stats.pending}
          </p>
          <span className="text-xs text-muted-foreground">Requer aprovação técnica</span>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Em Produção
            </span>
            <div className="flex size-8 items-center justify-center border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <PrinterIcon className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-400">
            {stats.inProduction}
          </p>
          <span className="text-xs text-muted-foreground">Ordens ativas nas máquinas</span>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Em Análise / Reprovados
            </span>
            <div className="flex size-8 items-center justify-center border border-red-500/30 bg-red-500/10 text-red-400">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-red-400">
            {stats.rejected}
          </p>
          <span className="text-xs text-muted-foreground">Bloqueados para revisão técnica</span>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Valor em Carteira
            </span>
            <div className="flex size-8 items-center justify-center border border-white/10 bg-white/5 text-white">
              <DollarSign className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white">
            {money(stats.totalRevenue, currency)}
          </p>
          <span className="text-xs text-muted-foreground">{stats.total} pedidos registrados</span>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5 border border-white/[0.08] bg-[#12131a]/80 p-1.5 shadow-inner">
          {[
            { id: "all", label: "TODOS", count: stats.total },
            { id: "pending", label: "TRIAGEM PENDENTE", count: stats.pending },
            { id: "in_production", label: "EM PRODUÇÃO", count: stats.inProduction },
            { id: "rejected", label: "EM ANÁLISE / REPROVADOS", count: stats.rejected },
            { id: "completed", label: "CONCLUÍDOS", count: stats.completed },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                  isActive
                    ? "border border-[#ff6600]/80 bg-[#ff6600]/15 text-[#ff6600] shadow-[0_0_15px_rgba(255,102,0,0.2)]"
                    : "border border-transparent text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 text-[10px] font-bold ${
                    isActive ? "bg-[#ff6600] text-black" : "bg-white/10 text-zinc-300"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pedido, cliente ou peça..."
            className="apple-input h-9 pl-9 text-xs"
          />
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="apple-card flex flex-col items-center justify-center p-12 text-center">
          <ShoppingBag className="size-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold text-white">Nenhum pedido encontrado</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            {search
              ? "Nenhum resultado corresponde aos termos da pesquisa."
              : "Cadastre um novo pedido para iniciar a triagem e produção da fábrica."}
          </p>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="orange-btn mt-4 flex items-center gap-2 px-4 py-2 text-xs font-semibold"
          >
            <Plus className="size-3.5" />
            <span>Criar Ordem de Pedido</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {filteredOrders.map((order) => {
            const isPending = order.status === "pending";
            const isRejected = order.status === "rejected";
            const isInProduction = order.status === "in_production" || order.status === "approved";
            const isCompleted = order.status === "completed";

            const assignedPrinter = printers.find((p) => p.id === order.assigned_printer_id);

            return (
              <div
                key={order.id}
                className={`apple-card p-5.5 flex flex-col justify-between transition-all duration-300 border ${
                  isRejected
                    ? "border-red-500/40 bg-red-950/10 shadow-[0_0_25px_-5px_rgba(255,69,58,0.15)]"
                    : isPending
                    ? "border-[#ff6600]/40 bg-[#ff6600]/[0.02] shadow-[0_0_25px_-5px_rgba(255,102,0,0.15)]"
                    : isInProduction
                    ? "border-emerald-500/40 bg-emerald-950/10 shadow-[0_0_25px_-5px_rgba(48,209,88,0.15)]"
                    : "border-white/[0.08]"
                }`}
              >
                {/* Header Row */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3.5 mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-white tracking-wider">
                        {order.order_number}
                      </span>
                      {order.priority === "urgent" ? (
                        <span className="border border-red-500/40 bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                          URGENTE
                        </span>
                      ) : order.priority === "high" ? (
                        <span className="border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                          ALTA PRIORIDADE
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 border border-[#ff6600]/40 bg-[#ff6600]/15 px-2.5 py-0.5 text-xs font-medium text-[#ff6600]">
                          <span className="size-1.5 bg-[#ff6600] animate-ping" />
                          <span>Em Triagem</span>
                        </span>
                      )}
                      {isInProduction && (
                        <span className="inline-flex items-center gap-1.5 border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                          <span className="size-1.5 bg-emerald-400" />
                          <span>Em Produção</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1.5 border border-red-500/40 bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-400">
                          <span className="size-1.5 bg-red-400" />
                          <span>Em Análise (Reprovado)</span>
                        </span>
                      )}
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1.5 border border-zinc-500/40 bg-zinc-500/15 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
                          <Check className="size-3 text-emerald-400" />
                          <span>Concluído</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(order)}
                        className="text-muted-foreground/50 hover:text-red-400 transition-colors p-1"
                        title="Excluir Ordem"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Main Body: Photo + Details */}
                  <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
                    {/* Render / Photo Preview */}
                    <div className="relative aspect-square w-full border border-white/10 bg-black/60 overflow-hidden flex items-center justify-center">
                      {order.image_url ? (
                        <img
                          src={order.image_url}
                          alt={order.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground/60 p-2 text-center">
                          <Box className="size-8 mb-1 text-muted-foreground/40" />
                          <span className="text-[10px] uppercase font-mono">Sem Foto</span>
                        </div>
                      )}
                      <div className="absolute top-1.5 left-1.5 bg-black/80 px-1.5 py-0.5 border border-white/10 text-[9px] font-mono text-zinc-300">
                        {order.quantity} un.
                      </div>
                    </div>

                    {/* Technical Specs */}
                    <div className="space-y-2.5">
                      <div>
                        <h4 className="text-base font-bold text-white tracking-tight leading-tight">
                          {order.title}
                        </h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 font-medium">
                          <User className="size-3 text-primary" />
                          <span className="text-zinc-200">{order.customer_name}</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="border border-white/5 bg-black/40 p-2">
                          <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Dimensões (XYZ)
                          </span>
                          <span className="font-mono text-xs text-white font-medium">
                            {order.dimensions_xyz}
                          </span>
                        </div>

                        <div className="border border-white/5 bg-black/40 p-2">
                          <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Material
                          </span>
                          <span className="font-mono text-xs text-primary font-semibold">
                            {order.material_type}
                          </span>
                        </div>
                      </div>

                      {/* File attachment row */}
                      <div className="flex items-center justify-between border border-white/10 bg-white/[0.03] p-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileCode className="size-4 text-[#ff6600] shrink-0" />
                          <div className="min-w-0">
                            <p className="font-mono text-[11px] font-semibold text-white truncate">
                              {order.file_name || "projeto_3d.stl"}
                            </p>
                            <span className="text-[9px] text-muted-foreground font-mono">
                              {order.file_size || "3.5 MB"}
                            </span>
                          </div>
                        </div>

                        <a
                          href={order.file_url || "#"}
                          onClick={(e) => {
                            if (!order.file_url) {
                              e.preventDefault();
                              toast.info(`Arquivo "${order.file_name}" pronto para o fatiador.`);
                            }
                          }}
                          className="flex items-center gap-1 border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-zinc-300 hover:text-white hover:bg-white/10"
                        >
                          <Download className="size-3" />
                          <span>Baixar</span>
                        </a>
                      </div>

                      {/* Pricing & Time */}
                      <div className="flex items-center justify-between border-t border-white/5 pt-2 text-xs">
                        <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                          {order.weight_grams ? <span>{order.weight_grams}g</span> : null}
                          {order.print_time_hours ? (
                            <span className="flex items-center gap-1">
                              <Clock className="size-3 text-orange-400" />
                              {order.print_time_hours}h
                            </span>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-white font-mono">
                            {money(order.total_price, currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rejection Alert Box */}
                  {isRejected && order.rejection_reason && (
                    <div className="mt-4 border border-red-500/30 bg-red-950/30 p-3 text-xs">
                      <div className="flex items-center gap-2 text-red-400 font-semibold mb-1">
                        <AlertTriangle className="size-4 shrink-0" />
                        <span>Motivo do Bloqueio / Reprovação:</span>
                      </div>
                      <p className="text-red-200/90 text-xs leading-relaxed font-sans">
                        {order.rejection_reason}
                      </p>
                    </div>
                  )}

                  {/* In production machine banner */}
                  {isInProduction && assignedPrinter && (
                    <div className="mt-4 flex items-center justify-between border border-emerald-500/30 bg-emerald-950/20 p-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <PrinterIcon className="size-4 text-emerald-400" />
                        <div>
                          <span className="text-emerald-400 font-semibold">Alocado em: </span>
                          <span className="text-white font-medium">{assignedPrinter.name}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400">Em Fabricação</span>
                    </div>
                  )}
                </div>

                {/* Bottom Action Buttons */}
                <div className="mt-5 border-t border-white/[0.08] pt-3.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {order.due_date ? `Entrega: ${order.due_date}` : "Sem prazo definido"}
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => setRejectOrderModal(order)}
                          className="flex items-center gap-1.5 border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all"
                        >
                          <XCircle className="size-3.5" />
                          <span>Reprovar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setApproveOrderModal(order);
                            setSelectedPrinterId(printers[0]?.id || "");
                          }}
                          className="flex items-center gap-1.5 border border-emerald-500/50 bg-emerald-500/20 px-3.5 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30 transition-all shadow-[0_0_12px_rgba(48,209,88,0.2)]"
                        >
                          <CheckCircle2 className="size-3.5" />
                          <span>Aprovar Pedido</span>
                        </button>
                      </>
                    )}

                    {isRejected && (
                      <button
                        type="button"
                        onClick={() => handleReopen(order)}
                        className="flex items-center gap-1.5 border border-primary/50 bg-primary/20 px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/30 transition-all shadow-[0_0_12px_rgba(255,102,0,0.2)]"
                      >
                        <RotateCcw className="size-3.5" />
                        <span>Reabrir / Reavaliar Pedido</span>
                      </button>
                    )}

                    {isInProduction && (
                      <button
                        type="button"
                        onClick={() => handleComplete(order)}
                        className="flex items-center gap-1.5 border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-all"
                      >
                        <Check className="size-3.5 text-emerald-400" />
                        <span>Marcar como Concluído</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Nova Ordem de Pedido */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl border-white/10 bg-[#0e0f14] text-white p-6 shadow-2xl">
          <DialogHeader className="border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center border border-primary/30 bg-primary/10 text-primary">
                <ShoppingBag className="size-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">
                  Nova Ordem de Pedido
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Anexe o arquivo 3D, medidas, foto de referência ou integre um orçamento.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            {/* Quote Integration Selector */}
            <div className="border border-primary/30 bg-primary/[0.06] p-3">
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Link2 className="size-3.5" />
                  <span>Importar do Módulo de Orçamentos (Opcional)</span>
                </Label>
              </div>
              <Select onValueChange={handleQuoteSelect}>
                <SelectTrigger className="apple-input text-xs h-9 bg-black/60 border-primary/30">
                  <SelectValue placeholder="Selecione um orçamento já calculado para auto-preencher..." />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#16171e] text-xs">
                  <SelectItem value="none">Nenhum (Preenchimento manual)</SelectItem>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.job_name} · {j.customer_name || "Cliente"} ({j.weight_grams}g ·{" "}
                      {money(j.total_price, currency)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Basic Info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nome do Cliente *</Label>
                <Input
                  required
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="Ex: AutoTech Indústria"
                  className="apple-input text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nome / Título da Peça *</Label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Engrenagem Helicoidal v4"
                  className="apple-input text-xs h-9"
                />
              </div>
            </div>

            {/* Dimensions XYZ */}
            <div className="border border-white/5 bg-black/40 p-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                Medidas da Peça (mm)
              </Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-mono">Eixo X (Largura)</span>
                  <Input
                    type="number"
                    value={formData.dim_x}
                    onChange={(e) => setFormData({ ...formData, dim_x: Number(e.target.value) })}
                    className="apple-input text-xs h-8 text-center font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-mono">Eixo Y (Profundidade)</span>
                  <Input
                    type="number"
                    value={formData.dim_y}
                    onChange={(e) => setFormData({ ...formData, dim_y: Number(e.target.value) })}
                    className="apple-input text-xs h-8 text-center font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-mono">Eixo Z (Altura)</span>
                  <Input
                    type="number"
                    value={formData.dim_z}
                    onChange={(e) => setFormData({ ...formData, dim_z: Number(e.target.value) })}
                    className="apple-input text-xs h-8 text-center font-mono"
                  />
                </div>
              </div>
            </div>

            {/* File & Photo Uploads */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* 3D File Upload */}
              <div className="border border-white/10 bg-black/40 p-3 space-y-2">
                <Label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <FileCode className="size-3.5 text-primary" />
                  <span>Arquivo do Projeto 3D</span>
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".stl,.step,.stp,.3mf,.gcode,.obj,.zip"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-white/20 bg-white/5 py-2 text-xs text-zinc-300 hover:border-primary/50 hover:bg-white/10 transition-all"
                >
                  <FileCode className="size-3.5 text-primary" />
                  <span>{formData.file_name ? formData.file_name : "Selecionar .STL, .STEP ou .3MF"}</span>
                </button>
              </div>

              {/* Product Reference Photo */}
              <div className="border border-white/10 bg-black/40 p-3 space-y-2">
                <Label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <ImageIcon className="size-3.5 text-primary" />
                  <span>Foto / Render de Referência</span>
                </Label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-white/20 bg-white/5 py-2 text-xs text-zinc-300 hover:border-primary/50 hover:bg-white/10 transition-all"
                >
                  <ImageIcon className="size-3.5 text-primary" />
                  <span>{formData.image_url ? "Foto carregada (Alterar)" : "Carregar Imagem"}</span>
                </button>
              </div>
            </div>

            {/* Material, Quantity, Pricing & Date */}
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Material</Label>
                <Select
                  value={formData.material_type}
                  onValueChange={(val) => setFormData({ ...formData, material_type: val })}
                >
                  <SelectTrigger className="apple-input text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#16171e] text-xs">
                    <SelectItem value="PLA Premium">PLA Premium</SelectItem>
                    <SelectItem value="PETG Carbono">PETG Carbono</SelectItem>
                    <SelectItem value="ABS Preto">ABS Preto</SelectItem>
                    <SelectItem value="TPU Flexível">TPU Flexível</SelectItem>
                    <SelectItem value="Resina Biocompatível">Resina Biocompatível</SelectItem>
                    <SelectItem value="Nylon CF">Nylon CF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Quantidade</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  className="apple-input text-xs h-9 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Valor Total (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.total_price}
                  onChange={(e) => setFormData({ ...formData, total_price: Number(e.target.value) })}
                  className="apple-input text-xs h-9 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Prioridade</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(val) => setFormData({ ...formData, priority: val as OrderPriority })}
                >
                  <SelectTrigger className="apple-input text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#16171e] text-xs">
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Observações Técnicas / Fatiamento</Label>
              <Textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ex: Orientação Z para maior resistência nas camadas, infill 50% giroide..."
                className="apple-input text-xs"
              />
            </div>

            <DialogFooter className="border-t border-white/10 pt-3 gap-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="orange-btn px-5 py-2 text-xs font-semibold"
              >
                Criar Ordem de Pedido
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Aprovar Pedido para Produção */}
      <Dialog open={!!approveOrderModal} onOpenChange={() => setApproveOrderModal(null)}>
        <DialogContent className="max-w-md border-emerald-500/30 bg-[#0e0f14] text-white p-6 shadow-2xl">
          <DialogHeader className="border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">
                  Aprovar Pedido para Produção
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Vincular impressora sugerida e encaminhar para a fila de fabricação.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {approveOrderModal && (
            <div className="space-y-4 pt-2">
              <div className="border border-white/5 bg-black/40 p-3 text-xs space-y-1">
                <p className="font-bold text-white">{approveOrderModal.title}</p>
                <p className="text-muted-foreground">Cliente: {approveOrderModal.customer_name}</p>
                <p className="font-mono text-emerald-400 font-semibold">
                  {approveOrderModal.dimensions_xyz} · {approveOrderModal.material_type}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Selecionar Impressora Alocada</Label>
                <Select value={selectedPrinterId} onValueChange={setSelectedPrinterId}>
                  <SelectTrigger className="apple-input text-xs h-9">
                    <SelectValue placeholder="Selecione a impressora disponível..." />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#16171e] text-xs">
                    {printers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.model}) — {p.status === "idle" ? "Livre" : p.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="border-t border-white/10 pt-3 gap-2">
                <button
                  type="button"
                  onClick={() => setApproveOrderModal(null)}
                  className="border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmApprove}
                  className="border border-emerald-500/50 bg-emerald-500/20 px-5 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30 transition-all shadow-[0_0_15px_rgba(48,209,88,0.25)]"
                >
                  Confirmar Aprovação
                </button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Reprovar Pedido (Mover para Seção de Análise) */}
      <Dialog open={!!rejectOrderModal} onOpenChange={() => setRejectOrderModal(null)}>
        <DialogContent className="max-w-lg border-red-500/40 bg-[#0e0f14] text-white p-6 shadow-2xl">
          <DialogHeader className="border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center border border-red-500/40 bg-red-500/10 text-red-400">
                <XCircle className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">
                  Reprovar Pedido (Encaminhar para Análise)
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Informe o parecer técnico para bloqueio e reanálise do projeto.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {rejectOrderModal && (
            <div className="space-y-4 pt-2">
              <div className="border border-white/5 bg-black/40 p-3 text-xs space-y-1">
                <p className="font-bold text-white">{rejectOrderModal.title}</p>
                <p className="text-muted-foreground">Cliente: {rejectOrderModal.customer_name}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Motivos Frequentes de Reprovação</Label>
                <Select onValueChange={(val) => setRejectionReason(val)}>
                  <SelectTrigger className="apple-input text-xs h-9">
                    <SelectValue placeholder="Escolha um motivo padrão para preencher rápido..." />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#16171e] text-xs">
                    {REJECTION_PRESETS.map((preset, idx) => (
                      <SelectItem key={idx} value={preset}>
                        {preset}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Parecer Técnico / Detalhamento *</Label>
                <Textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Descreva detalhadamente o erro de geometria, espessura ou inconformidade técnica..."
                  className="apple-input text-xs"
                />
              </div>

              <DialogFooter className="border-t border-white/10 pt-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRejectOrderModal(null)}
                  className="border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmReject}
                  className="border border-red-500/50 bg-red-500/20 px-5 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/30 transition-all shadow-[0_0_15px_rgba(255,69,58,0.25)]"
                >
                  Confirmar Reprovação
                </button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

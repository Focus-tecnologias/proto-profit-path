import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PrinterStatus = "idle" | "printing" | "error";
export type JobStatus = "quote" | "queued" | "printing" | "completed" | "cancelled";

export type Printer = {
  id: string;
  name: string;
  model: string;
  status: PrinterStatus;
  hourly_rate: number;
  kwh_consumption: number;
  created_at: string;
};

export type Filament = {
  id: string;
  material: string;
  brand: string;
  color_hex: string;
  spool_weight_g: number;
  cost_per_kg: number;
  remaining_g: number;
  created_at: string;
};

export type PrintJob = {
  id: string;
  job_name: string;
  customer_name: string;
  filament_id: string | null;
  weight_grams: number;
  print_time_hours: number;
  setup_fee: number;
  material_cost: number;
  energy_cost: number;
  profit_margin: number;
  total_price: number;
  status: JobStatus;
  assigned_printer_id: string | null;
  filament_deducted: boolean;
  created_at: string;
};

export type Partner = {
  id: string;
  partner_name: string;
  share_percentage: number;
  created_at: string;
};

export type FarmSettings = { id: number; kwh_price: number; currency: string };

/* ---------------- pricing engine ---------------- */

export type CostInput = {
  weightGrams: number;
  costPerKg: number;
  printTimeHours: number;
  printerWatts: number;
  kwhPrice: number;
  setupFee: number;
  profitMargin: number; // percentage
};

export function computeCosts(i: CostInput) {
  const materialCost = (i.weightGrams / 1000) * i.costPerKg;
  const energyCost = i.printTimeHours * (i.printerWatts / 1000) * i.kwhPrice;
  const totalCost = materialCost + energyCost + i.setupFee;
  const finalPrice = totalCost * (1 + i.profitMargin / 100);
  return {
    materialCost,
    energyCost,
    totalCost,
    finalPrice,
    profit: finalPrice - totalCost,
  };
}

export function money(v: number, currency = "R$") {
  return `${currency} ${v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ---------------- queries ---------------- */

const table = async <T,>(name: string, order: string): Promise<T[]> => {
  const { data, error } = await (supabase as any)
    .from(name)
    .select("*")
    .order(order, { ascending: true });
  if (error) throw error;
  return (data ?? []) as T[];
};

export const usePrinters = () =>
  useQuery({ queryKey: ["printers"], queryFn: () => table<Printer>("printers", "name") });

export const useFilaments = () =>
  useQuery({
    queryKey: ["filaments"],
    queryFn: () => table<Filament>("filament_inventory", "material"),
  });

export const useJobs = () =>
  useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("print_jobs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PrintJob[];
    },
  });

export const usePartners = () =>
  useQuery({
    queryKey: ["partners"],
    queryFn: () => table<Partner>("partner_splits", "created_at"),
  });

export const useSettings = () =>
  useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farm_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? { id: 1, kwh_price: 0.75, currency: "R$" }) as FarmSettings;
    },
  });

/* ---------------- mutations ---------------- */

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    ["printers", "filaments", "jobs", "partners", "settings"].forEach((k) =>
      qc.invalidateQueries({ queryKey: [k] }),
    );
  };
}

export function useCreateJob() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (job: Partial<PrintJob>) => {
      const { data, error } = await supabase.from("print_jobs").insert(job as any).select().single();
      if (error) throw error;
      return data as PrintJob;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateJob() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PrintJob> }) => {
      const { error } = await supabase.from("print_jobs").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteJob() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("print_jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Marks a job completed and deducts its filament usage from inventory (once). */
export function useCompleteJob() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async ({ job, filament }: { job: PrintJob; filament?: Filament }) => {
      if (filament && !job.filament_deducted) {
        const remaining = Math.max(0, Number(filament.remaining_g) - Number(job.weight_grams));
        const { error: fErr } = await supabase
          .from("filament_inventory")
          .update({ remaining_g: remaining })
          .eq("id", filament.id);
        if (fErr) throw fErr;
      }
      const { error } = await supabase
        .from("print_jobs")
        .update({ status: "completed", filament_deducted: true })
        .eq("id", job.id);
      if (error) throw error;

      if (job.assigned_printer_id) {
        await supabase
          .from("printers")
          .update({ status: "idle" })
          .eq("id", job.assigned_printer_id);
      }
    },
    onSuccess: invalidate,
  });
}

export function useUpdatePrinter() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Printer> }) => {
      const { error } = await supabase.from("printers").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useCreatePrinter() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (p: Partial<Printer>) => {
      const { error } = await supabase.from("printers").insert(p as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useUpsertFilament() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async ({ id, patch }: { id?: string; patch: Partial<Filament> }) => {
      const { error } = id
        ? await supabase.from("filament_inventory").update(patch as any).eq("id", id)
        : await supabase.from("filament_inventory").insert(patch as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteFilament() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("filament_inventory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useUpdatePartner() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async ({ id, share }: { id: string; share: number }) => {
      const { error } = await supabase
        .from("partner_splits")
        .update({ share_percentage: share })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateSettings() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (patch: Partial<FarmSettings>) => {
      const { error } = await supabase.from("farm_settings").update(patch as any).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/* ---------------- produtos (estoque) ---------------- */

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  color_hex: string;
  cost_price: number;
  sale_price: number;
  quantity: number;
  min_quantity: number;
  image_path: string | null;
  created_at: string;
  updated_at: string;
};

export const PRODUCT_PHOTO_BUCKET = "product-photos";

export async function uploadProductPhoto(file: File) {
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(PRODUCT_PHOTO_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (error) throw error;
  return path;
}

export function useProductPhotoUrls(paths: (string | null | undefined)[]) {
  const key = paths.filter(Boolean).sort().join("|");
  return useQuery({
    queryKey: ["product-photo-urls", key],
    queryFn: async () => {
      const list = key ? key.split("|") : [];
      const map: Record<string, string> = {};
      if (!list.length) return map;
      const { data } = await supabase.storage
        .from(PRODUCT_PHOTO_BUCKET)
        .createSignedUrls(list, 60 * 60);
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
      }
      return map;
    },
  });
}

export const useProducts = () =>
  useQuery({ queryKey: ["products"], queryFn: () => table<Product>("products", "name") });

function useInvalidateProducts() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["products"] });
}

export function useUpsertProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: async ({ id, patch }: { id?: string; patch: Partial<Product> }) => {
      const { error } = id
        ? await (supabase as any).from("products").update(patch).eq("id", id)
        : await (supabase as any).from("products").insert(patch);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/* ---------------- operacional ---------------- */

export type Operator = {
  id: string;
  name: string;
  role: string;
  hourly_cost: number;
  active: boolean;
  created_at: string;
};

export type SessionStatus = "running" | "paused" | "completed" | "cancelled";

export type ProductionSession = {
  id: string;
  job_id: string | null;
  printer_id: string | null;
  operator_id: string | null;
  label: string;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  paused_seconds: number;
  paused_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export const useOperators = () =>
  useQuery({ queryKey: ["operators"], queryFn: () => table<Operator>("operators", "name") });

export const useSessions = () =>
  useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("production_sessions")
        .select("*")
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProductionSession[];
    },
  });

/** Segundos efetivos de produção de uma sessão (descontando pausas). */
export function sessionSeconds(s: ProductionSession, now = Date.now()) {
  const start = new Date(s.started_at).getTime();
  const end = s.ended_at
    ? new Date(s.ended_at).getTime()
    : s.status === "paused" && s.paused_at
      ? new Date(s.paused_at).getTime()
      : now;
  return Math.max(0, Math.floor((end - start) / 1000) - Number(s.paused_seconds ?? 0));
}

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function useInvalidateOps() {
  const qc = useQueryClient();
  return () => {
    ["operators", "sessions", "printers", "jobs"].forEach((k) =>
      qc.invalidateQueries({ queryKey: [k] }),
    );
  };
}

export function useUpsertOperator() {
  const invalidate = useInvalidateOps();
  return useMutation({
    mutationFn: async ({ id, patch }: { id?: string; patch: Partial<Operator> }) => {
      const { error } = id
        ? await (supabase as any).from("operators").update(patch).eq("id", id)
        : await (supabase as any).from("operators").insert(patch);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteOperator() {
  const invalidate = useInvalidateOps();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("operators").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useStartSession() {
  const invalidate = useInvalidateOps();
  return useMutation({
    mutationFn: async (input: Partial<ProductionSession>) => {
      const { error } = await (supabase as any).from("production_sessions").insert({
        ...input,
        status: "running",
        started_at: new Date().toISOString(),
      });
      if (error) throw error;
      if (input.printer_id) {
        await (supabase as any)
          .from("printers")
          .update({ status: "printing" })
          .eq("id", input.printer_id);
      }
      if (input.job_id) {
        await (supabase as any)
          .from("print_jobs")
          .update({ status: "printing", assigned_printer_id: input.printer_id ?? null })
          .eq("id", input.job_id);
      }
    },
    onSuccess: invalidate,
  });
}

export function useSessionAction() {
  const invalidate = useInvalidateOps();
  return useMutation({
    mutationFn: async ({
      session,
      action,
    }: {
      session: ProductionSession;
      action: "pause" | "resume" | "finish" | "cancel";
    }) => {
      const now = new Date();
      let patch: Partial<ProductionSession> = {};

      if (action === "pause") {
        patch = { status: "paused", paused_at: now.toISOString() };
      } else if (action === "resume") {
        const extra = session.paused_at
          ? Math.floor((now.getTime() - new Date(session.paused_at).getTime()) / 1000)
          : 0;
        patch = {
          status: "running",
          paused_at: null,
          paused_seconds: Number(session.paused_seconds ?? 0) + extra,
        };
      } else {
        const extra =
          session.status === "paused" && session.paused_at
            ? Math.floor((now.getTime() - new Date(session.paused_at).getTime()) / 1000)
            : 0;
        patch = {
          status: action === "finish" ? "completed" : "cancelled",
          ended_at: now.toISOString(),
          paused_at: null,
          paused_seconds: Number(session.paused_seconds ?? 0) + extra,
        };
      }

      const { error } = await (supabase as any)
        .from("production_sessions")
        .update(patch)
        .eq("id", session.id);
      if (error) throw error;

      if (action === "finish" || action === "cancel") {
        if (session.printer_id) {
          await (supabase as any)
            .from("printers")
            .update({ status: "idle" })
            .eq("id", session.printer_id);
        }
        if (session.job_id && action === "finish") {
          await (supabase as any)
            .from("print_jobs")
            .update({ status: "completed" })
            .eq("id", session.job_id);
        }
      }
    },
    onSuccess: invalidate,
  });
}

export function useDeleteSession() {
  const invalidate = useInvalidateOps();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("production_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/* ---------------- Orders / Ordens de Pedidos ---------------- */

export type OrderStatus = "pending" | "approved" | "rejected" | "in_production" | "completed";
export type OrderPriority = "low" | "normal" | "high" | "urgent";

export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  title: string;
  dimensions_xyz: string;
  dim_x?: number | undefined;
  dim_y?: number | undefined;
  dim_z?: number | undefined;
  file_name?: string | undefined;
  file_size?: string | undefined;
  file_url?: string | undefined;
  image_url?: string | undefined;
  quote_id?: string | null | undefined;
  material_type: string;
  quantity: number;
  weight_grams?: number | undefined;
  print_time_hours?: number | undefined;
  total_price: number;
  due_date?: string | undefined;
  priority: OrderPriority;
  status: OrderStatus;
  rejection_reason?: string | undefined;
  assigned_printer_id?: string | null | undefined;
  assigned_operator_id?: string | null | undefined;
  notes?: string | undefined;
  created_at: string;
};

const INITIAL_ORDERS: Order[] = [
  {
    id: "ord-001",
    order_number: "ORD-2026-001",
    customer_name: "AutoTech Componentes Industriais",
    title: "Conjunto de Engrenagens Helicoidais",
    dimensions_xyz: "85 x 85 x 42 mm",
    dim_x: 85,
    dim_y: 85,
    dim_z: 42,
    file_name: "engrenagem_helical_v4.step",
    file_size: "4.8 MB",
    image_url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
    material_type: "PETG Carbono",
    quantity: 6,
    weight_grams: 340,
    print_time_hours: 14.5,
    total_price: 520.0,
    due_date: "2026-09-18",
    priority: "high",
    status: "in_production",
    assigned_printer_id: "p-bambu-x1",
    notes: "Tolerância mecânica precisa (0.15mm). Preenchimento 60% giroide.",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "ord-002",
    order_number: "ORD-2026-002",
    customer_name: "Soluções IoT & Embarcados",
    title: "Case de Proteção Industrial Raspberry Pi 5",
    dimensions_xyz: "98 x 68 x 34 mm",
    dim_x: 98,
    dim_y: 68,
    dim_z: 34,
    file_name: "case_rpi5_focus_pro.stl",
    file_size: "12.2 MB",
    image_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
    material_type: "ABS Preto",
    quantity: 15,
    weight_grams: 680,
    print_time_hours: 22.0,
    total_price: 890.0,
    due_date: "2026-09-22",
    priority: "normal",
    status: "pending",
    notes: "Aguardando validação dos furos de ventilação lateral para aprovação.",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "ord-003",
    order_number: "ORD-2026-003",
    customer_name: "Lab Robótica & Automação USP",
    title: "Segmento de Braço Articulado para Atuador",
    dimensions_xyz: "240 x 185 x 190 mm",
    dim_x: 240,
    dim_y: 185,
    dim_z: 190,
    file_name: "arm_segment_a_v2.stl",
    file_size: "34.6 MB",
    image_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=80",
    material_type: "TPU Flexível",
    quantity: 2,
    weight_grams: 450,
    print_time_hours: 18.0,
    total_price: 460.0,
    due_date: "2026-09-15",
    priority: "urgent",
    status: "rejected",
    rejection_reason: "Inviabilidade técnica: espessura de parede inferior a 0.8mm no suporte do flange e material TPU não possui rigidez torsional suficiente para o torque solicitado. Requer reforço da malha e troca por PLA Tough ou Nylon.",
    notes: "Revisão pendente com o engenheiro responsável.",
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "ord-004",
    order_number: "ORD-2026-004",
    customer_name: "Dra. Marina Santos Odontologia",
    title: "Guias Cirúrgicos de Implante Guiado",
    dimensions_xyz: "60 x 55 x 28 mm",
    dim_x: 60,
    dim_y: 55,
    dim_z: 28,
    file_name: "guia_cirurgica_mandibular.3mf",
    file_size: "8.4 MB",
    image_url: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80",
    material_type: "Resina Biocompatível",
    quantity: 4,
    weight_grams: 95,
    print_time_hours: 6.0,
    total_price: 640.0,
    due_date: "2026-09-14",
    priority: "urgent",
    status: "completed",
    notes: "Concluído e esterilizado para entrega.",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

const ORDERS_STORAGE_KEY = "focus_lab_orders_v1";

function getLocalOrders(): Order[] {
  if (typeof window === "undefined") return INITIAL_ORDERS;
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_ORDERS;
  }
}

function setLocalOrders(orders: Order[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch {}
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async (): Promise<Order[]> => {
      try {
        const { data, error } = await (supabase as any)
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
        if (error || !data || data.length === 0) {
          return getLocalOrders();
        }
        return data as Order[];
      } catch {
        return getLocalOrders();
      }
    },
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderInput: Partial<Order>) => {
      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        order_number: `ORD-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`,
        customer_name: orderInput.customer_name || "Cliente sem nome",
        title: orderInput.title || "Novo Pedido de Impressão",
        dimensions_xyz: orderInput.dimensions_xyz || `${orderInput.dim_x || 50} x ${orderInput.dim_y || 50} x ${orderInput.dim_z || 50} mm`,
        dim_x: orderInput.dim_x,
        dim_y: orderInput.dim_y,
        dim_z: orderInput.dim_z,
        file_name: orderInput.file_name || "projeto_3d.stl",
        file_size: orderInput.file_size || "5.0 MB",
        file_url: orderInput.file_url,
        image_url: orderInput.image_url || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
        quote_id: orderInput.quote_id || null,
        material_type: orderInput.material_type || "PLA Premium",
        quantity: Number(orderInput.quantity || 1),
        weight_grams: orderInput.weight_grams ? Number(orderInput.weight_grams) : undefined,
        print_time_hours: orderInput.print_time_hours ? Number(orderInput.print_time_hours) : undefined,
        total_price: Number(orderInput.total_price || 0),
        due_date: orderInput.due_date,
        priority: orderInput.priority || "normal",
        status: "pending",
        notes: orderInput.notes || "",
        created_at: new Date().toISOString(),
      };

      try {
        await (supabase as any).from("orders").insert(newOrder);
      } catch {}

      const current = getLocalOrders();
      setLocalOrders([newOrder, ...current]);
      return newOrder;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      rejection_reason,
      assigned_printer_id,
    }: {
      id: string;
      status: OrderStatus;
      rejection_reason?: string;
      assigned_printer_id?: string | null;
    }) => {
      try {
        await (supabase as any)
          .from("orders")
          .update({
            status,
            rejection_reason: rejection_reason || null,
            assigned_printer_id: assigned_printer_id || null,
          })
          .eq("id", id);
      } catch {}

      const current = getLocalOrders();
      const updated = current.map((o) =>
        o.id === id
          ? {
              ...o,
              status,
              rejection_reason: rejection_reason !== undefined ? rejection_reason : o.rejection_reason,
              assigned_printer_id: assigned_printer_id !== undefined ? assigned_printer_id : o.assigned_printer_id,
            }
          : o
      );
      setLocalOrders(updated);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["printers"] });
    },
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await (supabase as any).from("orders").delete().eq("id", id);
      } catch {}

      const current = getLocalOrders();
      setLocalOrders(current.filter((o) => o.id !== id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}


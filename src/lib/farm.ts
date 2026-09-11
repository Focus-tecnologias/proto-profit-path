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

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
